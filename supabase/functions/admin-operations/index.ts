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
import { SUPER_ADMIN_EMAILS, isSuperAdmin } from "../_shared/admin-config.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// Super-admin list now imported from ../_shared/admin-config.ts
// Single source of truth for both admin-operations and email-submit.

// Actions explicitly deferred — return clear error, not silent failure
const DEFERRED_ACTIONS = new Set([
  "setPassword",
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
  "setPasswordDirect",
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

  // Derive super-admin identity from validated JWT email
  const callerEmail = (caller.email || "").toLowerCase();
  const callerIsSuperAdmin = isSuperAdmin(callerEmail);

  // Look up caller's access from authoritative table (not from request)
  // Use .maybeSingle() to distinguish "no row" from a genuine DB error
  const { data: callerAccess, error: accessError } = await adminClient
    .from("user_system_access")
    .select("is_admin, systems")
    .eq("user_id", caller.id)
    .maybeSingle();

  // Genuine database error (not merely an absent row) — fail for everyone
  if (accessError) {
    await audit(adminClient, {
      actor_id: caller.id,
      actor_email: callerEmail,
      action,
      result: "error",
      detail: `Database error looking up caller access: ${accessError.message}`,
    });
    return jsonResponse(
      { ok: false, error: "Internal error checking authorization" },
      500
    );
  }

  // No access row found
  if (!callerAccess) {
    if (!callerIsSuperAdmin) {
      // Non-super-admin with no access row — deny
      await audit(adminClient, {
        actor_id: caller.id,
        actor_email: callerEmail,
        action,
        result: "denied",
        detail: "No access record found for caller",
      });
      return jsonResponse(
        { ok: false, error: "Access denied: no access record" },
        403
      );
    }
    // Super-admin without a row — allowed to continue
  } else if (!callerAccess.is_admin && !callerIsSuperAdmin) {
    // Has a row but is_admin is false and not a super-admin — deny
    await audit(adminClient, {
      actor_id: caller.id,
      actor_email: callerEmail,
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
      callerIsSuperAdmin,
      action,
      params
    );
    return jsonResponse(result.body, result.status);
  } catch (e: any) {
    await audit(adminClient, {
      actor_id: caller.id,
      actor_email: callerEmail,
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
  callerIsSuperAdmin: boolean,
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
      const callerSystems: string[] = callerAccess?.systems || [];
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

      // Last-admin protection: if target is an admin, atomically demote first.
      // This uses safe_remove_admin which locks admin rows with FOR UPDATE,
      // preventing the race where two concurrent suspensions both pass a
      // pre-flight check and then both ban their targets.
      //
      // Sequence: (1) Atomically demote under lock → (2) Ban via Auth API
      // If (2) fails, revert (1). DB is authoritative for admin checks.
      const { data: targetSuspAccess } = await admin
        .from("user_system_access")
        .select("is_admin")
        .eq("user_id", userId)
        .single();

      const wasAdmin = targetSuspAccess?.is_admin === true;

      if (wasAdmin) {
        // Atomically demote under lock — prevents concurrent removal race
        const { data: safeResult, error: safeErr } = await admin.rpc(
          "safe_remove_admin",
          { target_user_id: userId }
        );
        if (safeErr) throw new Error(`Last-admin check failed: ${safeErr.message}`);
        if (!safeResult?.ok) {
          await audit(admin, {
            actor_id: callerId,
            actor_email: callerEmail,
            action,
            target_id: userId,
            target_email: targetEmail,
            result: "denied",
            detail: safeResult?.reason || "Last-admin protection triggered",
          });
          return {
            body: {
              ok: false,
              error: safeResult?.reason || "Cannot suspend the last active global administrator.",
            },
            status: 403,
          };
        }
        // Target is now demoted in DB. Proceed to ban via Auth API.
      }

      const { error } = await admin.auth.admin.updateUserById(userId, {
        ban_duration: "876000h",
      });

      if (error) {
        // Auth API failed — conditionally revert the demotion.
        // Only revert if is_admin is still false (our demotion).
        // If another operation has since re-promoted or re-demoted,
        // we must NOT overwrite that decision.
        if (wasAdmin) {
          const { data: currentState } = await admin
            .from("user_system_access")
            .select("is_admin")
            .eq("user_id", userId)
            .single();

          if (currentState && currentState.is_admin === false) {
            await admin
              .from("user_system_access")
              .update({ is_admin: true })
              .eq("user_id", userId);
            console.error(`[suspendUser] Auth ban failed, reverted demotion for ${userId}: ${error.message}`);
            await audit(admin, {
              actor_id: callerId,
              actor_email: callerEmail,
              action: "compensate_suspend",
              target_id: userId,
              target_email: targetEmail,
              result: "reverted",
              detail: `Auth ban failed (${error.message}); admin status restored`,
            });
          } else {
            // State has moved on — another operation changed is_admin.
            // Do NOT overwrite. Log for manual review.
            console.error(`[suspendUser] Auth ban failed for ${userId}, but is_admin state has changed (now: ${currentState?.is_admin}). NOT reverting.`);
            await audit(admin, {
              actor_id: callerId,
              actor_email: callerEmail,
              action: "compensate_suspend",
              target_id: userId,
              target_email: targetEmail,
              result: "skipped",
              detail: `Auth ban failed, but admin state already changed (is_admin=${currentState?.is_admin}). Manual review required.`,
            });
          }
        }
        throw new Error(error.message);
      }

      // Update Auth metadata to reflect demotion
      if (wasAdmin) {
        await admin.auth.admin.updateUserById(userId, {
          app_metadata: { role: "user" },
        }).catch((e: any) => console.error(`[suspendUser] metadata sync: ${e.message}`));
      }

      await audit(admin, {
        actor_id: callerId,
        actor_email: callerEmail,
        action,
        target_id: userId,
        target_email: targetEmail,
        result: "success",
        detail: wasAdmin ? "Admin demoted atomically before suspension" : undefined,
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

      // Last-admin protection: atomically demote first, then delete.
      // Same coordination as suspendUser — see comment there.
      const { data: targetDelAccess } = await admin
        .from("user_system_access")
        .select("is_admin")
        .eq("user_id", userId)
        .single();

      const wasDelAdmin = targetDelAccess?.is_admin === true;

      if (wasDelAdmin) {
        const { data: safeDelResult, error: safeDelErr } = await admin.rpc(
          "safe_remove_admin",
          { target_user_id: userId }
        );
        if (safeDelErr) throw new Error(`Last-admin check failed: ${safeDelErr.message}`);
        if (!safeDelResult?.ok) {
          await audit(admin, {
            actor_id: callerId,
            actor_email: callerEmail,
            action,
            target_id: userId,
            target_email: targetEmail,
            result: "denied",
            detail: safeDelResult?.reason || "Last-admin protection triggered",
          });
          return {
            body: {
              ok: false,
              error: safeDelResult?.reason || "Cannot delete the last active global administrator.",
            },
            status: 403,
          };
        }
      }

      const { error } = await admin.auth.admin.deleteUser(userId);

      if (error) {
        // Auth delete failed — conditionally revert demotion.
        // Same state-aware logic as suspendUser.
        if (wasDelAdmin) {
          const { data: delCurrentState } = await admin
            .from("user_system_access")
            .select("is_admin")
            .eq("user_id", userId)
            .single();

          if (delCurrentState && delCurrentState.is_admin === false) {
            await admin
              .from("user_system_access")
              .update({ is_admin: true })
              .eq("user_id", userId);
            console.error(`[deleteUser] Auth delete failed, reverted demotion for ${userId}: ${error.message}`);
            await audit(admin, {
              actor_id: callerId,
              actor_email: callerEmail,
              action: "compensate_delete",
              target_id: userId,
              target_email: targetEmail,
              result: "reverted",
              detail: `Auth delete failed (${error.message}); admin status restored`,
            });
          } else {
            console.error(`[deleteUser] Auth delete failed for ${userId}, but is_admin state has changed (now: ${delCurrentState?.is_admin}). NOT reverting.`);
            await audit(admin, {
              actor_id: callerId,
              actor_email: callerEmail,
              action: "compensate_delete",
              target_id: userId,
              target_email: targetEmail,
              result: "skipped",
              detail: `Auth delete failed, but admin state already changed (is_admin=${delCurrentState?.is_admin}). Manual review required.`,
            });
          }
        }
        throw new Error(error.message);
      }

      // Clean up access record for deleted user
      await admin
        .from("user_system_access")
        .delete()
        .eq("user_id", userId);

      await audit(admin, {
        actor_id: callerId,
        actor_email: callerEmail,
        action,
        target_id: userId,
        target_email: targetEmail,
        result: "success",
        detail: wasDelAdmin ? "Admin demoted atomically before deletion" : undefined,
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

      // Last-admin protection: use transactional RPC to atomically check + demote.
      // safe_remove_admin locks admin rows with FOR UPDATE to prevent concurrent races.
      const { data: removeResult, error: removeErr } = await admin.rpc(
        "safe_remove_admin",
        { target_user_id: userId }
      );

      if (removeErr) {
        throw new Error(`Last-admin check failed: ${removeErr.message}`);
      }

      if (!removeResult?.ok) {
        await audit(admin, {
          actor_id: callerId,
          actor_email: callerEmail,
          action,
          target_id: userId,
          target_email: targetEmail,
          result: "denied",
          detail: removeResult?.reason || "Last-admin protection triggered",
        });
        return {
          body: {
            ok: false,
            error: removeResult?.reason || "Cannot remove the last active global administrator.",
          },
          status: 403,
        };
      }

      // DB update succeeded atomically. Now update Auth metadata.
      // If this fails, the DB state (is_admin=false) is already committed.
      // Recovery: admin can re-promote via makeAdmin, or the auth metadata
      // will be stale but non-dangerous (user won't pass DB authorization check).
      const { error: authUpdateErr } = await admin.auth.admin.updateUserById(userId, {
        app_metadata: { role: "user" },
      });
      if (authUpdateErr) {
        console.error(`[removeAdmin] Auth metadata update failed for ${userId}: ${authUpdateErr.message}`);
        // Non-fatal: DB is authoritative. Log but don't fail the operation.
      }

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

      // Use resetPasswordForEmail which sends the recovery email directly
      // via Supabase's built-in email delivery. The recovery token is NEVER
      // returned to the admin client — this prevents account takeover.
      const { error } = await admin.auth.resetPasswordForEmail(email, {
        redirectTo: "",
      });

      if (error) {
        // If user doesn't exist, don't reveal that — just succeed silently
        // to prevent user enumeration via admin password reset
        console.error(`[resetPassword] Error for ${email}: ${error.message}`);
      }

      await audit(admin, {
        actor_id: callerId,
        actor_email: callerEmail,
        action,
        target_email: email,
        result: "success",
        detail: "Password reset email sent (no token returned to caller)",
      });

      return {
        body: {
          ok: true,
          message: "Password reset email has been sent to the user.",
        },
        status: 200,
      };
    }


    // ── Set Password Directly (super-admin only) ─────────────
    case "setPasswordDirect": {
      const { userId, password } = params;
      if (!userId || !password)
        return {
          body: { ok: false, error: "userId and password required" },
          status: 400,
        };
      if (password.length < 6)
        return {
          body: { ok: false, error: "Password must be at least 6 characters" },
          status: 400,
        };

      // Only super-admins can directly set passwords
      if (!SUPER_ADMIN_EMAILS.includes(callerEmail)) {
        await audit(admin, {
          actor_id: callerId,
          actor_email: callerEmail,
          action,
          target_id: userId,
          result: "denied",
          detail: "Only super-admins can set passwords directly",
        });
        return {
          body: { ok: false, error: "Only super-admins can set passwords directly" },
          status: 403,
        };
      }

      const { error: pwErr } = await admin.auth.admin.updateUserById(userId, {
        password,
      });

      if (pwErr) throw new Error(pwErr.message);

      await audit(admin, {
        actor_id: callerId,
        actor_email: callerEmail,
        action,
        target_id: userId,
        result: "success",
        detail: "Password set directly by super-admin",
      });

      return {
        body: { ok: true, message: "Password updated successfully." },
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

      // Only super-admins can invite new users
      if (!SUPER_ADMIN_EMAILS.includes(callerEmail)) {
        await audit(admin, {
          actor_id: callerId,
          actor_email: callerEmail,
          action,
          target_email: email,
          result: "denied",
          detail: "Only super-admins can send invitations",
        });
        return {
          body: { ok: false, error: "Only super-admins can send invitations." },
          status: 403,
        };
      }

      // inviteUserByEmail sends the invite directly — no token returned
      const { error } = await admin.auth.admin.inviteUserByEmail(email);
      if (error) throw new Error(error.message);

      await audit(admin, {
        actor_id: callerId,
        actor_email: callerEmail,
        action,
        target_email: email,
        result: "success",
        detail: "Invitation email sent (no token returned to caller)",
      });

      return {
        body: {
          ok: true,
          message: "Invitation email has been sent.",
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
        const callerSystems: string[] = callerAccess?.systems || [];
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
      if (systems !== undefined) updatePayload.systems = systems;

      // Handle admin demotion through safe_remove_admin for last-admin protection
      if (is_admin === false) {
        // Check if currently admin
        const { data: curAccess } = await admin
          .from("user_system_access")
          .select("is_admin")
          .eq("user_id", userId)
          .single();

        if (curAccess?.is_admin) {
          // Use transactional RPC to safely demote
          const { data: safeResult, error: safeErr } = await admin.rpc(
            "safe_remove_admin",
            { target_user_id: userId }
          );

          if (safeErr) throw new Error(`Last-admin check failed: ${safeErr.message}`);
          if (!safeResult?.ok) {
            await audit(admin, {
              actor_id: callerId,
              actor_email: callerEmail,
              action,
              target_id: userId,
              target_email: targetEmail,
              result: "denied",
              detail: safeResult?.reason || "Last-admin protection triggered",
            });
            return {
              body: {
                ok: false,
                error: safeResult?.reason || "Cannot remove the last active global administrator.",
              },
              status: 403,
            };
          }
          // is_admin already set to false by RPC — don't include in upsert
        }
      } else if (is_admin !== undefined) {
        updatePayload.is_admin = is_admin;
      }

      // Apply remaining updates (systems, and is_admin=true promotions)
      if (Object.keys(updatePayload).length > 0) {
        const { error } = await admin
          .from("user_system_access")
          .upsert(
            { user_id: userId, ...updatePayload },
            { onConflict: "user_id" }
          );

        if (error) throw new Error(error.message);
      }

      // If admin status changed, also update app_metadata
      if (is_admin !== undefined) {
        const { error: authErr } = await admin.auth.admin.updateUserById(userId, {
          app_metadata: { role: is_admin ? "admin" : "user" },
        });
        if (authErr) {
          console.error(`[updateUserAccess] Auth metadata update failed: ${authErr.message}`);
          // Non-fatal: DB is authoritative
        }
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
      event_type: `admin:${entry.action}`,
      entity_type: "user",
      entity_name: entry.target_email || entry.target_id || null,
      user_email: entry.actor_email,
      details: {
        actor_id: entry.actor_id,
        target_id: entry.target_id || null,
        target_email: entry.target_email || null,
        result: entry.result,
        detail: entry.detail || null,
      },
      source: "admin-operations",
    });
  } catch (e) {
    // Audit failure must not break the operation, but log visibly
    console.error("[Audit] Failed to write audit trail:", (e as Error).message);
  }
}

function jsonResponse(body: any, status: number = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}