#!/usr/bin/env node
/**
 * Omnis Version Stamper (CommonJS)
 * Reads version.json and propagates the version+codename everywhere:
 *   - package.json
 *   - systems/fleetrack/index.html  (top navbar + about pane)
 *   - systems/salestrack/index.html (top navbar badge + settings panel)
 *   - systems/powertrack/dashboard.html (version-badge)
 *   - systems/powertrack/powertrack_index.html (version text)
 *   - RELEASE_NOTES.md (header line only)
 *
 * Usage:
 *   node scripts/stamp-version.js            # stamp everything
 *   node scripts/stamp-version.js --dry-run  # preview without writing
 */

'use strict';
const fs   = require('fs');
const path = require('path');

const ROOT    = path.join(__dirname, '..');
const DRY_RUN = process.argv.includes('--dry-run');

// ─── Load version.json ───────────────────────────────────────────────────────
const versionFile = path.join(ROOT, 'version.json');
if (!fs.existsSync(versionFile)) {
  console.error('❌  version.json not found at', versionFile);
  process.exit(1);
}
const { version, codename, channel, buildDate } = JSON.parse(fs.readFileSync(versionFile, 'utf8'));
const versionFull  = `${version} ${codename}`;        // "3.0.0 AURORA"
const versionLabel = `V${version}-${codename}`;       // "V3.0.0-AURORA"
const versionShort = `v${version}`;                   // "v3.0.0"

console.log(`\n🔖  Stamping Omnis ${versionFull} (${channel}) — built ${buildDate}`);
if (DRY_RUN) console.log('   [DRY RUN — no files will be written]\n');

// ─── Helper ───────────────────────────────────────────────────────────────────
function stampFile(relPath, replacements) {
  const full = path.join(ROOT, relPath);
  if (!fs.existsSync(full)) {
    console.warn(`   ⚠️  Not found, skipping: ${relPath}`);
    return;
  }
  let content = fs.readFileSync(full, 'utf8');
  let changed = 0;
  for (const [pattern, replacement] of replacements) {
    const before = content;
    content = content.replace(pattern, replacement);
    if (content !== before) changed++;
  }
  if (!DRY_RUN) fs.writeFileSync(full, content, 'utf8');
  const status = changed > 0 ? `✅  ${changed} replacement(s)` : '⚪  no changes';
  console.log(`   ${status} — ${relPath}`);
}

// ─── 1. package.json ──────────────────────────────────────────────────────────
{
  const pkgPath = path.join(ROOT, 'package.json');
  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
  if (pkg.version !== version) {
    pkg.version = version;
    if (!DRY_RUN) fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n', 'utf8');
    console.log(`   ✅  package.json → ${version}`);
  } else {
    console.log(`   ⚪  package.json already ${version}`);
  }
}

// ─── 2. systems/fleetrack/index.html ─────────────────────────────────────────
stampFile('systems/fleetrack/index.html', [
  // Top navbar version badge (id="ft-app-version")
  [
    /(<div\s+id="ft-app-version"[^>]*>)[^<]*/,
    `$1${versionLabel}`
  ],
  // About pane: "Operational Command Center vX.X.X"
  [
    /(Operational Command Center\s+)v[\d.]+/g,
    `$1${versionShort}`
  ],
  // About pane: version history first entry
  [
    /(<li><strong>)v[\d.]+(<\/strong>: Multi-channel)/,
    `$1${versionShort}$2`
  ],
  // Build Version in about pane (e.g. v2.4.5-STABLE)
  [
    /(<span style="font-weight: 700; color: #1e293b;">)v[\d.]+-\w+(<\/span>)/,
    `$1${versionLabel}$2`
  ],
  // Alert: "Version 1.0.0"
  [
    /(Version\s+)[\d.]+(\s*\\n)/g,
    `$1${version}$2`
  ],
]);

// ─── 3. systems/salestrack/index.html ────────────────────────────────────────
stampFile('systems/salestrack/index.html', [
  // Top navbar version badge (id="app-version-label")
  [
    /(<div\s+id="app-version-label"[^>]*>)[^<]*/,
    `$1${versionLabel}`
  ],
  // Settings sidebar: "4.2.0-stable" version span
  [
    /(<div><b>Version<\/b>\s*<span>)[^<]+(<\/span><\/div>)/,
    `$1${version}-${channel}$2`
  ],
  // Settings panel: large version display "4.2.0-stable"
  [
    /(<div style="color: #f1f5f9; font-size: 18px; font-weight: 700;">)[^<]+(<\/div>)/,
    `$1${version}-${channel}$2`
  ],
]);

// ─── 4. systems/powertrack/dashboard.html ────────────────────────────────────
stampFile('systems/powertrack/dashboard.html', [
  // OMNIS v1.2.0 PROD → OMNIS vX.X.X CODENAME
  [
    /OMNIS v[\d.]+\s+PROD/g,
    `OMNIS ${versionShort} ${codename}`
  ],
  // version-badge div
  [
    /(<div class="version-badge"[^>]*>)[^<]*(<\/div>)/,
    `$1${versionShort} ${codename}$2`
  ],
  // version history header (v1.2.0 Apr 2026)
  [
    /(<div style="font-weight: 800;">)v[\d.]+\s*\([^)]+\)(<\/div>)/,
    `$1${versionShort} (${buildDate})$2`
  ],
]);

// ─── 5. systems/powertrack/powertrack_index.html ─────────────────────────────
stampFile('systems/powertrack/powertrack_index.html', [
  [/OMNIS v[\d.]+\s+PROD/g, `OMNIS ${versionShort} ${codename}`],
  [/(Operational Command Center\s+)v[\d.]+/g, `$1${versionShort}`],
  [/(<li><strong>)v[\d.]+(<\/strong>: Multi-channel)/g, `$1${versionShort}$2`],
]);

// ─── 6. RELEASE_NOTES.md header ──────────────────────────────────────────────
{
  const rnPath = path.join(ROOT, 'RELEASE_NOTES.md');
  if (fs.existsSync(rnPath)) {
    let rn = fs.readFileSync(rnPath, 'utf8');
    const updatedHeader = `# Release Notes: Omnis v${versionFull}\n\n**Release Date:** ${buildDate}  \n**Version:** ${versionFull}  \n**Platform:** Windows (Electron)\n`;
    const headerPattern = /^# Release Notes:.*\n\n\*\*Release Date:\*\*.*\n\*\*Version:\*\*.*\n\*\*Platform:\*\*.*\n/;
    if (headerPattern.test(rn)) {
      rn = rn.replace(headerPattern, updatedHeader);
    } else {
      rn = updatedHeader + '\n' + rn.replace(/^# Release Notes:.*\n/, '');
    }
    if (!DRY_RUN) fs.writeFileSync(rnPath, rn, 'utf8');
    console.log(`   ✅  RELEASE_NOTES.md header updated`);
  }
}

console.log(`\n✅  Stamp complete — Omnis ${versionFull}\n`);
