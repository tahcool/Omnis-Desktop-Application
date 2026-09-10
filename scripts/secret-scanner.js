/**
 * Omnis Secret Scanner — CI-Safe, Redacted Output
 * 
 * PURPOSE: Scan source files for hardcoded secrets. Report location and type
 *          but NEVER print the secret value.
 *
 * EXIT CODES:
 *   0 — no secrets found
 *   1 — secrets found (blocks CI)
 *   2 — scanner error
 *
 * USAGE:
 *   node scripts/secret-scanner.js [--ci]    # --ci exits non-zero on findings
 */

const fs = require('fs');
const path = require('path');

// --- Secret patterns ---
// Each pattern has: name, regex, redactedId function
const PATTERNS = [
  {
    name: 'Supabase Service Role Key',
    regex: /sb_secret_[A-Za-z0-9_]{10,}/g,
    redactId: (match) => `sb_secret_${match.slice(10, 14)}...${match.slice(-4)}`,
  },
  {
    name: 'Supabase Anon/JWT Key',
    regex: /eyJ[A-Za-z0-9_-]{50,}\.[A-Za-z0-9_-]{50,}\.[A-Za-z0-9_-]{30,}/g,
    redactId: (match) => `eyJ...${match.slice(-8)}`,
  },
  {
    name: 'Frappe API Token',
    regex: /[0-9a-f]{15,}:[0-9a-f]{15,}/g,
    redactId: (match) => {
      const parts = match.split(':');
      return `${parts[0].slice(0, 6)}...:${parts[1].slice(0, 6)}...`;
    },
  },
  {
    name: 'OpenAI API Key',
    regex: /sk-proj-[A-Za-z0-9_-]{20,}/g,
    redactId: (match) => `sk-proj-${match.slice(8, 12)}...${match.slice(-4)}`,
  },
  {
    name: 'Generic Secret Assignment',
    // Matches variable/config assignments like: SECRET = "value" or secret_key: "value"
    // Excludes false positives inside string concatenation (e.g., "password: " + var)
    regex: /(?:SECRET|API_SECRET|service_role_key)\s*[:=]\s*['"][^'"]{8,}['"]/gi,
    redactId: (_match) => '(assignment redacted)',
    // Note: PASSWORD removed from pattern — too many false positives in UI strings.
    // Actual password credentials use specific key patterns (sb_secret_, sk-proj-, etc.)
  },
];

// --- File scanning ---
const SCAN_DIRS = [
  'main.js',
  'lib/',
  'assets/js/',
  'systems/',
  'scripts/',
  'migrate/',
  'supabase/',
  'omnis-tablet/src/',
  '.env',
  'supabase/functions/.env',
];

const SKIP_EXTENSIONS = new Set([
  '.png', '.jpg', '.jpeg', '.gif', '.ico', '.svg',
  '.woff', '.woff2', '.ttf', '.eot',
  '.zip', '.gz', '.tar', '.7z',
  '.db', '.sqlite', '.ndjson',
  '.pyc', '.pyo',
]);

const SKIP_DIRS = new Set([
  'node_modules', '.git', 'dist', 'build', '.expo',
  '.wwebjs_cache', '.wwebjs_auth', '.test_auth',
]);

function getFiles(target, root) {
  const fullPath = path.resolve(root, target);
  if (!fs.existsSync(fullPath)) return [];

  const stat = fs.statSync(fullPath);
  if (stat.isFile()) return [fullPath];

  const results = [];
  function walk(dir) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (SKIP_DIRS.has(entry.name)) continue;
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(full);
      } else {
        const ext = path.extname(entry.name).toLowerCase();
        if (!SKIP_EXTENSIONS.has(ext)) {
          results.push(full);
        }
      }
    }
  }
  walk(fullPath);
  return results;
}

function scanFile(filePath, root) {
  const findings = [];
  let content;
  try {
    content = fs.readFileSync(filePath, 'utf-8');
  } catch (e) {
    return findings;
  }

  const lines = content.split('\n');
  const relPath = path.relative(root, filePath).replace(/\\/g, '/');

  for (const pattern of PATTERNS) {
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      let match;
      pattern.regex.lastIndex = 0;
      while ((match = pattern.regex.exec(line)) !== null) {
        if (line.includes('secret-scanner') || line.includes('PATTERNS')) continue;

        findings.push({
          file: relPath,
          line: i + 1,
          type: pattern.name,
          redactedId: pattern.redactId(match[0]),
        });
      }
    }
  }
  return findings;
}

// --- Main ---
function main() {
  const root = path.resolve(__dirname, '..');
  const isCI = process.argv.includes('--ci');

  console.log('=== Omnis Secret Scanner (Redacted Output) ===');
  console.log(`Root: ${root}`);
  console.log('');

  let allFiles = [];
  for (const target of SCAN_DIRS) {
    allFiles = allFiles.concat(getFiles(target, root));
  }

  console.log(`Scanning ${allFiles.length} files...`);
  console.log('');

  const allFindings = [];
  for (const file of allFiles) {
    const findings = scanFile(file, root);
    allFindings.push(...findings);
  }

  if (allFindings.length === 0) {
    console.log('✅ No hardcoded secrets found.');
    process.exit(0);
  }

  const byType = {};
  for (const f of allFindings) {
    if (!byType[f.type]) byType[f.type] = [];
    byType[f.type].push(f);
  }

  console.log(`🔴 Found ${allFindings.length} secret(s) in ${new Set(allFindings.map(f => f.file)).size} file(s):`);
  console.log('');

  for (const [type, findings] of Object.entries(byType)) {
    console.log(`  ${type} (${findings.length} occurrences):`);
    const seen = new Set();
    for (const f of findings) {
      const key = `${f.file}:${f.line}`;
      if (seen.has(key)) continue;
      seen.add(key);
      console.log(`    ${f.file}:${f.line} → [${f.redactedId}]`);
    }
    console.log('');
  }

  console.log('--- Summary ---');
  console.log(`Files with secrets: ${new Set(allFindings.map(f => f.file)).size}`);
  console.log(`Total occurrences: ${allFindings.length}`);
  console.log('');
  console.log('⚠️  SECRET VALUES ARE NOT SHOWN. Use file:line to locate and remediate.');

  if (isCI) {
    console.log('');
    console.log('❌ CI BLOCKED: Resolve all findings before release.');
    process.exit(1);
  }
}

main();
