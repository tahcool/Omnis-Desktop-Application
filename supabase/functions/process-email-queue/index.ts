// Supabase Edge Function: process-email-queue
// Deploy: supabase functions deploy process-email-queue
// Triggered by pg_cron every 5 minutes (see SQL below).
//
// pg_cron setup (run once in Supabase SQL editor):
//
//   SELECT cron.schedule(
//     'process-email-queue',
//     '*/5 * * * *',
//     $$
//       SELECT net.http_post(
//         url    := 'https://pfqaeewmlwfayxbgmuaq.supabase.co/functions/v1/process-email-queue',
//         headers := jsonb_build_object(
//           'Authorization', 'Bearer ' || current_setting('app.service_role_key', true),
//           'Content-Type', 'application/json'
//         ),
//         body   := '{}'::jsonb
//       );
//     $$
//   );
//
// NOTE: pg_net extension must be enabled:
//   CREATE EXTENSION IF NOT EXISTS pg_net;

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import nodemailer from "npm:nodemailer";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY  = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

Deno.serve(async (req) => {
  // Guard: only allow calls with service role authorization
  const authHeader = req.headers.get("Authorization") || "";
  if (!authHeader.includes("Bearer ")) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
  }

  const sb = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });

  try {
    // 1. Load SMTP config
    const { data: cfg, error: cfgErr } = await sb
      .from("omnis_email_config")
      .select("*")
      .eq("system", "fleetrack")
      .maybeSingle();

    if (cfgErr || !cfg) {
      return new Response(JSON.stringify({ error: "No email config found" }), { status: 500 });
    }

    // 2. Fetch pending emails due now
    const now = new Date().toISOString();
    const { data: pending, error: qErr } = await sb
      .from("omnis_email_queue")
      .select("*")
      .eq("status", "pending")
      .lte("scheduled_for", now)
      .limit(20);

    if (qErr) throw new Error(qErr.message);
    if (!pending || pending.length === 0) {
      return new Response(JSON.stringify({ sent: 0, message: "Nothing due" }), { status: 200 });
    }

    // 3. Create SMTP transport
    const transport = nodemailer.createTransport({
      host:       cfg.smtp_host,
      port:       cfg.smtp_port,
      secure:     cfg.smtp_port === 465,
      requireTLS: cfg.use_tls && cfg.smtp_port !== 465,
      auth:       { user: cfg.smtp_user, pass: cfg.smtp_pass },
      tls:        { rejectUnauthorized: false },
    });

    let sent = 0;
    const errors: string[] = [];

    // 4. Send each one
    for (const row of pending) {
      try {
        await transport.sendMail({
          from:    `"${cfg.from_name || "Omnis"}" <${cfg.smtp_user}>`,
          to:      row.to_email,
          cc:      row.cc_email || undefined,
          subject: row.subject,
          html:    row.body_html,
          text:    row.body_text || undefined,
        });

        await sb
          .from("omnis_email_queue")
          .update({ status: "sent", sent_at: new Date().toISOString() })
          .eq("id", row.id);

        sent++;
      } catch (e: any) {
        errors.push(`${row.id}: ${e.message}`);
        await sb
          .from("omnis_email_queue")
          .update({
            status:        "failed",
            error_message: e.message,
            retry_count:   (row.retry_count || 0) + 1,
          })
          .eq("id", row.id);
      }
    }

    return new Response(
      JSON.stringify({ sent, errors: errors.length, details: errors }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );

  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500 });
  }
});
