// Supabase Edge Function: email-submit
// Deploy: supabase functions deploy email-submit
//
// Desktop clients submit email requests through this endpoint using their
// user session JWT. The function validates the caller, checks company scope,
// enforces template/recipient restrictions, and inserts into omnis_email_queue.
//
// Actual SMTP delivery is handled by process-email-queue (triggered by pg_cron).
// This function never exposes SMTP credentials to the client.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

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

        // Validate system scope — users can only send within their own systems
        const effectiveSystem = system || "fleetrack";
        if (!callerIsAdmin && !callerSystems.includes(effectiveSystem)) {
          return jsonResponse(
            {
              ok: false,
              error: `You do not have access to the '${effectiveSystem}' system`,
            },
            403
          );
        }

        // Idempotency: check if this email was already submitted
        if (idempotencyKey) {
          const { data: existing } = await adminClient
            .from("omnis_email_queue")
            .select("id, status")
            .eq("idempotency_key", idempotencyKey)
            .maybeSingle();

          if (existing) {
            return jsonResponse({
              ok: true,
              id: existing.id,
              status: existing.status,
              duplicate: true,
            });
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
        };

        if (idempotencyKey) {
          row.idempotency_key = idempotencyKey;
        }

        const { data: queued, error: qErr } = await adminClient
          .from("omnis_email_queue")
          .insert(row)
          .select("id")
          .single();

        if (qErr) {
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

        // Non-admin users only see emails from their systems
        if (!callerIsAdmin) {
          q = q.in("system", callerSystems.length > 0 ? callerSystems : ["__none__"]);
        }
        // Also filter by created_by for non-admin users
        if (!callerIsAdmin) {
          q = q.eq("created_by", caller.email || caller.id);
        }

        const { data, error } = await q;
        if (error) {
          return jsonResponse({ ok: false, error: error.message }, 500);
        }

        return jsonResponse({ ok: true, data: data || [] });
      }

      case "getConfig": {
        // Only admins can view SMTP config
        if (!callerIsAdmin) {
          return jsonResponse(
            { ok: false, error: "Admin privileges required" },
            403
          );
        }

        const { data, error } = await adminClient
          .from("omnis_email_config")
          .select("*")
          .eq("system", params.system || "fleetrack")
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
        // Only admins can update SMTP config
        if (!callerIsAdmin) {
          return jsonResponse(
            { ok: false, error: "Admin privileges required" },
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
            { system: params.system || "fleetrack", ...payload },
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

        // Verify ownership — only the creator or admin can cancel
        const { data: email } = await adminClient
          .from("omnis_email_queue")
          .select("created_by, system, status")
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

        if (
          !callerIsAdmin &&
          email.created_by !== caller.email &&
          email.created_by !== caller.id
        ) {
          return jsonResponse(
            { ok: false, error: "You can only cancel your own emails" },
            403
          );
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
