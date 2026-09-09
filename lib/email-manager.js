/**
 * EmailManager — Omnis Email System (Edge Function-first)
 *
 * Architecture:
 *   - This module submits email requests through the email-submit Edge Function.
 *   - The Edge Function validates the caller's JWT and company scope.
 *   - ALL actual SMTP sending is handled by the Supabase Edge Function
 *     (supabase/functions/process-email-queue) triggered via pg_cron every 5 min.
 *   - This means emails are delivered even when Omnis is closed.
 *   - No SUPABASE_SERVICE_KEY or SMTP credentials are loaded in the Electron process.
 *
 * IPC channels exposed via setupIPC():
 *   email:send           — queue/schedule an email (via Edge Function)
 *   email:getHistory     — read queue history (via Edge Function)
 *   email:getConfig      — read SMTP config (via Edge Function, password masked)
 *   email:saveConfig     — upsert SMTP config (via Edge Function)
 *   email:cancelScheduled— mark pending email as cancelled (via Edge Function)
 *   email:retryFailed    — reset failed email to pending (via Edge Function)
 *   email:test           — trigger Edge Function test (no local SMTP)
 */

const { ipcMain } = require('electron');
const { v4: uuidv4 } = require('uuid');

class EmailManager {
  constructor() {
    // supabase client is injected via setSupabase() from main.js
    // It uses the anon key + user session — never a service role key.
    this.supabase = null;
    this.ipcSetup = false;
  }

  // ── Public: inject the supabase client from main.js ─────────────────────
  setSupabase(sb) {
    this.supabase = sb;
  }

  // ── Public: call once in app.whenReady() ───────────────────────────────────
  initialize() {
    if (this.ipcSetup) return;
    this.setupIPC();
    this.ipcSetup = true;
    console.log('[Email] EmailManager initialized (Edge Function mode — no local service key)');
  }

  // ── Helpers ─────────────────────────────────────────────────────────────────

  async _ensureAuth() {
    if (!this.supabase) {
      throw new Error('EmailManager not initialized — call setSupabase() first');
    }
    const { data } = await this.supabase.auth.getSession();
    if (!data?.session?.access_token) {
      throw new Error('Not authenticated. Please sign in first.');
    }
    return data.session;
  }

  async _invokeEmailFunction(action, params = {}) {
    await this._ensureAuth();

    const { data: result, error } = await this.supabase.functions.invoke('email-submit', {
      body: { action, ...params },
    });

    if (error) {
      const errBody = typeof error === 'object' && error.context ? error.context : error;
      const message = errBody?.error || errBody?.message || error.message || 'Email operation failed';
      throw new Error(message);
    }

    return result;
  }

  // ── Send an email via Edge Function ─────────────────────────────────────
  async send({ to, toName, cc, subject, html, text, scheduledFor, relatedDoc, relatedType, templateId, createdBy, system }) {
    if (!to || !subject || !html) throw new Error('to, subject, and html are required');

    // Generate idempotency key to prevent duplicates
    const idempotencyKey = uuidv4();

    const result = await this._invokeEmailFunction('send', {
      to,
      toName: toName || null,
      cc: cc || null,
      subject,
      html,
      text: text || null,
      scheduledFor: scheduledFor || null,
      relatedDoc: relatedDoc || null,
      relatedType: relatedType || 'manual',
      templateId: templateId || null,
      system: system || 'fleetrack',
      idempotencyKey,
    });

    if (!result?.ok) {
      throw new Error(result?.error || 'Email submission failed');
    }

    console.log(`[Email] Queued → ${to} | ID: ${result.id}${result.duplicate ? ' (duplicate)' : ''}`);
    return { ok: true, id: result.id, duplicate: result.duplicate || false };
  }

  // ── Fetch email history ────────────────────────────────────────────────────
  async getHistory({ limit = 200, status } = {}) {
    const result = await this._invokeEmailFunction('getHistory', { limit, status });
    if (!result?.ok) throw new Error(result?.error || 'Failed to fetch history');
    return { ok: true, data: result.data || [] };
  }

  // ── Load SMTP config (password masked) ──────────────────────────────────
  async getConfig() {
    try {
      const result = await this._invokeEmailFunction('getConfig', {});
      return result;
    } catch (e) {
      return { ok: false, error: e.message };
    }
  }

  // ── Save SMTP config ──────────────────────────────────────────
  async saveConfig({ host, port, user, pass, fromName, useTls }) {
    const result = await this._invokeEmailFunction('saveConfig', {
      host, port, user, pass, fromName, useTls,
    });
    if (!result?.ok) throw new Error(result?.error || 'Config save failed');
    return { ok: true };
  }

  // ── Cancel a pending email ─────────────────────────────────────────────────
  async cancelScheduled(id) {
    const result = await this._invokeEmailFunction('cancelScheduled', { id });
    if (!result?.ok) throw new Error(result?.error || 'Cancel failed');
    return { ok: true };
  }

  // ── Reset a failed email to pending ───────────────────────────────────────
  async retryFailed(id) {
    const result = await this._invokeEmailFunction('retryFailed', { id });
    if (!result?.ok) throw new Error(result?.error || 'Retry failed');
    return { ok: true };
  }

  // ── Test: trigger Edge Function test ──────────────────────────────────────
  async test(cfg) {
    try {
      const result = await this._invokeEmailFunction('test', cfg || {});
      return result;
    } catch (e) {
      return { ok: false, error: e.message };
    }
  }

  // ── IPC Channel Registration ───────────────────────────────────────────────
  setupIPC() {
    const wrap = fn => async (event, ...args) => {
      try { return await fn(...args); }
      catch(e) { console.error('[Email IPC]', e.message); return { ok: false, error: e.message }; }
    };

    // Queue/schedule an email
    ipcMain.handle('email:send', wrap(opts => this.send(opts)));

    // Fetch history
    ipcMain.handle('email:getHistory', wrap(opts => this.getHistory(opts)));

    // Read SMTP config (masked password)
    ipcMain.handle('email:getConfig', wrap(() => this.getConfig()));

    // Save SMTP config
    ipcMain.handle('email:saveConfig', wrap(cfg => this.saveConfig(cfg)));

    // Cancel pending
    ipcMain.handle('email:cancelScheduled', wrap(id => this.cancelScheduled(id)));

    // Retry failed
    ipcMain.handle('email:retryFailed', wrap(id => this.retryFailed(id)));

    // Test (pings Edge Function)
    ipcMain.handle('email:test', wrap(cfg => this.test(cfg)));

    // Flush queue — handled by Edge Function (pg_cron)
    ipcMain.handle('email:flushQueue', wrap(() => ({ ok: true, message: 'Queue is managed by Supabase Edge Function' })));
  }
}

module.exports = new EmailManager();
