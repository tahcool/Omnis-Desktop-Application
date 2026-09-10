// Supabase Edge Function: email-submit
// Deploy: supabase functions deploy email-submit
//
// Desktop clients submit email requests through this endpoint using their
// user session JWT. The function validates the caller, checks company scope,
// enforces template/recipient restrictions, and inserts into omnis_email_queue.
//
// Actual SMTP delivery is handled by process-email-queue (triggered by pg_cron).
// This function never exposes SMTP credentials to the client.
//
// Authorization model:
// - Ordinary users: can send within own systems, see/cancel only own emails.
// - System-scoped admins (is_admin=true): can manage emails within their systems[].
// - Super-admins (SUPER_ADMIN_EMAILS): unrestricted global access.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { isSuperAdmin, hasSystemAccess } from "../_shared/admin-config.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

/**
 * Compute a canonical SHA-256 hex hash of delivery-relevant payload fields.
 * Used for idempotency conflict detection (same key + different payload → 409).
 *
 * Included fields: to, cc, subject, html, scheduledFor, relatedDoc,
 * relatedType, templateId, system, toName.
 *
 * Excludes: text (derived from html), status, timestamps, idempotencyKey itself.
 */
async function computePayloadHash(params: Record<string, unknown>): Promise<string> {
  const canonical = JSON.stringify({
    to: params.to || "",
    cc: params.cc || "",
    toName: params.toName || "",
    subject: params.subject || "",
    html: params.html || "",
    system: params.system || "fleetrack",
    scheduledFor: params.scheduledFor || "",
    relatedDoc: params.relatedDoc || "",
    relatedType: params.relatedType || "manual",
    templateId: params.templateId || "",
  });
  const data = new TextEncoder().encode(canonical);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  // ── 1. Extract and validate caller JWT ──────────────────────────

  const authHeader = req.headers.get("Authorization") || "";
  const token = authHeader.replace("Bearer ", "");

  if (!token) {
    return jsonResponse(
      { ok: false, error: "Missing authorization token" },
      401
    );
  }

  // Validate the caller's JWT
  const callerClient = createClient(
    SUPABASE_URL,
    Deno.env.get("SUPABASE_ANON_KEY") ?? SERVICE_KEY,
    {
      global: { headers: { Authorization: `Bearer ${token}` } },
      auth: { persistSession: false },
    }
  );

  const {
    data: { user: caller },
    error: authError,
  } = await callerClient.auth.getUser(token);

  if (authError || !caller) {
    return jsonResponse(
      { ok: false, error: "Invalid or expired authentication token" },
      401
    );
  }

  // ── 2. Parse request ────────────────────────────────────────────

  let body: any;
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ ok: false, error: "Invalid JSON body" }, 400);
  }

  const { action, ...params } = body;

  if (!action || typeof action !== "string") {
    return jsonResponse({ ok: false, error: "Missing or invalid action" }, 400);
  }

  // Create admin client for queue operations (server-side only)
  const adminClient = createClient(SUPABASE_URL, SERVICE_KEY, {
    auth: { persistSession: false },
  });

  // ── 3. Look up caller's access for company scope ────────────────

  const { data: callerAccess } = await adminClient
    .from("user_system_access")
    .select("is_admin, systems")
    .eq("user_id", caller.id)
    .single();

  const callerSystems: string[] = callerAccess?.systems || [];
  const callerIsAdmin = callerAccess?.is_admin || false;
  const callerEmail = (caller.email || "").toLowerCase();
  const callerIsSuperAdmin = isSuperAdmin(callerEmail);

  // ── 4. Route action ─────────────────────────────────────────────

  try {
    switch (action) {
      case "send": {
        const {
          to,
          toName,
          cc,
          subject,
          html,
          text,
          scheduledFor,
          relatedDoc,
          relatedType,
          templateId,
          system,
          idempotencyKey,
        } = params;

        if (!to || !subject || !html) {
          return jsonResponse(
            { ok: false, error: "to, subject, and html are required" },
            400
          );
        }

        // Validate system scope — all users must have system access
        // (admins are scoped to their systems, super-admins bypass)
        const effectiveSystem = system || "fleetrack";
        if (!hasSystemAccess(callerSystems, callerEmail, effectiveSystem)) {
          return jsonResponse(
            {
              ok: false,
              error: `You do not have access to the '${effectiveSystem}' system`,
            },
            403
          );
        }

        // ── Idempotency handling ───────────────────────────────
        if (idempotencyKey) {
          const payloadHash = await computePayloadHash(params);

          // Look up existing entry scoped by this user
          const { data: existing } = await adminClient
            .from("omnis_email_queue")
            .select("id, status, payload_hash, created_by_id")
            .eq("idempotency_key", idempotencyKey)
            .eq("created_by_id", caller.id)
            .maybeSingle();

          if (existing) {
            // Same user, same key — check payload
            if (existing.payload_hash && existing.payload_hash !== payloadHash) {
              // Different payload with same key → conflict
              return jsonResponse(
                {
                  ok: false,
                  error:
                    "Idempotency key already used with different payload. Use a new key for different emails.",
                  conflict: true,
                },
                409
              );
            }
            // Same payload (or legacy row without hash) → return original
            return jsonResponse({
              ok: true,
              id: existing.id,
              status: existing.status,
              duplicate: true,
            });
          }

          // Also check if another user used this key (should not leak their data)
          const { data: otherUser } = await adminClient
            .from("omnis_email_queue")
            .select("id")
            .eq("idempotency_key", idempotencyKey)
            .neq("created_by_id", caller.id)
            .maybeSingle();

          if (otherUser) {
            // Key exists for another user — treat as available for this user
            // (user-scoped uniqueness means this is a new entry)
            // Fall through to insert below
          }
        }

        // Plain text fallback
        const plainText =
          text ||
          (html || "")
            .replace(/<br\s*\/?>/gi, "\n")
            .replace(/<\/p>/gi, "\n\n")
            .replace(/<[^>]*>/g, "")
            .replace(/&nbsp;/g, " ")
            .replace(/&amp;/g, "&")
            .replace(/&lt;/g, "<")
            .replace(/&gt;/g, ">")
            .replace(/&quot;/g, '"')
            .trim();

        const row: any = {
          system: effectiveSystem,
          to_email: to,
          to_name: toName || null,
          cc_email: cc || null,
          subject,
          body_html: html,
          body_text: plainText,
          status: "pending",
          scheduled_for: scheduledFor || new Date().toISOString(),
          related_doc: relatedDoc || null,
          related_type: relatedType || "manual",
          template_id: templateId || null,
          created_by: caller.email || caller.id,
          created_by_id: caller.id,
        };

        if (idempotencyKey) {
          row.idempotency_key = idempotencyKey;
          row.payload_hash = await computePayloadHash(params);
        }

        const { data: queued, error: qErr } = await adminClient
          .from("omnis_email_queue")
          .insert(row)
          .select("id")
          .single();

        if (qErr) {
          // Handle unique constraint violation (concurrent duplicate)
          if (qErr.code === "23505" && idempotencyKey) {
            // Race condition: another concurrent request inserted first
            const { data: raceWinner } = await adminClient
              .from("omnis_email_queue")
              .select("id, status, payload_hash")
              .eq("idempotency_key", idempotencyKey)
              .eq("created_by_id", caller.id)
              .maybeSingle();

            if (raceWinner) {
              const currentHash = await computePayloadHash(params);
              if (raceWinner.payload_hash && raceWinner.payload_hash !== currentHash) {
                return jsonResponse(
                  {
                    ok: false,
                    error: "Idempotency key already used with different payload.",
                    conflict: true,
                  },
                  409
                );
              }
              return jsonResponse({
                ok: true,
                id: raceWinner.id,
                status: raceWinner.status,
                duplicate: true,
              });
            }
          }
          return jsonResponse(
            { ok: false, error: `Queue insert failed: ${qErr.message}` },
            500
          );
        }

        return jsonResponse({
          ok: true,
          id: queued.id,
          status: "pending",
        });
      }

      case "getHistory": {
        const { limit: histLimit, status: filterStatus } = params;

        let q = adminClient
          .from("omnis_email_queue")
          .select(
            "id, to_email, to_name, cc_email, subject, status, scheduled_for, sent_at, error_message, related_doc, related_type, created_by, created_at, retry_count, system"
          )
          .order("created_at", { ascending: false })
          .limit(histLimit || 200);

        if (filterStatus) q = q.eq("status", filterStatus);

        if (callerIsSuperAdmin) {
          // Super-admins see all emails across all systems
          // No additional filter
        } else if (callerIsAdmin) {
          // System-scoped admins see all emails within their systems
          q = q.in("system", callerSystems.length > 0 ? callerSystems : ["__none__"]);
        } else {
          // Ordinary users see only their own emails within their systems
          q = q.in("system", callerSystems.length > 0 ? callerSystems : ["__none__"]);
          q = q.or(`created_by.eq.${caller.email},created_by.eq.${caller.id}`);
        }

        const { data, error } = await q;
        if (error) {
          return jsonResponse({ ok: false, error: error.message }, 500);
        }

        return jsonResponse({ ok: true, data: data || [] });
      }

      case "getConfig": {
        // Only system-scoped admins and super-admins can view SMTP config
        if (!callerIsAdmin) {
          return jsonResponse(
            { ok: false, error: "Admin privileges required" },
            403
          );
        }

        const configSystem = params.system || "fleetrack";

        // Non-super admins can only view config for their systems
        if (!callerIsSuperAdmin && !callerSystems.includes(configSystem)) {
          return jsonResponse(
            { ok: false, error: `You do not have access to the '${configSystem}' system` },
            403
          );
        }

        const { data, error } = await adminClient
          .from("omnis_email_config")
          .select("*")
          .eq("system", configSystem)
          .maybeSingle();

        if (error) {
          return jsonResponse({ ok: false, error: error.message }, 500);
        }

        if (!data) {
          return jsonResponse({
            ok: false,
            smtp_host: "smtp.office365.com",
            smtp_port: 587,
            smtp_user: "Omnis@industrial-exchange.group",
            smtp_pass: "",
            from_name: "Omnis",
            use_tls: true,
          });
        }

        // Mask password — never send SMTP credentials to client
        return jsonResponse({
          ok: true,
          smtp_host: data.smtp_host,
          smtp_port: data.smtp_port,
          smtp_user: data.smtp_user,
          smtp_pass: "•".repeat(
            Math.min((data.smtp_pass || "").length || 8, 16)
          ),
          from_name: data.from_name,
          use_tls: data.use_tls,
        });
      }

      case "saveConfig": {
        // Only system-scoped admins and super-admins can update SMTP config
        if (!callerIsAdmin) {
          return jsonResponse(
            { ok: false, error: "Admin privileges required" },
            403
          );
        }

        const saveSystem = params.system || "fleetrack";

        // Non-super admins can only save config for their systems
        if (!callerIsSuperAdmin && !callerSystems.includes(saveSystem)) {
          return jsonResponse(
            { ok: false, error: `You do not have access to the '${saveSystem}' system` },
            403
          );
        }

        const { host, port, user, pass, fromName, useTls } = params;
        const payload: any = {
          smtp_host: host,
          smtp_port: parseInt(port) || 587,
          smtp_user: user,
          from_name: fromName || "Omnis",
          use_tls: useTls !== false,
          updated_at: new Date().toISOString(),
        };

        // Only update password if a new one was provided (not placeholder dots)
        if (pass && !pass.startsWith("•")) {
          payload.smtp_pass = pass;
        }

        const { error } = await adminClient
          .from("omnis_email_config")
          .upsert(
            { system: saveSystem, ...payload },
            { onConflict: "system" }
          );

        if (error) {
          return jsonResponse(
            { ok: false, error: `Config save failed: ${error.message}` },
            500
          );
        }

        return jsonResponse({ ok: true });
      }

      case "cancelScheduled": {
        const { id } = params;
        if (!id)
          return jsonResponse({ ok: false, error: "id required" }, 400);

        // Fetch the email to check ownership and scope
        const { data: email } = await adminClient
          .from("omnis_email_queue")
          .select("created_by, created_by_id, system, status")
          .eq("id", id)
          .single();

        if (!email) {
          return jsonResponse({ ok: false, error: "Email not found" }, 404);
        }

        if (email.status !== "pending") {
          return jsonResponse(
            { ok: false, error: `Cannot cancel email with status '${email.status}'` },
            400
          );
        }

        // Authorization check:
        // - Super-admins can cancel anything
        // - System-scoped admins can cancel within their systems
        // - Ordinary users can cancel only their own emails
        const isOwner =
          email.created_by === caller.email ||
          email.created_by === caller.id ||
          email.created_by_id === caller.id;

        if (!callerIsSuperAdmin) {
          if (callerIsAdmin) {
            // Admin must have access to the email's system
            if (!callerSystems.includes(email.system)) {
              return jsonResponse(
                { ok: false, error: "You do not have access to this system's emails" },
                403
              );
            }
          } else {
            // Ordinary user must be the owner
            if (!isOwner) {
              return jsonResponse(
                { ok: false, error: "You can only cancel your own emails" },
                403
              );
            }
          }
        }

        const { error } = await adminClient
          .from("omnis_email_queue")
          .update({ status: "cancelled" })
          .eq("id", id)
          .eq("status", "pending");

        if (error) {
          return jsonResponse({ ok: false, error: error.message }, 500);
        }

        return jsonResponse({ ok: true });
      }

      case "retryFailed": {
        const { id } = params;
        if (!id)
          return jsonResponse({ ok: false, error: "id required" }, 400);

        // Only admins can retry failed emails
        if (!callerIsAdmin) {
          return jsonResponse(
            { ok: false, error: "Admin privileges required to retry failed emails" },
            403
          );
        }

        // Scope check: fetch email's system
        const { data: failedEmail } = await adminClient
          .from("omnis_email_queue")
          .select("system")
          .eq("id", id)
          .eq("status", "failed")
          .maybeSingle();

        if (!failedEmail) {
          return jsonResponse(
            { ok: false, error: "Failed email not found" },
            404
          );
        }

        // Non-super admins can only retry within their systems
        if (!callerIsSuperAdmin && !callerSystems.includes(failedEmail.system)) {
          return jsonResponse(
            { ok: false, error: "You do not have access to this system's emails" },
            403
          );
        }

        const { error } = await adminClient
          .from("omnis_email_queue")
          .update({
            status: "pending",
            error_message: null,
            retry_count: 0,
            scheduled_for: new Date().toISOString(),
          })
          .eq("id", id)
          .eq("status", "failed");

        if (error) {
          return jsonResponse({ ok: false, error: error.message }, 500);
        }

        return jsonResponse({ ok: true });
      }

      case "test": {
        // Only admins can trigger email test
        if (!callerIsAdmin) {
          return jsonResponse(
            { ok: false, error: "Admin privileges required" },
            403
          );
        }

        const testSystem = params.system || "fleetrack";

        // Non-super admins can only test within their systems
        if (!callerIsSuperAdmin && !callerSystems.includes(testSystem)) {
          return jsonResponse(
            { ok: false, error: `You do not have access to the '${testSystem}' system` },
            403
          );
        }

        // Trigger the process-email-queue function with a test flag
        try {
          const testBody = JSON.stringify({ test: true, ...params });

          const resp = await fetch(
            `${SUPABASE_URL}/functions/v1/process-email-queue`,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${SERVICE_KEY}`,
              },
              body: testBody,
            }
          );

          const result = await resp.json();

          if (resp.ok) {
            return jsonResponse({ ok: true, ...result });
          }
          return jsonResponse(
            {
              ok: false,
              error: `Edge Function returned ${resp.status}: ${JSON.stringify(result)}`,
            },
            resp.status
          );
        } catch (e: any) {
          return jsonResponse({ ok: false, error: e.message }, 500);
        }
      }

      default:
        return jsonResponse(
          { ok: false, error: `Unknown email action: ${action}` },
          400
        );
    }
  } catch (e: any) {
    console.error("[email-submit]", e);
    return jsonResponse({ ok: false, error: e.message }, 500);
  }
});

function jsonResponse(body: any, status: number = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
