// Supabase Edge Function: admin-operations
// Deploy: supabase functions deploy admin-operations
//
// All admin operations are routed through this function.
// The caller's JWT is validated, their identity extracted,
// and authorization checked against user_system_access.
//
// No privileged credentials leave this function.
// No request-supplied admin flags are trusted.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// Super-admin emails — these accounts cannot be deleted, suspended, or demoted.
// This is a server-side enforcement, not a client-side hint.
const SUPER_ADMIN_EMAILS = [
  "takunda@industrial-exchange.group",
  "zaranyika.rt@gmail.com",
];

// Actions explicitly deferred — return clear error, not silent failure
const DEFERRED_ACTIONS = new Set([
  "setPassword",
  "setPasswordDirect",
  "setPasswordByEmail",
  "impersonate",
]);

// Actions that require admin authorization
const ADMIN_ACTIONS = new Set([
  "listUsers",
  "getUsers",
  "createUser",
  "suspendUser",
  "unsuspendUser",
  "deleteUser",
  "makeAdmin",
  "removeAdmin",
  "resetPassword",
  "inviteUser",
  "updateUserAccess",
]);

interface AuditEntry {
  actor_id: string;
  actor_email: string;
  action: string;
  target_id?: string;
  target_email?: string;
  result: "success" | "denied" | "error";
  detail?: string;
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

  // Create a client with the caller's JWT to identify them
  const callerClient = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY") ?? SERVICE_KEY, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false },
  });

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

  // ── 3. Reject deferred actions ──────────────────────────────────

  if (DEFERRED_ACTIONS.has(action)) {
    return jsonResponse(
      {
        ok: false,
        error: `Action '${action}' has been deferred. Direct password setting and impersonation require additional safeguards and are not available in this version. Use password reset via email instead.`,
        deferred: true,
      },
      403
    );
  }

  // ── 4. Reject unknown actions ───────────────────────────────────

  if (!ADMIN_ACTIONS.has(action)) {
    return jsonResponse(
      { ok: false, error: `Unknown action: ${action}` },
      400
    );
  }

  // ── 5. Check caller authorization ───────────────────────────────
  // Create admin client for privileged operations (server-side only)
  const adminClient = createClient(SUPABASE_URL, SERVICE_KEY, {
    auth: { persistSession: false },
  });

  // Look up caller's access from authoritative table (not from request)
  const { data: callerAccess, error: accessError } = await adminClient
    .from("user_system_access")
    .select("is_admin, systems")
    .eq("user_id", caller.id)
    .single();

  if (accessError || !callerAccess) {
    await audit(adminClient, {
      actor_id: caller.id,
      actor_email: caller.email || "",
      action,
      result: "denied",
      detail: "No access record found for caller",
    });
    return jsonResponse(
      { ok: false, error: "Access denied: no access record" },
      403
    );
  }

  if (!callerAccess.is_admin) {
    await audit(adminClient, {
      actor_id: caller.id,
      actor_email: caller.email || "",
      action,
      result: "denied",
      detail: "Caller is not an admin",
    });
    return jsonResponse(
      { ok: false, error: "Access denied: admin privileges required" },
      403
    );
  }

  // ── 6. Execute action ───────────────────────────────────────────

  try {
    const result = await executeAction(
      adminClient,
      caller,
      callerAccess,
      action,
      params
    );
    return jsonResponse(result.body, result.status);
  } catch (e: any) {
    await audit(adminClient, {
      actor_id: caller.id,
      actor_email: caller.email || "",
      action,
      result: "error",
      detail: e.message,
    });
    return jsonResponse({ ok: false, error: e.message }, 500);
  }
});

// ── Action Execution ──────────────────────────────────────────────

