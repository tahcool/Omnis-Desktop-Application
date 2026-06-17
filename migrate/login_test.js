#!/usr/bin/env node
/**
 * Frappe Login Helper
 * Uses username/password to get a session cookie, then tests API access.
 *
 * Usage:
 *   node migrate/login_test.js --usr Administrator --pwd YOUR_PASSWORD
 *   node migrate/login_test.js --usr Administrator --pwd YOUR_PASSWORD --save
 *
 * With --save: writes credentials to migrate/.frappe_creds.json for use
 *              by the discovery and export scripts.
 */

const axios  = require('axios');
const https  = require('https');
const fs     = require('fs');
const path   = require('path');

const FRAPPE_URL = 'https://fleetrack.machinery-exchange.com';
const CREDS_FILE = path.join(__dirname, '.frappe_creds.json');

const args = {};
process.argv.slice(2).forEach((a, i, arr) => {
  if (a.startsWith('--')) args[a.slice(2)] = arr[i + 1] ?? true;
});

const http = axios.create({
  baseURL: FRAPPE_URL,
  httpsAgent: new https.Agent({ rejectUnauthorized: false }),
  timeout: 15000,
  withCredentials: true,
});

async function tryPasswordLogin(usr, pwd) {
  console.log(`\n🔑 Trying password login as "${usr}"...`);
  const res = await http.post('/api/method/login', null, {
    params: { usr, pwd },
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
  });

  const setCookie = res.headers['set-cookie'] || [];
  const sid = setCookie.map(c => c.split(';')[0]).find(c => c.startsWith('sid='));
  if (!sid || sid === 'sid=Guest') throw new Error('Login failed — check credentials');

  console.log('   ✅ Session obtained');
  return { sid, cookie: setCookie.map(c => c.split(';')[0]).join('; ') };
}

async function tryTokenLogin(key, secret) {
  console.log(`\n🔑 Trying token auth...`);
  const res = await http.get('/api/method/frappe.auth.get_logged_user', {
    headers: { Authorization: `token ${key}:${secret}` }
  });
  if (res.data.message) {
    console.log(`   ✅ Token valid. Logged in as: ${res.data.message}`);
    return { type: 'token', key, secret };
  }
  throw new Error('Token auth failed');
}

async function testAccess(authHeaders) {
  console.log('\n📋 Testing doctype access...');
  const res = await http.get('/api/resource/DocType', {
    params: { fields: '["name"]', limit_page_length: 5 },
    headers: authHeaders
  });
  const count = (res.data.data || []).length;
  console.log(`   ✅ Can list doctypes: ${count} returned`);

  // Test specific FT doctypes
  for (const dt of ['FT Machine', 'FT Breakdown Log', 'FT Job Card', 'FT MCA']) {
    try {
      const r = await http.get(`/api/resource/${encodeURIComponent(dt)}`, {
        params: { fields: '["name"]', limit_page_length: 1 },
        headers: authHeaders
      });
      const n = (r.data.data || []).length;
      const status = n > 0 ? 'has data' : 'may be empty or zero';
      console.log(`   ✅ ${dt}: accessible (${status})`);
    } catch (e) {
      console.log(`   ❌ ${dt}: ${e.response?.data?.exc_type || e.message}`);
    }
  }
}

async function main() {
  let authHeaders = {};
  let creds = {};

  // Try API token first
  if (args.key && args.secret) {
    try {
      const r = await tryTokenLogin(args.key, args.secret);
      authHeaders = { Authorization: `token ${args.key}:${args.secret}` };
      creds = { type: 'token', key: args.key, secret: args.secret };
    } catch { /* fall through */ }
  }

  // Try password login
  if (!Object.keys(authHeaders).length && args.usr && args.pwd) {
    try {
      const { cookie } = await tryPasswordLogin(args.usr, args.pwd);
      authHeaders = { Cookie: cookie };
      creds = { type: 'cookie', cookie, usr: args.usr };
    } catch (e) {
      console.error(`\n❌ Login failed: ${e.message}\n`);
      process.exit(1);
    }
  }

  if (!Object.keys(authHeaders).length) {
    console.error('\n❌ Provide credentials:');
    console.error('   Token:    --key API_KEY --secret API_SECRET');
    console.error('   Password: --usr Administrator --pwd YOUR_PASSWORD\n');
    process.exit(1);
  }

  await testAccess(authHeaders);

  if (args.save) {
    fs.writeFileSync(CREDS_FILE, JSON.stringify({ ...creds, authHeaders }, null, 2));
    console.log(`\n💾 Credentials saved to ${CREDS_FILE}`);
    console.log('   Now run: node migrate/1_discover.js\n');
  } else {
    console.log('\n📌 Add --save to persist credentials for discover/export scripts\n');
  }
}

main().catch(e => {
  console.error('\n❌', e.response?.data?.exc || e.message);
  process.exit(1);
});
