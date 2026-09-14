/**
 * test_canary.js - Omnis 4.3.10 Bounded Canary Operations
 *
 * This test verifies:
 *   A) Email INSERT + CANCELLATION lifecycle (not delivery)
 *   B) Admin demotion + re-promotion lifecycle
 *
 * Delivery verification is a separate, outstanding check that requires
 * an actually-sent email processed by process-email-queue.
 *
 * Roles:
 *   Admin A (takunda@industrial-exchange.group):
 *     Authenticates. Calls admin-operations removeAdmin/makeAdmin.
 *     Super-admin authority verified by Edge Function.
 *     Has NO user_system_access row - cannot perform email operations.
 *
 *   Admin B (gh05t@omnis.local):
 *     Demotion/re-promotion TARGET only. Does NOT authenticate.
 *     userId resolved by Admin A via getUsers.
 *
 *   Email-test user (rutendo@industrial-exchange.group):
 *     Authenticates. Has is_admin=true, systems includes fleetrack.
 *     Performs email INSERT (RLS: auth.uid + system membership)
 *     and cancelScheduled (ownership: created_by_id = auth.uid).
 *
 * Email lifecycle:
 *   1. INSERT one row (status=pending, scheduled_for = now + 48h).
 *   2. Verify created_by_id (uuid) pinned to email-test auth.uid().
 *   3. CANCEL exact UUID via email-submit cancelScheduled.
 *   4. Verify row retained with status=cancelled.
 *   Row is never deleted (no DELETE policy exists).
 *
 * Cleanup guarantees:
 *   Email cancellation and admin restoration run in independent
 *   try/catch blocks inside a single finally. A failure in one
 *   does not skip the other. Both report their own outcome.
 *
 * Environment variables (set by launcher, never logged):
 *   CANARY_ADMIN_A_PASSWORD   (takunda)
 *   CANARY_EMAIL_USER_PASSWORD (rutendo)
 *   SUPABASE_URL  SUPABASE_ANON_KEY
 */

var createClient = require('@supabase/supabase-js').createClient;

var SUPABASE_URL = process.env.SUPABASE_URL;
var ANON_KEY = process.env.SUPABASE_ANON_KEY;
var FUNCTIONS_URL = SUPABASE_URL + '/functions/v1';

var ADMIN_A_EMAIL = 'takunda@industrial-exchange.group';
var ADMIN_B_EMAIL = 'gh05t@omnis.local';
var EMAIL_USER_EMAIL = 'rutendo@industrial-exchange.group';
var EMAIL_RECIPIENT = 'takunda@industrial-exchange.group';

// ---- Pre-flight ----
var missing = [];
if (!SUPABASE_URL)                              missing.push('SUPABASE_URL');
if (!ANON_KEY)                                  missing.push('SUPABASE_ANON_KEY');
if (!process.env.CANARY_ADMIN_A_PASSWORD)       missing.push('CANARY_ADMIN_A_PASSWORD');
if (!process.env.CANARY_EMAIL_USER_PASSWORD)    missing.push('CANARY_EMAIL_USER_PASSWORD');
if (missing.length > 0) {
  console.error('Missing: ' + missing.join(', '));
  process.exit(1);
}

var RESULTS = [];
function record(name, status, detail) {
  RESULTS.push({ name: name, status: status, detail: detail });
  var tag = status === 'PASS' ? '[PASS]' : status === 'FAIL' ? '[FAIL]' : '[SKIP]';
  console.log('  ' + tag + ' ' + name + ': ' + detail);
}

function signIn(email, password) {
  var sb = createClient(SUPABASE_URL, ANON_KEY, { auth: { persistSession: false } });
  return sb.auth.signInWithPassword({ email: email, password: password })
    .then(function(res) {
      if (res.error) throw new Error('Sign-in failed for ' + email + ': ' + res.error.message);
      return { token: res.data.session.access_token, userId: res.data.user.id };
    });
}

function callFunction(name, token, body) {
  return fetch(FUNCTIONS_URL + '/' + name, {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer ' + token,
      'Content-Type': 'application/json',
      'apikey': ANON_KEY,
    },
    body: JSON.stringify(body),
  }).then(function(resp) {
    return resp.json().then(function(json) {
      return { status: resp.status, body: json };
    });
  });
}

function authedClient(token) {
  return createClient(SUPABASE_URL, ANON_KEY, {
    global: { headers: { Authorization: 'Bearer ' + token } },
    auth: { persistSession: false },
  });
}

function finish() {
  console.log();
  console.log('=== CANARY RESULTS ===');
  console.log('Completed: ' + new Date().toISOString());
  console.log();
  var passed = 0, failed = 0, skipped = 0;
  RESULTS.forEach(function(r) {
    if (r.status === 'PASS') passed++;
    else if (r.status === 'FAIL') failed++;
    else skipped++;
    console.log('  [' + r.status + '] ' + r.name);
  });
  console.log();
  console.log('Total: ' + RESULTS.length + ' | PASS: ' + passed + ' | FAIL: ' + failed + ' | SKIP: ' + skipped);
  if (failed > 0) {
    console.log();
    console.log('FAILURES:');
    RESULTS.filter(function(r) { return r.status === 'FAIL'; }).forEach(function(r) {
      console.log('  - ' + r.name + ': ' + r.detail);
    });
  }
  console.log();
  console.log('OUTSTANDING: Email delivery verification (requires a');
  console.log('  live send via process-email-queue, not covered by this test).');
  process.exit(failed > 0 ? 1 : 0);
}

