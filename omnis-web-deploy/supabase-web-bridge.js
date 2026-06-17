/**
 * Supabase Web Bridge
 * Replaces the Electron IPC bridge (window.electron.invoke) with a direct
 * browser-side Supabase JS SDK implementation.
 *
 * This file must be loaded BEFORE index.html's main scripts.
 * It patches window.electron so all callFrappe / supaQuery calls work in a browser.
 *
 * ─── CONFIG ─────────────────────────────────────────────────────────────────
 * Replace SUPABASE_ANON_KEY with your project's anon (public) key from:
 *   https://supabase.com/dashboard/project/pfqaeewmlwfayxbgmuaq/settings/api
 * ─────────────────────────────────────────────────────────────────────────────
 */
const _WEB_SUPABASE_URL = 'https://pfqaeewmlwfayxbgmuaq.supabase.co';
const _WEB_SUPABASE_KEY = 'REPLACE_WITH_ANON_KEY'; // ← paste anon key here

// ── Bootstrap Supabase JS SDK from CDN ───────────────────────────────────────
(function() {
  if (typeof window.__supabaseClient !== 'undefined') return; // already loaded

  // We rely on the <script> tag in index.html loading the SDK;
  // the client is initialised below once the SDK is available.
  function initClient() {
    if (typeof window.supabase === 'undefined' || typeof window.supabase.createClient !== 'function') {
      // Supabase SDK not yet loaded — retry in 50ms
      setTimeout(initClient, 50);
      return;
    }
    window.__supabaseClient = window.supabase.createClient(_WEB_SUPABASE_URL, _WEB_SUPABASE_KEY, {
      auth: {
        autoRefreshToken:   true,
        persistSession:     true,
        detectSessionInUrl: true,
        storageKey:         'ft_sb_session'
      }
    });
    console.log('[WebBridge] Supabase client initialised');
    // Dispatch event so any waiting code can proceed
    window.dispatchEvent(new Event('supabase:ready'));
  }
  initClient();
})();

// ── Helper: execute a supabase:query payload using the SDK directly ───────────
async function _webSupabaseQuery({ table, method, params, data }) {
  const sb = window.__supabaseClient;
  if (!sb) throw new Error('Supabase client not ready');
  params = params || {};

  let query = sb.from(table);

  if (method === 'select') {
    query = query.select(params.columns || '*', params.options || {});
    if (params.filters && typeof params.filters === 'object') {
      for (const [col, val] of Object.entries(params.filters)) {
        if (val !== undefined && val !== null && val !== '') query = query.eq(col, val);
      }
    }
    if (params.match)  query = query.match(params.match);
    if (params.order)  query = query.order(params.order.column, { ascending: params.order.ascending ?? true });
    if (params.limit)  query = query.limit(params.limit);
    if (params.range)  query = query.range(params.range.from, params.range.to);
    if (params.or)     query = query.or(params.or);

  } else if (method === 'getOne') {
    query = query.select('*');
    if (params.name) query = query.eq('name', params.name);
    else if (params.id) query = query.eq('id', params.id);
    const result = await query.maybeSingle();
    return { ok: !result.error, data: result.data, error: result.error?.message };

  } else if (method === 'insert') {
    query = query.insert(params.data || data).select();

  } else if (method === 'update') {
    const updates = params.data || data;
    query = query.update(updates);
    if (params.name)  query = query.eq('name', params.name);
    else if (params.id) query = query.eq('id', params.id);
    else if (params.match) query = query.match(params.match);
    query = query.select();

  } else if (method === 'upsert') {
    query = query.upsert(params.data || data, params.options || {}).select();

  } else if (method === 'delete') {
    query = query.delete();
    if (params.name)  query = query.eq('name', params.name);
    else if (params.id) query = query.eq('id', params.id);
    else if (params.match) query = query.match(params.match);
  }

  const result = await query;
  return { ok: !result.error, data: result.data, count: result.count, error: result.error?.message };
}

// ── Patch window.electron to intercept IPC calls ─────────────────────────────
window.electron = window.electron || {};

const _originalElectronInvoke = window.electron.invoke;

window.electron.invoke = async function(channel, payload) {
  // ── Supabase query ────────────────────────────────────────────────────────
  if (channel === 'supabase:query') {
    try {
      return await _webSupabaseQuery(payload);
    } catch (err) {
      console.error('[WebBridge] supabase:query error:', err);
      return { ok: false, error: err.message };
    }
  }

  // ── Supabase sign-out ─────────────────────────────────────────────────────
  if (channel === 'supabase:signOut') {
    try {
      const sb = window.__supabaseClient;
      if (sb) await sb.auth.signOut();
      localStorage.removeItem('ft_sb_session');
      return { ok: true };
    } catch (err) {
      return { ok: false, error: err.message };
    }
  }

  // ── Supabase storage upload ────────────────────────────────────────────────
  if (channel === 'supabase:storage:upload' || channel === 'storage:upload') {
    try {
      const sb = window.__supabaseClient;
      const { bucket, path: filePath, fileBuffer, contentType } = payload;
      const buf = new Uint8Array(fileBuffer);
      const { data, error } = await sb.storage.from(bucket).upload(filePath, buf, {
        contentType: contentType || 'application/octet-stream',
        upsert: true
      });
      if (error) return { ok: false, error: error.message };
      const { data: urlData } = await sb.storage.from(bucket).createSignedUrl(filePath, 60 * 60 * 24 * 365 * 10);
      return { ok: true, path: data.path, url: urlData?.signedUrl || '' };
    } catch (err) {
      return { ok: false, error: err.message };
    }
  }

  // ── Window controls (no-op in browser) ───────────────────────────────────
  if (['window:minimize','window:maximize','window:close'].includes(channel)) {
    return { ok: true };
  }

  // ── App version ───────────────────────────────────────────────────────────
  if (channel === 'app:getVersion' || channel === 'get-app-version') {
    return { version: '3.1.0', codename: 'AURORA', channel: 'web', buildDate: '' };
  }

  // ── Frappe request — blocked in web mode ─────────────────────────────────
  if (channel === 'frappe:request') {
    console.warn('[WebBridge] frappe:request blocked in web mode');
    return { ok: false, error: 'Frappe requests not available in web mode' };
  }

  // ── Anything else: no-op ──────────────────────────────────────────────────
  console.warn('[WebBridge] Unhandled channel:', channel);
  return { ok: false, error: 'Not implemented in web mode: ' + channel };
};

// ── Login helper for web mode ─────────────────────────────────────────────────
window._webLogin = async function(email, password) {
  const sb = window.__supabaseClient;
  if (!sb) { alert('Supabase not ready — please wait and try again.'); return; }

  const { data, error } = await sb.auth.signInWithPassword({ email, password });
  if (error) {
    console.error('[WebBridge] Login error:', error.message);
    return { ok: false, error: error.message };
  }

  // Persist to localStorage (same keys the Electron app uses)
  const session = data.session;
  localStorage.setItem('supabase_access_token',  session.access_token);
  localStorage.setItem('supabase_refresh_token', session.refresh_token);
  localStorage.setItem('ft_user_email', data.user.email);

  return { ok: true, user: data.user, session };
};

console.log('[WebBridge] Electron bridge patched for web deployment.');
