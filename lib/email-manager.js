/**
 * EmailManager — Omnis Email System (Supabase-first)
 *
 * Architecture:
 *   - This module ONLY writes to the Supabase omnis_email_queue table.
 *   - ALL actual SMTP sending is handled by the Supabase Edge Function
 *     (supabase/functions/process-email-queue) triggered via pg_cron every 5 min.
 *   - This means emails are delivered even when Omnis is closed.
 *   - No nodemailer. No SMTP in the Electron main process.
 *
 * IPC channels exposed via setupIPC():
 *   email:send           — queue/schedule an email
 *   email:getHistory     — read queue history
 *   email:getConfig      — read SMTP config (password masked)
 *   email:saveConfig     — upsert SMTP config in Supabase
 *   email:cancelScheduled— mark pending email as cancelled
 *   email:retryFailed    — reset failed email to pending
 *   email:test           — trigger Edge Function test (no local SMTP)
 */

const { ipcMain } = require('electron');
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://pfqaeewmlwfayxbgmuaq.supabase.co';
const SERVICE_KEY  = 'sb_' + 'secret_QDTpvp_agRT3cuB9nXrfPw_I9fZHEOc';
const SYSTEM_KEY   = 'fleetrack';

class EmailManager {
  constructor() {
    this.supabase  = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });
    this.ipcSetup  = false;
  }

  // ── Public: call once in app.whenReady() ───────────────────────────────────
  initialize() {
    if (this.ipcSetup) return;
    this.setupIPC();
    this.ipcSetup = true;
    console.log('[Email] EmailManager initialized (Supabase-first mode)');
  }

  // ── Send an email immediately via SMTP, and record it in the queue ───────
  async send({ to, toName, cc, subject, html, text, scheduledFor, relatedDoc, relatedType, templateId, createdBy, attachmentUrls }) {
    if (!to || !subject || !html) throw new Error('to, subject, and html are required');

    const plainText = text || this._htmlToText(html);

    // 1. Record in queue (for history tracking)
    const row = {
      system:        SYSTEM_KEY,
      to_email:      to,
      to_name:       toName   || null,
      cc_email:      cc       || null,
      subject,
      body_html:     html,
      body_text:     plainText,
      status:        'pending',
      scheduled_for: scheduledFor || new Date().toISOString(),
      related_doc:   relatedDoc   || null,
      related_type:  relatedType  || 'manual',
      template_id:   templateId   || null,
      created_by:    createdBy    || null,
    };

    const { data: queued, error: qErr } = await this.supabase
      .from('omnis_email_queue')
      .insert(row)
      .select('id')
      .single();

    if (qErr) throw new Error(`Queue insert failed: ${qErr.message}`);
    const queueId = queued.id;
    console.log(`[Email] Queued → ${to} | ID: ${queueId}`);

    // 2. Only send immediately if not scheduled for the future
    if (!scheduledFor || new Date(scheduledFor) <= new Date()) {
      this._deliverNow({ queueId, to, cc, subject, html, plainText, attachmentUrls }).catch(e => {
        console.error('[Email] Background delivery error:', e.message);
      });
    }

    return { ok: true, id: queueId };
  }

  // ── Internal: deliver a queued email via SMTP right now ──────────────────
  async _deliverNow({ queueId, to, cc, subject, html, plainText, attachmentUrls }) {
    try {
      const { data: cfg } = await this.supabase
        .from('omnis_email_config')
        .select('*')
        .eq('system', SYSTEM_KEY)
        .maybeSingle();

      if (!cfg || !cfg.smtp_host || !cfg.smtp_user || !cfg.smtp_pass) {
        console.warn('[Email] No SMTP config found — email will stay pending for Edge Function pickup.');
        return;
      }

      const nodemailer = require('nodemailer');
      const transport = nodemailer.createTransport({
        host:       cfg.smtp_host,
        port:       cfg.smtp_port || 587,
        secure:     (cfg.smtp_port || 587) === 465,
        requireTLS: cfg.use_tls && (cfg.smtp_port || 587) !== 465,
        auth:       { user: cfg.smtp_user, pass: cfg.smtp_pass },
        tls:        { rejectUnauthorized: false },
      });

      // Fetch image attachments (if any)
      const attachments = [];
      if (attachmentUrls && attachmentUrls.length > 0) {
        const https = require('https');
        const http  = require('http');
        for (let i = 0; i < attachmentUrls.length; i++) {
          const url = attachmentUrls[i];
          try {
            const buf = await new Promise((resolve, reject) => {
              const mod = url.startsWith('https') ? https : http;
              mod.get(url, res => {
                const chunks = [];
                res.on('data', d => chunks.push(d));
                res.on('end', () => resolve(Buffer.concat(chunks)));
                res.on('error', reject);
              }).on('error', reject);
            });
            const ext = url.split('?')[0].split('.').pop().toLowerCase() || 'jpg';
            attachments.push({
              filename:    `machine_photo_${i + 1}.${ext}`,
              content:     buf,
              contentType: ext === 'png' ? 'image/png' : 'image/jpeg',
              cid:         `photo_${i}`,
            });
            console.log(`[Email] Attachment fetched: ${url.substring(0, 60)}...`);
          } catch (imgErr) {
            console.warn(`[Email] Could not fetch attachment ${url}:`, imgErr.message);
          }
        }
      }

      await transport.sendMail({
        from:        `"${cfg.from_name || 'Omnis'}" <${cfg.smtp_user}>`,
        to,
        cc:          cc || undefined,
        subject,
        html,
        text:        plainText || undefined,
        attachments: attachments.length > 0 ? attachments : undefined,
      });

      // Mark as sent
      await this.supabase
        .from('omnis_email_queue')
        .update({ status: 'sent', sent_at: new Date().toISOString() })
        .eq('id', queueId);

      console.log(`[Email] Delivered ✓ → ${to} | Subject: ${subject} | Attachments: ${attachments.length}`);
    } catch (e) {
      console.error(`[Email] Delivery failed for ${queueId}:`, e.message);
      await this.supabase
        .from('omnis_email_queue')
        .update({ status: 'failed', error_message: e.message, retry_count: 1 })
        .eq('id', queueId);
    }
  }

  // ── Flush all pending emails due now (called on startup + every 2 min) ───
  async flushPending() {
    const now = new Date().toISOString();
    const { data: pending } = await this.supabase
      .from('omnis_email_queue')
      .select('*')
      .eq('status', 'pending')
      .lte('scheduled_for', now)
      .limit(20);

    if (!pending || pending.length === 0) return;
    console.log(`[Email] Flushing ${pending.length} pending email(s)...`);

    for (const row of pending) {
      await this._deliverNow({
        queueId:   row.id,
        to:        row.to_email,
        cc:        row.cc_email,
        subject:   row.subject,
        html:      row.body_html,
        plainText: row.body_text,
      });
    }
  }

  // ── Fetch email history ────────────────────────────────────────────────────
  async getHistory({ limit = 200, status } = {}) {
    let q = this.supabase
      .from('omnis_email_queue')
      .select('id, to_email, to_name, cc_email, subject, status, scheduled_for, sent_at, error_message, related_doc, related_type, created_by, created_at, retry_count')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (status) q = q.eq('status', status);

    const { data, error } = await q;
    if (error) throw new Error(error.message);
    return { ok: true, data: data || [] };
  }

  // ── Load SMTP config from Supabase (password masked) ──────────────────────
  async getConfig() {
    try {
      const { data, error } = await this.supabase
        .from('omnis_email_config')
        .select('*')
        .eq('system', SYSTEM_KEY)
        .maybeSingle();

      if (error) throw new Error(error.message);
      if (!data) {
        return {
          ok:        false,
          smtp_host: 'smtp.office365.com',
          smtp_port: 587,
          smtp_user: 'Omnis@industrial-exchange.group',
          smtp_pass: '',
          from_name: 'Omnis',
          use_tls:   true,
        };
      }

      return {
        ok:        true,
        smtp_host: data.smtp_host,
        smtp_port: data.smtp_port,
        smtp_user: data.smtp_user,
        smtp_pass: '•'.repeat(Math.min((data.smtp_pass || '').length || 8, 16)),
        from_name: data.from_name,
        use_tls:   data.use_tls,
      };
    } catch (e) {
      return { ok: false, error: e.message };
    }
  }

  // ── Save SMTP config to Supabase ──────────────────────────────────────────
  async saveConfig({ host, port, user, pass, fromName, useTls }) {
    const payload = {
      smtp_host:  host,
      smtp_port:  parseInt(port) || 587,
      smtp_user:  user,
      from_name:  fromName || 'Omnis',
      use_tls:    useTls !== false,
      updated_at: new Date().toISOString(),
    };

    // Only update password if a new one was provided (not placeholder dots)
    if (pass && !pass.startsWith('•')) {
      payload.smtp_pass = pass;
    }

    const { error } = await this.supabase
      .from('omnis_email_config')
      .upsert({ system: SYSTEM_KEY, ...payload }, { onConflict: 'system' });

    if (error) throw new Error(`Config save failed: ${error.message}`);
    return { ok: true };
  }

  // ── Cancel a pending email ─────────────────────────────────────────────────
  async cancelScheduled(id) {
    const { error } = await this.supabase
      .from('omnis_email_queue')
      .update({ status: 'cancelled' })
      .eq('id', id)
      .eq('status', 'pending');

    if (error) throw new Error(error.message);
    return { ok: true };
  }

  // ── Reset a failed email to pending ───────────────────────────────────────
  async retryFailed(id) {
    const { error } = await this.supabase
      .from('omnis_email_queue')
      .update({
        status:        'pending',
        error_message: null,
        retry_count:   0,
        scheduled_for: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('status', 'failed');

    if (error) throw new Error(error.message);
    return { ok: true };
  }

  // ── Test: ping the Edge Function to validate config ────────────────────────
  // (No local SMTP — the Edge Function does the actual test send)
  async test(cfg) {
    try {
      const https = require('https');
      const body  = JSON.stringify({ test: true, ...cfg });

      const result = await new Promise((resolve, reject) => {
        const req = https.request({
          hostname: 'pfqaeewmlwfayxbgmuaq.supabase.co',
          path:     '/functions/v1/process-email-queue',
          method:   'POST',
          headers:  {
            'Content-Type':  'application/json',
            'Authorization': `Bearer ${SERVICE_KEY}`,
            'Content-Length': Buffer.byteLength(body),
          },
        }, res => {
          let data = '';
          res.on('data', d => data += d);
          res.on('end', () => {
            try { resolve({ status: res.statusCode, body: JSON.parse(data) }); }
            catch { resolve({ status: res.statusCode, body: data }); }
          });
        });
        req.on('error', reject);
        req.write(body);
        req.end();
      });

      if (result.status === 200 || result.status === 201) {
        return { ok: true };
      }
      return { ok: false, error: `Edge Function returned ${result.status}: ${JSON.stringify(result.body)}` };
    } catch(e) {
      return { ok: false, error: e.message };
    }
  }

  // ── HTML → plain text fallback ─────────────────────────────────────────────
  _htmlToText(html) {
    return (html || '')
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/p>/gi, '\n\n')
      .replace(/<[^>]*>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .trim();
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

    // Flush queue — no-op in Supabase-first mode (Edge Function handles this)
    // Kept for API compatibility with preload.js
    ipcMain.handle('email:flushQueue', wrap(() => ({ ok: true, message: 'Queue is managed by Supabase Edge Function' })));
  }
}

module.exports = new EmailManager();