async function executeAction(
  admin: any,
  caller: any,
  callerAccess: any,
  action: string,
  params: any
): Promise<{ body: any; status: number }> {
  const callerEmail = (caller.email || "").toLowerCase();
  const callerId = caller.id;

  switch (action) {
    // ── List/Get Users ─────────────────────────────────────────
    case "listUsers":
    case "getUsers": {
      const {
        data: authData,
        error,
      } = await admin.auth.admin.listUsers({ perPage: 1000 });
      if (error) throw new Error(error.message);

      const { data: accessData } = await admin
        .from("user_system_access")
        .select("*");

      // Scope: admin sees users who share at least one system
      const callerSystems: string[] = callerAccess.systems || [];
      const isSuperAdmin = SUPER_ADMIN_EMAILS.includes(callerEmail);

      const users = (authData.users || [])
        .map((u: any) => {
          const access = (accessData || []).find(
            (a: any) => a.user_id === u.id
          ) || { is_admin: false, systems: [] };
          return {
            id: u.id,
            email: u.email,
            is_admin: access.is_admin,
            systems: access.systems || [],
            created_at: u.created_at,
            banned_until: u.banned_until,
          };
        })
        .filter((u: any) => {
          // Super-admins see everyone
          if (isSuperAdmin) return true;
          // Regular admins see users with overlapping systems
          const userSystems: string[] = u.systems || [];
          return (
            userSystems.length === 0 ||
            userSystems.some((s: string) => callerSystems.includes(s))
          );
        });

      await audit(admin, {
        actor_id: callerId,
        actor_email: callerEmail,
        action,
        result: "success",
        detail: `Listed ${users.length} users`,
      });

      return { body: { ok: true, users }, status: 200 };
    }

    // ── Create User ───────────────────────────────────────────
    case "createUser": {
      const { email, password, systems } = params;
      if (!email || !password)
        return {
          body: { ok: false, error: "email and password required" },
          status: 400,
        };

      // Admin can only create users within their own system scope
      const requestedSystems: string[] = systems || [];
      const callerSystems: string[] = callerAccess.systems || [];
      const isSuperAdmin = SUPER_ADMIN_EMAILS.includes(callerEmail);

      if (!isSuperAdmin) {
        const unauthorized = requestedSystems.filter(
          (s: string) => !callerSystems.includes(s)
        );
        if (unauthorized.length > 0) {
          await audit(admin, {
            actor_id: callerId,
            actor_email: callerEmail,
            action,
            target_email: email,
            result: "denied",
            detail: `Cannot grant systems beyond own scope: ${unauthorized.join(", ")}`,
          });
          return {
            body: {
              ok: false,
              error: `Cannot grant access to systems you do not have: ${unauthorized.join(", ")}`,
            },
            status: 403,
          };
        }
      }

      const { data: authData, error: authError } =
        await admin.auth.admin.createUser({
          email,
          password,
          email_confirm: true,
        });
      if (authError) throw new Error(authError.message);

      // The trigger creates a default access row; update it with requested systems
      if (requestedSystems.length > 0) {
        await admin
          .from("user_system_access")
          .upsert(
            {
              user_id: authData.user.id,
              is_admin: false, // New users are never admins — use makeAdmin separately
              systems: requestedSystems,
            },
            { onConflict: "user_id" }
          );
      }

      await audit(admin, {
        actor_id: callerId,
        actor_email: callerEmail,
        action,
        target_id: authData.user.id,
        target_email: email,
        result: "success",
        detail: `Created with systems: ${requestedSystems.join(", ") || "none"}`,
      });

      return {
        body: { ok: true, user: { id: authData.user.id, email } },
        status: 200,
      };
    }

    // ── Suspend User ──────────────────────────────────────────
    case "suspendUser": {
      const { userId } = params;
      if (!userId)
        return {
          body: { ok: false, error: "userId required" },
          status: 400,
        };

      const targetEmail = await getTargetEmail(admin, userId);
      if (SUPER_ADMIN_EMAILS.includes(targetEmail)) {
        await audit(admin, {
          actor_id: callerId,
          actor_email: callerEmail,
          action,
          target_id: userId,
          target_email: targetEmail,
          result: "denied",
          detail: "Cannot suspend super-admin",
        });
        return {
          body: { ok: false, error: "Cannot suspend the super-admin account." },
          status: 403,
        };
      }

      // Verify company scope
      const scopeCheck = await checkCompanyScope(
        admin,
        callerAccess,
        callerEmail,
        userId
      );
      if (!scopeCheck.ok) {
        await audit(admin, {
          actor_id: callerId,
          actor_email: callerEmail,
          action,
          target_id: userId,
          result: "denied",
          detail: scopeCheck.reason,
        });
        return {
          body: { ok: false, error: scopeCheck.reason },
          status: 403,
        };
      }

      const { error } = await admin.auth.admin.updateUserById(userId, {
        ban_duration: "876000h",
      });
      if (error) throw new Error(error.message);

      await audit(admin, {
        actor_id: callerId,
        actor_email: callerEmail,
        action,
        target_id: userId,
        target_email: targetEmail,
        result: "success",
      });

      return { body: { ok: true }, status: 200 };
    }

    // ── Unsuspend User ────────────────────────────────────────
    case "unsuspendUser": {
      const { userId } = params;
      if (!userId)
        return {
          body: { ok: false, error: "userId required" },
          status: 400,
        };

      const scopeCheck = await checkCompanyScope(
        admin,
        callerAccess,
        callerEmail,
        userId
      );
      if (!scopeCheck.ok) {
        await audit(admin, {
          actor_id: callerId,
          actor_email: callerEmail,
          action,
          target_id: userId,
          result: "denied",
          detail: scopeCheck.reason,
        });
        return {
          body: { ok: false, error: scopeCheck.reason },
          status: 403,
        };
      }

      const { error } = await admin.auth.admin.updateUserById(userId, {
        ban_duration: "none",
      });
      if (error) throw new Error(error.message);

      const targetEmail = await getTargetEmail(admin, userId);
      await audit(admin, {
        actor_id: callerId,
        actor_email: callerEmail,
        action,
        target_id: userId,
        target_email: targetEmail,
        result: "success",
      });

      return { body: { ok: true }, status: 200 };
    }

    // ── Delete User ───────────────────────────────────────────
    case "deleteUser": {
      const { userId } = params;
      if (!userId)
        return {
          body: { ok: false, error: "userId required" },
          status: 400,
        };

      const targetEmail = await getTargetEmail(admin, userId);
      if (SUPER_ADMIN_EMAILS.includes(targetEmail)) {
        await audit(admin, {
          actor_id: callerId,
          actor_email: callerEmail,
          action,
          target_id: userId,
          target_email: targetEmail,
          result: "denied",
          detail: "Cannot delete super-admin",
        });
        return {
          body: { ok: false, error: "Cannot delete the super-admin account." },
          status: 403,
        };
      }

      // Only super-admins can delete users (cross-company operation)
      if (!SUPER_ADMIN_EMAILS.includes(callerEmail)) {
        await audit(admin, {
          actor_id: callerId,
          actor_email: callerEmail,
          action,
          target_id: userId,
          target_email: targetEmail,
          result: "denied",
          detail: "Only super-admins can delete user accounts",
        });
        return {
          body: {
            ok: false,
            error:
              "Account deletion requires global authority. Use suspendUser for company-scoped access control.",
          },
          status: 403,
        };
      }

      const { error } = await admin.auth.admin.deleteUser(userId);
      if (error) throw new Error(error.message);

      await audit(admin, {
        actor_id: callerId,
        actor_email: callerEmail,
        action,
        target_id: userId,
        target_email: targetEmail,
        result: "success",
      });

      return { body: { ok: true }, status: 200 };
    }

    // ── Make Admin ────────────────────────────────────────────
    case "makeAdmin": {
      const { userId } = params;
      if (!userId)
        return {
          body: { ok: false, error: "userId required" },
          status: 400,
        };

      // Cannot self-promote
      if (userId === callerId) {
        await audit(admin, {
          actor_id: callerId,
          actor_email: callerEmail,
          action,
          target_id: userId,
          result: "denied",
          detail: "Self-promotion prevented",
        });
        return {
          body: { ok: false, error: "Cannot modify your own admin status." },
          status: 403,
        };
      }

      const targetEmail = await getTargetEmail(admin, userId);
      if (SUPER_ADMIN_EMAILS.includes(targetEmail)) {
        return {
          body: {
            ok: false,
            error: "Super-admin role is built-in and cannot be re-assigned.",
          },
          status: 403,
        };
      }

      // Only super-admins can promote to admin (elevated privilege)
      if (!SUPER_ADMIN_EMAILS.includes(callerEmail)) {
        await audit(admin, {
          actor_id: callerId,
          actor_email: callerEmail,
          action,
          target_id: userId,
          target_email: targetEmail,
          result: "denied",
          detail: "Only super-admins can promote to admin",
        });
        return {
          body: {
            ok: false,
            error:
              "Only super-admins can grant admin privileges.",
          },
          status: 403,
        };
      }

      const { error } = await admin.auth.admin.updateUserById(userId, {
        app_metadata: { role: "admin" },
      });
      if (error) throw new Error(error.message);

      await admin
        .from("user_system_access")
        .update({ is_admin: true })
        .eq("user_id", userId);

      await audit(admin, {
        actor_id: callerId,
        actor_email: callerEmail,
        action,
        target_id: userId,
        target_email: targetEmail,
        result: "success",
      });

      return { body: { ok: true }, status: 200 };
    }

    // ── Remove Admin ──────────────────────────────────────────
    case "removeAdmin": {
      const { userId } = params;
      if (!userId)
        return {
          body: { ok: false, error: "userId required" },
          status: 400,
        };

      // Cannot self-demote
      if (userId === callerId) {
        await audit(admin, {
          actor_id: callerId,
          actor_email: callerEmail,
          action,
          target_id: userId,
          result: "denied",
          detail: "Self-demotion prevented",
        });
        return {
          body: { ok: false, error: "Cannot modify your own admin status." },
          status: 403,
        };
      }

      const targetEmail = await getTargetEmail(admin, userId);
      if (SUPER_ADMIN_EMAILS.includes(targetEmail)) {
        return {
          body: {
            ok: false,
            error: "Cannot demote the super-admin account.",
          },
          status: 403,
        };
      }

      // Check last-admin protection
      const { data: adminCount } = await admin
        .from("user_system_access")
        .select("user_id", { count: "exact", head: true })
        .eq("is_admin", true);

      // Only super-admins can demote admins
      if (!SUPER_ADMIN_EMAILS.includes(callerEmail)) {
        await audit(admin, {
          actor_id: callerId,
          actor_email: callerEmail,
          action,
          target_id: userId,
          target_email: targetEmail,
          result: "denied",
          detail: "Only super-admins can remove admin privileges",
        });
        return {
          body: {
            ok: false,
            error: "Only super-admins can revoke admin privileges.",
          },
          status: 403,
        };
      }

      const { error } = await admin.auth.admin.updateUserById(userId, {
        app_metadata: { role: "user" },
      });
      if (error) throw new Error(error.message);

      await admin
        .from("user_system_access")
        .update({ is_admin: false })
        .eq("user_id", userId);

      await audit(admin, {
        actor_id: callerId,
        actor_email: callerEmail,
        action,
        target_id: userId,
        target_email: targetEmail,
        result: "success",
      });

      return { body: { ok: true }, status: 200 };
    }

    // ── Reset Password (via email link) ───────────────────────
    case "resetPassword": {
      const { email } = params;
      if (!email)
        return {
          body: { ok: false, error: "email required" },
          status: 400,
        };

      const { data, error } = await admin.auth.admin.generateLink({
        type: "recovery",
        email,
        options: { redirectTo: "" },
      });

      if (error) {
        // Fallback: user might not exist yet — send an invite instead
        const inv = await admin.auth.admin.generateLink({
          type: "invite",
          email,
        });
        if (inv.error) throw new Error(inv.error.message);

        await audit(admin, {
          actor_id: callerId,
          actor_email: callerEmail,
          action,
          target_email: email,
          result: "success",
          detail: "Generated invite link (user not found for recovery)",
        });

        return {
          body: {
            ok: true,
            link: inv.data?.properties?.action_link,
            type: "invite",
          },
          status: 200,
        };
      }

      await audit(admin, {
        actor_id: callerId,
        actor_email: callerEmail,
        action,
        target_email: email,
        result: "success",
        detail: "Generated recovery link",
      });

      return {
        body: {
          ok: true,
          link: data?.properties?.action_link,
          type: "recovery",
        },
        status: 200,
      };
    }

    // ── Invite User ───────────────────────────────────────────
    case "inviteUser": {
      const { email } = params;
      if (!email)
        return {
          body: { ok: false, error: "email required" },
          status: 400,
        };

      const { data, error } = await admin.auth.admin.generateLink({
        type: "invite",
        email,
      });
      if (error) throw new Error(error.message);

      await audit(admin, {
        actor_id: callerId,
        actor_email: callerEmail,
        action,
        target_email: email,
        result: "success",
      });

      return {
        body: {
          ok: true,
          link: data?.properties?.action_link,
          type: "invite",
        },
        status: 200,
      };
    }

    // ── Update User Access ────────────────────────────────────
    case "updateUserAccess": {
      const { userId, is_admin, systems } = params;
      if (!userId)
        return {
          body: { ok: false, error: "userId required" },
          status: 400,
        };

      const targetEmail = await getTargetEmail(admin, userId);

      // Super-admin protection
      if (SUPER_ADMIN_EMAILS.includes(targetEmail)) {
        await audit(admin, {
          actor_id: callerId,
          actor_email: callerEmail,
          action,
          target_id: userId,
          target_email: targetEmail,
          result: "denied",
          detail: "Cannot modify super-admin access",
        });
        return {
          body: {
            ok: false,
            error: "Cannot modify super-admin access.",
          },
          status: 403,
        };
      }

      // Self-modification prevention
      if (userId === callerId) {
        await audit(admin, {
          actor_id: callerId,
          actor_email: callerEmail,
          action,
          target_id: userId,
          result: "denied",
          detail: "Self-modification prevented",
        });
        return {
          body: { ok: false, error: "Cannot modify your own access." },
          status: 403,
        };
      }

      // CRITICAL: is_admin changes must follow same rules as makeAdmin/removeAdmin
      // Only super-admins can change admin status
      if (is_admin !== undefined) {
        const { data: currentAccess } = await admin
          .from("user_system_access")
          .select("is_admin")
          .eq("user_id", userId)
          .single();

        const currentIsAdmin = currentAccess?.is_admin || false;

        if (is_admin !== currentIsAdmin) {
          // This is an admin promotion or demotion — enforce same rules
          if (!SUPER_ADMIN_EMAILS.includes(callerEmail)) {
            await audit(admin, {
              actor_id: callerId,
              actor_email: callerEmail,
              action,
              target_id: userId,
              target_email: targetEmail,
              result: "denied",
              detail: `Cannot change admin status (${currentIsAdmin} → ${is_admin}) — requires super-admin`,
            });
            return {
              body: {
                ok: false,
                error:
                  "Only super-admins can change admin status. Use updateUserAccess to change system access only.",
              },
              status: 403,
            };
          }
        }
      }

      // System scope check — admin can only grant systems they have
      if (systems && Array.isArray(systems)) {
        const callerSystems: string[] = callerAccess.systems || [];
        const isSuperAdmin = SUPER_ADMIN_EMAILS.includes(callerEmail);

        if (!isSuperAdmin) {
          const unauthorized = systems.filter(
            (s: string) => !callerSystems.includes(s)
          );
          if (unauthorized.length > 0) {
            await audit(admin, {
              actor_id: callerId,
              actor_email: callerEmail,
              action,
              target_id: userId,
              target_email: targetEmail,
              result: "denied",
              detail: `Cannot grant systems beyond own scope: ${unauthorized.join(", ")}`,
            });
            return {
              body: {
                ok: false,
                error: `Cannot grant access to systems you do not have: ${unauthorized.join(", ")}`,
              },
              status: 403,
            };
          }
        }
      }

      // Build update payload — only include fields that were provided
      const updatePayload: any = {};
      if (is_admin !== undefined) updatePayload.is_admin = is_admin;
      if (systems !== undefined) updatePayload.systems = systems;

      const { error } = await admin
        .from("user_system_access")
        .upsert(
          { user_id: userId, ...updatePayload },
          { onConflict: "user_id" }
        );

      if (error) throw new Error(error.message);

      // If admin status changed, also update app_metadata
      if (is_admin !== undefined) {
        await admin.auth.admin.updateUserById(userId, {
          app_metadata: { role: is_admin ? "admin" : "user" },
        });
      }

      await audit(admin, {
        actor_id: callerId,
        actor_email: callerEmail,
        action,
        target_id: userId,
        target_email: targetEmail,
        result: "success",
        detail: `Updated: ${JSON.stringify(updatePayload)}`,
      });

      return { body: { ok: true }, status: 200 };
    }

    default:
      return {
        body: { ok: false, error: `Unhandled action: ${action}` },
        status: 400,
      };
  }
}