async function main() {
  console.log('=== Omnis 4.3.10 Canary Test ===');
  console.log('  Email: INSERT + cancellation lifecycle (not delivery)');
  console.log('  Admin: demotion + re-promotion lifecycle');
  console.log('Started: ' + new Date().toISOString());
  console.log();

  var adminAToken, emailUserToken, emailUserUserId;
  var adminBUserId = null;
  var canaryEmailId = null;
  var adminBWasDemoted = false;

  // ==============================================================
  // PHASE 1: Authenticate both acting accounts before any mutation
  //   Admin B (gh05t) is NOT authenticated - target only.
  // ==============================================================
  console.log('-- Phase 1: Authentication (no mutations) --');

  try {
    var resultA = await signIn(ADMIN_A_EMAIL, process.env.CANARY_ADMIN_A_PASSWORD);
    adminAToken = resultA.token;
    record('Admin A sign-in', 'PASS', ADMIN_A_EMAIL);
  } catch (e) {
    record('Admin A sign-in', 'FAIL', e.message);
    return finish();
  }

  try {
    var resultE = await signIn(EMAIL_USER_EMAIL, process.env.CANARY_EMAIL_USER_PASSWORD);
    emailUserToken = resultE.token;
    emailUserUserId = resultE.userId;
    record('Email-test user sign-in', 'PASS', EMAIL_USER_EMAIL + ' (userId: ' + emailUserUserId + ')');
  } catch (e) {
    record('Email-test user sign-in', 'FAIL', e.message);
    return finish();
  }

  // Resolve Admin B userId via getUsers (Admin A is authorized)
  try {
    var usersResp = await callFunction('admin-operations', adminAToken, { action: 'getUsers' });
    if (!usersResp.body.ok) throw new Error(usersResp.body.error || 'getUsers failed');
    var adminBUser = usersResp.body.users.find(function(u) { return u.email === ADMIN_B_EMAIL; });
    if (!adminBUser) throw new Error(ADMIN_B_EMAIL + ' not found in user list');
    adminBUserId = adminBUser.id;
    record('Resolve Admin B userId', 'PASS', ADMIN_B_EMAIL + ' userId=' + adminBUserId + ' is_admin=' + adminBUser.is_admin);
    if (adminBUser.is_admin !== true) {
      record('Admin B pre-check', 'FAIL', 'is_admin=' + adminBUser.is_admin + ' (expected true). Cannot run demotion test.');
    }
  } catch (e) {
    record('Resolve Admin B userId', 'FAIL', e.message);
    return finish();
  }

  // ==============================================================
  // PHASE 2: Mutations (all sessions confirmed)
  // Wrapped in try/finally for independent cleanup
  // ==============================================================
  console.log();
  console.log('-- Phase 2: Mutations --');

  try {

    // ---- 2a: Email INSERT (email-test user) ----
    var scheduledFor = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString();
    try {
      var sb = authedClient(emailUserToken);
      var ins = await sb
        .from('omnis_email_queue')
        .insert({
          system: 'fleetrack',
          to_email: EMAIL_RECIPIENT,
          to_name: 'Canary Test',
          subject: '[CANARY] Omnis 4.3.10 INSERT/cancel verification - ' + new Date().toISOString(),
          body_html: '<p>Canary INSERT test. Scheduled 48h out; will be cancelled, not delivered.</p>',
          body_text: 'Canary INSERT test. Will be cancelled.',
          status: 'pending',
          scheduled_for: scheduledFor,
        })
        .select('id, created_by_id, status, scheduled_for')
        .single();

      if (ins.error) throw new Error(ins.error.message + ' (code: ' + ins.error.code + ')');
      canaryEmailId = ins.data.id;
      record('Email INSERT', 'PASS',
        'UUID=' + canaryEmailId + ', status=' + ins.data.status +
        ', scheduled_for=' + ins.data.scheduled_for);

      if (ins.data.created_by_id === emailUserUserId) {
        record('Verify created_by_id pin', 'PASS',
          'created_by_id=' + ins.data.created_by_id + ' matches ' + EMAIL_USER_EMAIL + ' auth.uid');
      } else {
        record('Verify created_by_id pin', 'FAIL',
          'created_by_id=' + ins.data.created_by_id + ' expected ' + emailUserUserId);
      }
    } catch (e) {
      record('Email INSERT', 'FAIL', e.message);
    }

    // ---- 2b: Demote Admin B (Admin A) ----
    try {
      var dResp = await callFunction('admin-operations', adminAToken, {
        action: 'removeAdmin', userId: adminBUserId,
      });
      if (dResp.body.ok) {
        adminBWasDemoted = true;
        record('Demote Admin B', 'PASS', 'removeAdmin ' + ADMIN_B_EMAIL);
      } else {
        throw new Error(dResp.body.error || JSON.stringify(dResp.body));
      }
    } catch (e) {
      record('Demote Admin B', 'FAIL', e.message);
    }

    // ---- 2c: Verify demotion ----
    if (adminBWasDemoted) {
      try {
        var vResp = await callFunction('admin-operations', adminAToken, { action: 'getUsers' });
        if (!vResp.body.ok) throw new Error(vResp.body.error || 'getUsers failed');
        var found = vResp.body.users.find(function(u) { return u.email === ADMIN_B_EMAIL; });
        if (!found) throw new Error(ADMIN_B_EMAIL + ' not in user list');
        if (found.is_admin === false) {
          record('Verify demotion', 'PASS', ADMIN_B_EMAIL + ' is_admin=false');
        } else {
          record('Verify demotion', 'FAIL', 'is_admin=' + found.is_admin + ' (expected false)');
        }
      } catch (e) {
        record('Verify demotion', 'FAIL', e.message);
      }
    }

  } finally {

    // ==============================================================
    // PHASE 3: Independent cleanup (always runs)
    // ==============================================================
    console.log();
    console.log('-- Phase 3: Cleanup --');

    // ---- 3a: Restore Admin B (independent) ----
    if (adminBWasDemoted) {
      try {
        var pResp = await callFunction('admin-operations', adminAToken, {
          action: 'makeAdmin', userId: adminBUserId,
        });
        if (pResp.body.ok) {
          record('Restore Admin B', 'PASS', 'makeAdmin ' + ADMIN_B_EMAIL);
        } else {
          throw new Error(pResp.body.error || JSON.stringify(pResp.body));
        }
      } catch (e) {
        record('Restore Admin B', 'FAIL',
          'CRITICAL: ' + ADMIN_B_EMAIL + ' remains demoted. Manual remediation required. Error: ' + e.message);
      }

      try {
        var rvResp = await callFunction('admin-operations', adminAToken, { action: 'getUsers' });
        if (!rvResp.body.ok) throw new Error(rvResp.body.error || 'getUsers failed');
        var rvFound = rvResp.body.users.find(function(u) { return u.email === ADMIN_B_EMAIL; });
        if (!rvFound) throw new Error(ADMIN_B_EMAIL + ' not in user list');
        if (rvFound.is_admin === true) {
          record('Verify restoration', 'PASS', ADMIN_B_EMAIL + ' is_admin=true (original state)');
        } else {
          record('Verify restoration', 'FAIL',
            'CRITICAL: ' + ADMIN_B_EMAIL + ' is_admin=' + rvFound.is_admin + '. NOT restored.');
        }
      } catch (e) {
        record('Verify restoration', 'FAIL',
          'CRITICAL: Cannot verify. Error: ' + e.message);
      }
    } else {
      record('Restore Admin B', 'SKIP', 'Demotion was not performed');
    }

    // ---- 3b: Cancel canary email (independent) ----
    if (canaryEmailId) {
      try {
        var cResp = await callFunction('email-submit', emailUserToken, {
          action: 'cancelScheduled',
          id: canaryEmailId,
        });
        if (cResp.body.ok) {
          record('Cancel canary email', 'PASS', 'cancelScheduled UUID=' + canaryEmailId);
        } else {
          throw new Error(cResp.body.error || JSON.stringify(cResp.body));
        }
      } catch (e) {
        record('Cancel canary email', 'FAIL',
          'UUID=' + canaryEmailId + ' may remain pending. Error: ' + e.message);
      }

      try {
        var sb3 = authedClient(emailUserToken);
        var vfy = await sb3
          .from('omnis_email_queue')
          .select('id, status, created_by_id')
          .eq('id', canaryEmailId)
          .maybeSingle();
        if (vfy.error) throw new Error(vfy.error.message);
        if (!vfy.data) {
          record('Verify cancellation', 'FAIL',
            'Row UUID=' + canaryEmailId + ' not found (should be retained with status=cancelled)');
        } else if (vfy.data.status === 'cancelled' && vfy.data.created_by_id === emailUserUserId) {
          record('Verify cancellation', 'PASS',
            'UUID=' + canaryEmailId + ' status=cancelled, created_by_id=' + vfy.data.created_by_id + ' (retained)');
        } else {
          record('Verify cancellation', 'FAIL',
            'status=' + vfy.data.status + ', created_by_id=' + vfy.data.created_by_id +
            ' (expected cancelled/' + emailUserUserId + ')');
        }
      } catch (e) {
        record('Verify cancellation', 'FAIL', e.message);
      }
    } else {
      record('Cancel canary email', 'SKIP', 'No email was inserted');
    }
  }

  finish();
}

main().catch(function(e) {
  console.error('Fatal error: ' + e.message);
  process.exit(1);
});