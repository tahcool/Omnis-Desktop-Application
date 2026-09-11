/**
 * run_tests.js — Strict aggregate test runner.
 *
 * Runs all test suites sequentially, aggregates results, and exits
 * nonzero for any FAIL, SPEC, SKIP, NOT_RUN, crash, or timeout.
 *
 * Usage:
 *   SUPABASE_URL=... SUPABASE_ANON_KEY=... SUPABASE_SERVICE_KEY=... \
 *   node tests/run_tests.js [--strict]
 *
 * Environment:
 *   SUPABASE_URL            - Local Supabase URL
 *   SUPABASE_ANON_KEY       - Publishable/anon key
 *   SUPABASE_SERVICE_KEY    - Service role key
 *   FUNCTIONS_URL           - Edge Functions URL (default: SUPABASE_URL/functions/v1)
 */

const { execSync, spawnSync } = require('child_process');
const path = require('path');

const SUITES = [
  { name: 'test_concurrency',            file: 'test_concurrency.js',            timeout: 120 },
  { name: 'test_compensation',           file: 'test_compensation.js',           timeout: 120 },
  { name: 'test_ai_proxy',               file: 'test_ai_proxy.js',               timeout: 60 },
  { name: 'test_endpoints',              file: 'test_endpoints.js',              timeout: 60 },
  { name: 'test_rls',                    file: 'test_rls.js',                    timeout: 60, args: ['--strict'] },
  { name: 'test_email',                  file: 'test_email.js',                  timeout: 60 },
  { name: 'test_company_isolation',      file: 'test_company_isolation.js',      timeout: 60 },
  { name: 'test_ai_proxy_success',       file: 'test_ai_proxy_success.js',       timeout: 60 },
  { name: 'test_compensation_transport', file: 'test_compensation_transport.js', timeout: 60 },
  { name: 'test_email_worker',           file: 'test_email_worker.js',           timeout: 60 },
];

function getCommitInfo() {
  try {
    const sha = execSync('git rev-parse HEAD', { encoding: 'utf8' }).trim();
    const branch = execSync('git rev-parse --abbrev-ref HEAD', { encoding: 'utf8' }).trim();
    const dirty = execSync('git status --porcelain', { encoding: 'utf8' }).trim();
    return { sha, branch, dirty: dirty ? 'dirty' : 'clean' };
  } catch {
    return { sha: 'unknown', branch: 'unknown', dirty: 'unknown' };
  }
}

function runSuite(suite) {
  const filePath = path.join(__dirname, suite.file);
  const args = [filePath, ...(suite.args || [])];
  const env = { ...process.env };
  if (!env.FUNCTIONS_URL) {
    env.FUNCTIONS_URL = `${env.SUPABASE_URL}/functions/v1`;
  }

  const startTime = Date.now();
  const result = spawnSync('node', args, {
    env,
    timeout: suite.timeout * 1000,
    stdio: ['pipe', 'pipe', 'pipe'],
    encoding: 'utf8',
  });
  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

  return {
    name: suite.name,
    exitCode: result.status,
    signal: result.signal,
    error: result.error?.message,
    stdout: result.stdout || '',
    stderr: result.stderr || '',
    elapsed,
    timedOut: result.signal === 'SIGTERM' || result.error?.message?.includes('ETIMEDOUT'),
  };
}

function parseCounts(stdout) {
  // Look for structured JSON output first
  const jsonMatch = stdout.match(/\{[^}]*"suite"[^}]*"pass"\s*:\s*(\d+)[^}]*"fail"\s*:\s*(\d+)[^}]*"total"\s*:\s*(\d+)[^}]*\}/);
  if (jsonMatch) {
    return { pass: parseInt(jsonMatch[1]), fail: parseInt(jsonMatch[2]), total: parseInt(jsonMatch[3]) };
  }

  // Fallback: parse "Total: N | Pass: N | Fail: N" format
  const match = stdout.match(/Total:\s*(\d+)\s*\|\s*Pass:\s*(\d+)\s*\|\s*Fail:\s*(\d+)/);
  if (match) {
    return { total: parseInt(match[1]), pass: parseInt(match[2]), fail: parseInt(match[3]) };
  }

  // Parse "Total: N | Pass: N | Fail: N | Spec: N | Not Run: N" format
  const fullMatch = stdout.match(/Total:\s*(\d+)\s*\|\s*Pass:\s*(\d+)\s*\|\s*Fail:\s*(\d+)\s*\|\s*Spec:\s*(\d+)\s*\|\s*Not Run:\s*(\d+)/);
  if (fullMatch) {
    return {
      total: parseInt(fullMatch[1]),
      pass: parseInt(fullMatch[2]),
      fail: parseInt(fullMatch[3]),
      spec: parseInt(fullMatch[4]),
      notRun: parseInt(fullMatch[5]),
    };
  }

  return null;
}

