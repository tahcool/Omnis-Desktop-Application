#!/usr/bin/env node
/**
 * build_and_scan.js — Build from current HEAD in a clean worktree, then scan the ASAR.
 *
 * Usage:
 *   node scripts/build_and_scan.js
 *
 * Produces:
 *   - dist/win-unpacked/ — unpacked Electron build
 *   - dist/asar-extract/ — extracted ASAR for inspection
 *   - Prints ASAR secret scan results
 */

const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

const WORKSPACE = path.resolve(__dirname, '..');
const BUILD_DIR = 'c:\\Users\\Administrator\\omnis-build';
const HEAD = execSync('git rev-parse HEAD', { cwd: WORKSPACE }).toString().trim();

console.log(`=== Build & Scan ===`);
console.log(`HEAD: ${HEAD}`);
console.log(`Workspace: ${WORKSPACE}`);
console.log(`Build Dir: ${BUILD_DIR}`);

// Step 1: Create worktree
console.log('\n--- Step 1: Create clean worktree ---');
try {
  execSync(`git worktree remove --force "${BUILD_DIR}"`, { cwd: WORKSPACE, stdio: 'ignore' });
} catch {}
try {
  fs.rmSync(BUILD_DIR, { recursive: true, force: true });
} catch {}
execSync(`git worktree add "${BUILD_DIR}" ${HEAD}`, { cwd: WORKSPACE, stdio: 'inherit' });

// Step 2: Install deps
console.log('\n--- Step 2: Install dependencies ---');
execSync('npm install --ignore-scripts', { cwd: BUILD_DIR, stdio: 'inherit' });

// Step 3: Build
console.log('\n--- Step 3: Build ---');
execSync('npx electron-builder --dir --win', { cwd: BUILD_DIR, stdio: 'inherit' });

// Step 4: Check ASAR
const asarPath = path.join(BUILD_DIR, 'dist', 'win-unpacked', 'resources', 'app.asar');
if (!fs.existsSync(asarPath)) {
  console.error('app.asar not found!');
  process.exit(1);
}
const asarSize = fs.statSync(asarPath).size;
const asarHash = crypto.createHash('sha256').update(fs.readFileSync(asarPath)).digest('hex');
console.log(`\napp.asar: ${(asarSize / 1024 / 1024).toFixed(2)} MB`);
console.log(`SHA-256: ${asarHash}`);

// Step 5: Extract
const extractDir = path.join(BUILD_DIR, 'dist', 'asar-extract');
console.log('\n--- Step 5: Extract ASAR ---');
execSync(`npx asar extract "${asarPath}" "${extractDir}"`, { cwd: BUILD_DIR, stdio: 'inherit' });

// Step 6: Scan
console.log('\n--- Step 6: Scan for secrets ---');
const SECRET_PATTERNS = [
  { name: 'Supabase Service Key', regex: /sb_secret_[A-Za-z0-9_]{10,}/ },
  { name: 'OpenAI API Key', regex: /sk-proj-[A-Za-z0-9_-]{20,}/ },
  { name: 'Service Role JWT', regex: /service_role.*eyJ[A-Za-z0-9+/=]{20,}/ },
  { name: 'Frappe Token', regex: /[0-9a-f]{10,}:[0-9a-f]{10,}/ },
];

let findings = 0;
function scanDir(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      scanDir(full);
    } else if (/\.(js|ts|json|py|html|yml|yaml|sql|css|env)$/i.test(entry.name)) {
      const content = fs.readFileSync(full, 'utf8');
      for (const pat of SECRET_PATTERNS) {
        if (pat.regex.test(content)) {
          console.log(`  🔴 ${pat.name}: ${full.replace(extractDir, '')}`);
          findings++;
        }
      }
    }
  }
}

// Count Python files
let pyCount = 0;
function countPy(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) countPy(full);
    else if (entry.name.endsWith('.py')) {
      pyCount++;
      console.log(`  📄 Python: ${full.replace(extractDir, '')}`);
    }
  }
}
console.log('\n  Python files in ASAR:');
countPy(extractDir);
console.log(`  Total Python files: ${pyCount}`);

console.log('\n  Secret scan:');
scanDir(extractDir);

if (findings === 0) {
  console.log('  ✅ No secrets found in ASAR');
} else {
  console.log(`  ❌ ${findings} secret(s) found in ASAR!`);
}

console.log(`\n=== Build Evidence ===`);
console.log(`Commit: ${HEAD}`);
console.log(`ASAR: ${(asarSize / 1024 / 1024).toFixed(2)} MB`);
console.log(`SHA-256: ${asarHash}`);
console.log(`Python files: ${pyCount}`);
console.log(`Secrets: ${findings}`);

process.exit(findings > 0 ? 1 : 0);
