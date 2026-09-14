/**
 * test_extract_error.js — Unit tests for extractEdgeFunctionError
 *
 * Tests the error extraction function from main.js against mocked
 * Response objects without requiring Electron or a running app.
 *
 * Scenarios:
 *   1. JSON body with {error: "message"} → returns the message
 *   2. Non-JSON body → falls back gracefully
 *   3. Already-consumed body (second .json() call) → falls back
 *   4. Network error (error.context.json throws) → falls back
 *   5. No error.context → uses error.message if informative
 *   6. Unhelpful "non-2xx" message → uses fallback
 *   7. Null/undefined error → returns fallback
 */

// Extract the function source from main.js at runtime
const fs = require('fs');
const path = require('path');

const mainPath = path.join(__dirname, '..', 'main.js');
const mainSource = fs.readFileSync(mainPath, 'utf8');

// Extract the function body
const fnMatch = mainSource.match(
  /async function extractEdgeFunctionError\(error, fallback\)\s*\{[\s\S]*?\n\}/
);
if (!fnMatch) {
  console.error('ABORT: Could not extract extractEdgeFunctionError from main.js');
  process.exit(1);
}

// Create the function in an isolated scope
const extractEdgeFunctionError = new Function(
  'error', 'fallback',
  `return (async function extractEdgeFunctionError(error, fallback) {${
    fnMatch[0].replace(/^async function extractEdgeFunctionError\(error, fallback\)\s*\{/, '')
      .replace(/\}$/, '')
  }})(error, fallback);`
);

const RESULTS = [];
function record(name, status, detail) {
  RESULTS.push({ name, status, detail });
  const icon = status === 'PASS' ? '✅' : status === 'FAIL' ? '❌' : '⏭️';
  console.log(`  ${icon} [${status}] ${name}: ${detail}`);
}

async function runTests() {
  console.log('=== extractEdgeFunctionError Unit Tests ===\n');

  // 1. JSON body with {error: "message"}
  {
    const error = {
      message: 'Edge Function returned a non-2xx status code',
      context: {
        json: async () => ({ error: 'Access denied: admin privileges required' }),
      },
    };
    const result = await extractEdgeFunctionError(error, 'Default fallback');
    record('json_body_error',
      result === 'Access denied: admin privileges required' ? 'PASS' : 'FAIL',
      `Got: "${result}"`);
  }

  // 2. Non-JSON body (html error page)
  {
    const error = {
      message: 'Edge Function returned a non-2xx status code',
      context: {
        json: async () => { throw new SyntaxError('Unexpected token < in JSON'); },
      },
    };
    const result = await extractEdgeFunctionError(error, 'Operation failed');
    record('non_json_body',
      result === 'Operation failed' ? 'PASS' : 'FAIL',
      `Got: "${result}"`);
  }

  // 3. Already-consumed body (Response.bodyUsed = true)
  {
    let consumed = false;
    const error = {
      message: 'Edge Function returned a non-2xx status code',
      context: {
        json: async () => {
          if (consumed) throw new TypeError('Body has already been consumed');
          consumed = true;
          return { error: 'First read works' };
        },
      },
    };
    // First call consumes
    await extractEdgeFunctionError(error, 'First');
    // Second call should get the consumed-body fallback
    const result = await extractEdgeFunctionError(error, 'Body consumed fallback');
    record('consumed_body',
      result === 'Body consumed fallback' ? 'PASS' : 'FAIL',
      `Got: "${result}"`);
  }

  // 4. Network error during .json()
  {
    const error = {
      message: 'Edge Function returned a non-2xx status code',
      context: {
        json: async () => { throw new TypeError('network error'); },
      },
    };
    const result = await extractEdgeFunctionError(error, 'Network error fallback');
    record('network_error',
      result === 'Network error fallback' ? 'PASS' : 'FAIL',
      `Got: "${result}"`);
  }

  // 5. No context property — informative error.message
  {
    const error = {
      message: 'Connection refused to localhost:54321',
    };
    const result = await extractEdgeFunctionError(error, 'Default');
    record('informative_message',
      result === 'Connection refused to localhost:54321' ? 'PASS' : 'FAIL',
      `Got: "${result}"`);
  }

  // 6. Unhelpful "non-2xx" message, no context
  {
    const error = {
      message: 'Edge Function returned a non-2xx status code',
    };
    const result = await extractEdgeFunctionError(error, 'Specific fallback');
    record('unhelpful_non2xx',
      result === 'Specific fallback' ? 'PASS' : 'FAIL',
      `Got: "${result}"`);
  }

  // 7. Null error
  {
    const result = await extractEdgeFunctionError(null, 'Null error fallback');
    record('null_error',
      result === 'Null error fallback' ? 'PASS' : 'FAIL',
      `Got: "${result}"`);
  }

  // 8. Undefined error
  {
    const result = await extractEdgeFunctionError(undefined, 'Undefined fallback');
    record('undefined_error',
      result === 'Undefined fallback' ? 'PASS' : 'FAIL',
      `Got: "${result}"`);
  }

  // 9. JSON body without .error field (e.g. {message: "..."}
  {
    const error = {
      message: 'Edge Function returned a non-2xx status code',
      context: {
        json: async () => ({ message: 'Not the error field', code: 'P0001' }),
      },
    };
    const result = await extractEdgeFunctionError(error, 'Missing error field');
    record('json_no_error_field',
      result === 'Missing error field' ? 'PASS' : 'FAIL',
      `Got: "${result}"`);
  }

  // 10. No fallback provided + null error
  {
    const result = await extractEdgeFunctionError(null, undefined);
    record('no_fallback_null_error',
      result === 'Unknown error' ? 'PASS' : 'FAIL',
      `Got: "${result}"`);
  }

  // 11. No fallback provided + non-2xx message
  {
    const error = {
      message: 'Edge Function returned a non-2xx status code',
    };
    const result = await extractEdgeFunctionError(error, undefined);
    record('no_fallback_non2xx',
      result === 'Operation failed' ? 'PASS' : 'FAIL',
      `Got: "${result}"`);
  }

  // Summary
  console.log('\n=== RESULTS ===');
  let passed = 0, failed = 0;
  RESULTS.forEach(r => {
    if (r.status === 'PASS') passed++;
    else failed++;
  });
  console.log(`Total: ${RESULTS.length} | PASS: ${passed} | FAIL: ${failed}`);
  if (failed > 0) {
    console.log('\nFAILURES:');
    RESULTS.filter(r => r.status === 'FAIL').forEach(r =>
      console.log(`  - ${r.name}: ${r.detail}`)
    );
  }
  return { passed, failed, results: RESULTS };
}

if (require.main === module) {
  runTests().then(({ failed }) => process.exit(failed > 0 ? 1 : 0));
}

module.exports = { runTests };