// ── Main ──

const isStrict = process.argv.includes('--strict');

console.log('╔════════════════════════════════════════════════════════════╗');
console.log('║         OMNIS STRICT TEST GATE                           ║');
console.log('╚════════════════════════════════════════════════════════════╝');

const commit = getCommitInfo();
console.log(`\n  Commit:  ${commit.sha.substring(0, 7)} (${commit.branch})`);
console.log(`  Tree:    ${commit.dirty}`);
console.log(`  URL:     ${process.env.SUPABASE_URL || '(not set)'}`);
console.log(`  Time:    ${new Date().toISOString()}`);
console.log(`  Mode:    ${isStrict ? 'STRICT' : 'normal'}`);
console.log('');

if (!process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY || !process.env.SUPABASE_SERVICE_KEY) {
  console.error('  FATAL: Missing required env vars (SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_KEY)');
  process.exit(3);
}

const allResults = [];
let totalPass = 0, totalFail = 0, totalSpec = 0, totalNotRun = 0;
let anyError = false;

for (const suite of SUITES) {
  console.log(`\n${'─'.repeat(60)}`);
  console.log(`▸ ${suite.name} (timeout: ${suite.timeout}s)`);
  console.log('─'.repeat(60));

  const result = runSuite(suite);

  // Print output
  if (result.stdout) console.log(result.stdout);
  if (result.stderr) {
    // Only print stderr if not just warnings
    const meaningful = result.stderr.split('\n').filter(l => !l.includes('ExperimentalWarning')).join('\n').trim();
    if (meaningful) console.error(`  [stderr] ${meaningful.substring(0, 200)}`);
  }

  const counts = parseCounts(result.stdout);

  if (result.timedOut) {
    console.error(`  ✖ TIMEOUT after ${suite.timeout}s`);
    anyError = true;
    allResults.push({ suite: suite.name, status: 'TIMEOUT', exitCode: null });
  } else if (result.error) {
    console.error(`  ✖ CRASH: ${result.error}`);
    anyError = true;
    allResults.push({ suite: suite.name, status: 'CRASH', exitCode: null, error: result.error });
  } else if (result.exitCode !== 0) {
    anyError = true;
    allResults.push({
      suite: suite.name, status: 'FAIL', exitCode: result.exitCode,
      ...(counts || {}),
    });
  } else if (!counts) {
    console.error(`  ✖ MALFORMED: Could not parse test results`);
    anyError = true;
    allResults.push({ suite: suite.name, status: 'MALFORMED', exitCode: result.exitCode });
  } else {
    allResults.push({
      suite: suite.name, status: 'OK', exitCode: 0,
      ...counts,
    });
  }

  if (counts) {
    totalPass += counts.pass || 0;
    totalFail += counts.fail || 0;
    totalSpec += counts.spec || 0;
    totalNotRun += counts.notRun || 0;
  }

  console.log(`  → exit=${result.exitCode}, elapsed=${result.elapsed}s`);
}

// ── Aggregate Summary ──

console.log('\n' + '═'.repeat(60));
console.log('AGGREGATE RESULTS');
console.log('═'.repeat(60));

const suitesPassed = allResults.filter(r => r.status === 'OK').length;
const suitesFailed = allResults.filter(r => r.status !== 'OK').length;

console.log(`\n  Suites:  ${allResults.length} total, ${suitesPassed} OK, ${suitesFailed} failed`);
console.log(`  Tests:   ${totalPass + totalFail + totalSpec + totalNotRun} total`);
console.log(`           ${totalPass} PASS, ${totalFail} FAIL, ${totalSpec} SPEC, ${totalNotRun} NOT_RUN`);
console.log(`  Commit:  ${commit.sha.substring(0, 7)} (${commit.branch}, ${commit.dirty})`);
console.log(`  Time:    ${new Date().toISOString()}`);

if (suitesFailed > 0) {
  console.log('\n  FAILED SUITES:');
  allResults.filter(r => r.status !== 'OK').forEach(r => {
    console.log(`    ✖ ${r.suite}: ${r.status} (exit=${r.exitCode})`);
  });
}

// Strict gate
const blocked = totalFail > 0 || totalSpec > 0 || totalNotRun > 0 || anyError;
if (blocked) {
  console.log('\n  ✖ GATE BLOCKED');
  if (totalFail > 0) console.log(`    - ${totalFail} test failure(s)`);
  if (totalSpec > 0) console.log(`    - ${totalSpec} unexecuted SPEC(s)`);
  if (totalNotRun > 0) console.log(`    - ${totalNotRun} NOT_RUN test(s)`);
  if (anyError) console.log('    - Suite crash, timeout, or malformed results');
  process.exit(1);
} else {
  console.log('\n  ✔ GATE PASSED: All tests executed and passed.');
  process.exit(0);
}