// ── Helpers ───────────────────────────────────────────────────────

async function getTargetEmail(admin: any, userId: string): Promise<string> {
  try {
    const { data, error } = await admin.auth.admin.getUserById(userId);
    return (data?.user?.email || "").toLowerCase();
  } catch {
    return "";
  }
}

async function checkCompanyScope(
  admin: any,
  callerAccess: any,
  callerEmail: string,
  targetUserId: string
): Promise<{ ok: boolean; reason: string }> {
  // Super-admins bypass scope checks
  if (SUPER_ADMIN_EMAILS.includes(callerEmail)) {
    return { ok: true, reason: "" };
  }

  // Check target user's systems overlap with caller's systems
  const { data: targetAccess } = await admin
    .from("user_system_access")
    .select("systems")
    .eq("user_id", targetUserId)
    .single();

  if (!targetAccess) {
    return { ok: false, reason: "Target user has no access record" };
  }

  const callerSystems: string[] = callerAccess.systems || [];
  const targetSystems: string[] = targetAccess.systems || [];

  // If target has systems that caller doesn't, deny
  const hasOverlap =
    targetSystems.length === 0 ||
    targetSystems.some((s: string) => callerSystems.includes(s));

  if (!hasOverlap) {
    return {
      ok: false,
      reason: "Target user is not within your system scope",
    };
  }

  return { ok: true, reason: "" };
}

async function audit(admin: any, entry: AuditEntry) {
  try {
    await admin.from("omnis_audit_trail").insert({
      action_type: `admin:${entry.action}`,
      user_id: entry.actor_id,
      user_email: entry.actor_email,
      target_user_id: entry.target_id || null,
      details: JSON.stringify({
        target_email: entry.target_email,
        result: entry.result,
        detail: entry.detail,
      }),
      created_at: new Date().toISOString(),
    });
  } catch (e) {
    // Audit failures must not break the operation
    console.error("[Audit] Failed to log:", e);
  }
}

function jsonResponse(body: any, status: number = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
