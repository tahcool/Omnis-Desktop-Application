// Supabase Edge Function: daily-quote-reminders
// Deploy: supabase functions deploy daily-quote-reminders
// Triggered by pg_cron daily at 8:00 AM.
//
// pg_cron setup (run once in Supabase SQL editor):
//
//   SELECT cron.schedule(
//     'daily-quote-reminders',
//     '0 8 * * *',
//     $$
//       SELECT net.http_post(
//         url    := 'https://pfqaeewmlwfayxbgmuaq.supabase.co/functions/v1/daily-quote-reminders',
//         headers := jsonb_build_object(
//           'Authorization', 'Bearer ' || current_setting('app.service_role_key', true),
//           'Content-Type', 'application/json'
//         ),
//         body   := '{}'::jsonb
//       );
//     $$
//   );

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY  = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

// MAPPINGS (Dynamically fetched from omnis_sales_persons)

const MANAGEMENT_CC = [
  "takunda@industrial-exchange.group",
  "antony@industrial-exchange.group",
  "rutendo@industrial-exchange.group",
  "brendan@industrial-exchange.group"
].join(",");

const BRANDING = {
  MXG: {
    name: "Machinery Exchange",
    color: "#c92222",
    logo: "https://pfqaeewmlwfayxbgmuaq.supabase.co/storage/v1/object/public/public-assets/logos/mxg-logo.png"
  },
  SPZ: {
    name: "Sinopower",
    color: "#7b1515",
    logo: "https://pfqaeewmlwfayxbgmuaq.supabase.co/storage/v1/object/public/public-assets/logos/spz-logo.png"
  }
};

function getBranding(company: string) {
  if (!company) return BRANDING.MXG;
  if (company.toLowerCase().includes("sinopower")) return BRANDING.SPZ;
  return BRANDING.MXG;
}

Deno.serve(async (req) => {
  const authHeader = req.headers.get("Authorization") || "";
  if (!authHeader.includes("Bearer ")) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
  }

  // Parse body
  let bodyQuoteNames: string[] | null = null;
  let isOverdueDispatch = false;
  try {
    const body = await req.json().catch(() => ({}));
    if (body.quote_names && Array.isArray(body.quote_names) && body.quote_names.length > 0) {
      bodyQuoteNames = body.quote_names;
    }
    if (body.overdue === true) {
      isOverdueDispatch = true;
    }
  } catch (_) { /* no body */ }

  const sb = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });

  try {
    // 1. Fetch sales persons
    const { data: salesPersons, error: spErr } = await sb
      .from("omnis_sales_persons")
      .select("*")
      .eq("is_active", true);

    if (spErr) throw new Error(spErr.message);

    // 2. Fetch quotes from lifecycle table
    const today = new Date().toISOString().split('T')[0];
    
    const { data: allLifecycles, error: qErr } = await sb
      .from("omnis_quote_lifecycle")
      .select("*, frappe_quotation(name, title, customer_name, transaction_date, custom_sales_person, status, company)")
      .eq("is_closed", false);

    if (qErr) throw new Error(qErr.message);

    if (!allLifecycles || allLifecycles.length === 0) {
      return new Response(JSON.stringify({ message: "No quotes found." }), { status: 200 });
    }

    // Filter based on mode
    let dueLifecycles: any[];
    if (bodyQuoteNames) {
      // Selective: dispatch exactly these quote names (works for both due & overdue)
      dueLifecycles = allLifecycles.filter((ql: any) => bodyQuoteNames!.includes(ql.quote_name));
    } else if (isOverdueDispatch) {
      // Overdue: past due + no entry logged for current stage
      dueLifecycles = allLifecycles.filter((ql: any) => {
        const due = ql.current_stage === 1 ? ql.stage_1_due : (ql.current_stage === 2 ? ql.stage_2_due : ql.stage_3_due);
        if (!due || due >= today) return false;
        const loggedAt = ql.current_stage === 1 ? ql.stage_1_logged_at : (ql.current_stage === 2 ? ql.stage_2_logged_at : ql.stage_3_logged_at);
        return !loggedAt;
      });
    } else {
      // Default daily: due exactly today
      dueLifecycles = allLifecycles.filter((ql: any) => {
        const due = ql.current_stage === 1 ? ql.stage_1_due : (ql.current_stage === 2 ? ql.stage_2_due : ql.stage_3_due);
        return due === today;
      });
    }

    if (dueLifecycles.length === 0) {
      return new Response(JSON.stringify({ message: "No matching quotes to dispatch." }), { status: 200 });
    }

    // 3. Group by Sales Person → Company
    const groups: Record<string, Record<string, any[]>> = {};
    for (const ql of dueLifecycles) {
      const q = ql.frappe_quotation || {};
      if (!q.name) continue;
      const sp = q.custom_sales_person || "Unassigned";
      const comp = q.company || "Machinery Exchange";
      if (!groups[sp]) groups[sp] = {};
      if (!groups[sp][comp]) groups[sp][comp] = [];
      groups[sp][comp].push(ql);
    }

    // 4. Build emails & queue
    let emailsQueued = 0;
    const currentDateStr = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' });

    for (const [spName, companies] of Object.entries(groups)) {
      const spObj = salesPersons?.find((p: any) => p.name === spName);
      const spEmail = spObj?.email;
      if (!spEmail) {
        console.warn(`No email mapping found for: ${spName}`);
        continue;
      }

      for (const [companyName, companyQuotes] of Object.entries(companies)) {
        const brand = getBranding(companyName);

        // ── Build table rows ──────────────────────────────────────────────────
        let tableRows = "";
        for (const ql of companyQuotes) {
          const q = ql.frappe_quotation;
          const dt = q.transaction_date ? new Date(q.transaction_date).toLocaleDateString('en-GB') : '-';
          const due = ql.current_stage === 1 ? ql.stage_1_due : (ql.current_stage === 2 ? ql.stage_2_due : ql.stage_3_due);
          const fup = due ? new Date(due).toLocaleDateString('en-GB') : '-';

          if (isOverdueDispatch) {
            const daysOver = due ? Math.floor((new Date().getTime() - new Date(due).getTime()) / 86400000) : 0;
            const urgencyColor = daysOver > 14 ? '#b91c1c' : (daysOver > 7 ? '#d97706' : '#ef4444');
            tableRows += `
              <tr style="background:${daysOver > 14 ? '#fff5f5' : '#fffbeb'};">
                <td style="padding:12px;border-bottom:1px solid #fee2e2;font-size:13px;font-weight:600;">
                  <a href="https://pfqaeewmlwfayxbgmuaq.supabase.co/functions/v1/omnis-link?quote=${q.name}" style="color:#dc2626;text-decoration:none;">${q.name}</a>
                </td>
                <td style="padding:12px;border-bottom:1px solid #fee2e2;font-size:13px;color:#334155;">${q.customer_name || '-'}</td>
                <td style="padding:12px;border-bottom:1px solid #fee2e2;font-size:13px;color:#334155;">
                  <span style="display:inline-block;padding:2px 8px;background:#fee2e2;color:#991b1b;border-radius:12px;font-size:11px;font-weight:700;">Stage ${ql.current_stage}</span>
                </td>
                <td style="padding:12px;border-bottom:1px solid #fee2e2;font-size:13px;color:#94a3b8;">${fup}</td>
                <td style="padding:12px;border-bottom:1px solid #fee2e2;font-size:13px;font-weight:800;color:${urgencyColor};">${daysOver}d overdue</td>
              </tr>`;
          } else {
            tableRows += `
              <tr>
                <td style="padding:12px;border-bottom:1px solid #e2e8f0;font-size:13px;font-weight:600;">
                  <a href="https://pfqaeewmlwfayxbgmuaq.supabase.co/functions/v1/omnis-link?quote=${q.name}" style="color:#2563eb;text-decoration:none;">${q.name}</a>
                </td>
                <td style="padding:12px;border-bottom:1px solid #e2e8f0;font-size:13px;color:#334155;">${q.title || '-'}</td>
                <td style="padding:12px;border-bottom:1px solid #e2e8f0;font-size:13px;color:#334155;">${q.customer_name || '-'}</td>
                <td style="padding:12px;border-bottom:1px solid #e2e8f0;font-size:13px;color:#334155;">${dt}</td>
                <td style="padding:12px;border-bottom:1px solid #e2e8f0;font-size:13px;color:#334155;">
                  <span style="display:inline-block;padding:2px 8px;background:#f1f5f9;border-radius:12px;font-size:11px;font-weight:600;">Stage ${ql.current_stage}</span>
                </td>
                <td style="padding:12px;border-bottom:1px solid #e2e8f0;font-size:13px;font-weight:700;color:#ef4444;">${fup}</td>
              </tr>`;
          }
        }

        // ── Build email HTML ──────────────────────────────────────────────────
        let emailHtml: string;
        let emailSubject: string;
        let emailText: string;
        const isSPZ = companyName.toLowerCase().includes("sinopower");

        if (isOverdueDispatch) {
          emailSubject = `⚠️ OVERDUE QUOTES — Action Required: ${companyQuotes.length} Quote(s) — ${brand.name}`;
          emailText = `URGENT: You have ${companyQuotes.length} overdue quotation(s) for ${brand.name} with no follow-up entry. Immediate action is required.`;

          if (isSPZ) {
            // ─── SPZ OVERDUE TEMPLATE — deep maroon / power-industrial ───────
            emailHtml = `
            <!DOCTYPE html><html><head><meta charset="utf-8"></head>
            <body style="margin:0;padding:24px;font-family:Arial,'Helvetica Neue',sans-serif;background:#0a0010;">
            <div style="max-width:940px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 8px 40px rgba(123,21,21,0.45);">

              <!-- TOP STRIPE -->
              <div style="height:6px;background:linear-gradient(90deg,#7b1515,#c92222,#7b1515);"></div>

              <!-- URGENT BANNER -->
              <div style="background:#1a0020;padding:14px 32px;display:flex;align-items:center;gap:14px;border-bottom:2px solid #7b1515;">
                <span style="font-size:28px;">🚨</span>
                <div>
                  <div style="font-size:14px;font-weight:900;color:#f5a0a0;text-transform:uppercase;letter-spacing:.15em;">CRITICAL — OVERDUE ACTION REQUIRED</div>
                  <div style="font-size:11px;color:#c084c8;margin-top:3px;">Sinopower | Sales Follow-Up Compliance Alert | ${currentDateStr}</div>
                </div>
              </div>

              <!-- BRAND HEADER -->
              <table style="width:100%;border-collapse:collapse;background:linear-gradient(135deg,#4a0020 0%,#7b1515 50%,#4a0020 100%);" cellpadding="0" cellspacing="0"><tr>
                <td style="padding:24px 32px;vertical-align:middle;width:45%;">
                  <img src="${brand.logo}" alt="${brand.name}" style="display:block;height:100px;width:auto;max-width:260px;filter:drop-shadow(0 2px 8px rgba(0,0,0,0.5));opacity:0.9;">
                </td>
                <td style="padding:24px 32px;vertical-align:middle;text-align:right;width:55%;">
                  <div style="font-size:11px;color:#c084c8;text-transform:uppercase;letter-spacing:.2em;font-weight:800;margin-bottom:6px;">Sinopower Zimbabwe</div>
                  <div style="font-size:20px;font-weight:900;color:#fff;letter-spacing:-0.5px;">Overdue Follow-Up Alert</div>
                  <div style="font-size:11px;color:#fca5a5;margin-top:6px;font-weight:700;">${companyQuotes.length} QUOTATION(S) REQUIRE IMMEDIATE ATTENTION</div>
                </td>
              </tr></table>

              <!-- BODY -->
              <div style="padding:28px 32px 16px;background:linear-gradient(180deg,#fff0ff 0%,#fff5f5 100%);border-bottom:1px solid #e9b8ff;">
                <p style="margin:0;font-size:15px;color:#4a0020;line-height:1.8;font-weight:700;">
                  Dear <strong style="color:#7b1515;">${spName}</strong>,
                </p>
                <p style="margin:12px 0 0;font-size:13px;color:#6b21a8;line-height:1.8;">
                  The following <strong>${companyQuotes.length}</strong> quotation(s) for <strong>Sinopower</strong> have <strong style="color:#7b1515;">EXCEEDED their follow-up deadline</strong> 
                  with <strong>no activity recorded</strong> in the system.<br>
                  Please log your follow-up note immediately or notify your branch manager for escalation.
                </p>
              </div>

              <!-- TABLE -->
              <div style="padding:20px 32px 32px;">
                <table style="width:100%;border-collapse:separate;border-spacing:0;font-size:13px;border:2px solid #c084c8;border-radius:8px;overflow:hidden;box-shadow:0 4px 16px rgba(123,21,21,0.15);" cellpadding="0" cellspacing="0">
                  <thead>
                    <tr style="background:linear-gradient(90deg,#4a0020,#7b1515);">
                      <th style="padding:12px 14px;text-align:left;color:#fff;font-weight:800;text-transform:uppercase;font-size:11px;letter-spacing:.06em;">Quote ID</th>
                      <th style="padding:12px 14px;text-align:left;color:#fff;font-weight:800;text-transform:uppercase;font-size:11px;letter-spacing:.06em;">Customer</th>
                      <th style="padding:12px 14px;text-align:left;color:#fff;font-weight:800;text-transform:uppercase;font-size:11px;letter-spacing:.06em;">Stage</th>
                      <th style="padding:12px 14px;text-align:left;color:#fff;font-weight:800;text-transform:uppercase;font-size:11px;letter-spacing:.06em;">Was Due</th>
                      <th style="padding:12px 14px;text-align:left;color:#f5a0a0;font-weight:900;text-transform:uppercase;font-size:11px;letter-spacing:.06em;">🚨 Overdue By</th>
                    </tr>
                  </thead>
                  <tbody>${tableRows}</tbody>
                </table>
              </div>

              <!-- FOOTER -->
              <div style="background:linear-gradient(90deg,#1a0020,#4a0020);padding:14px 28px;font-size:11px;color:#c084c8;text-align:center;font-weight:600;">
                Automated overdue compliance alert — Sinopower Zimbabwe Sales System. Do not reply — log follow-ups in Omnis.
              </div>
              <div style="height:4px;background:linear-gradient(90deg,#7b1515,#c92222,#7b1515);"></div>
            </div></body></html>`;

          } else {
            // ─── MXG OVERDUE TEMPLATE — crimson / heavy industrial ───────────
            emailHtml = `
            <!DOCTYPE html><html><head><meta charset="utf-8"></head>
            <body style="margin:0;padding:24px;font-family:Arial,'Helvetica Neue',sans-serif;background:#1a0000;">
            <div style="max-width:940px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 8px 40px rgba(185,28,28,0.35);">

              <!-- TOP STRIPE -->
              <div style="height:6px;background:linear-gradient(90deg,#991b1b,#ef4444,#991b1b);"></div>

              <!-- URGENT ALERT BANNER -->
              <div style="background:#7f1d1d;padding:12px 32px;display:flex;align-items:center;gap:12px;border-bottom:3px solid #dc2626;">
                <span style="font-size:22px;">⚠️</span>
                <div>
                  <div style="font-size:13px;font-weight:900;color:#fca5a5;text-transform:uppercase;letter-spacing:.1em;">URGENT — OVERDUE ACTION REQUIRED</div>
                  <div style="font-size:11px;color:#fecaca;margin-top:2px;">Machinery Exchange | ${currentDateStr} | These quotations have missed their follow-up deadline</div>
                </div>
              </div>

              <!-- BRAND HEADER -->
              <table style="width:100%;border-collapse:collapse;background:#b91c1c;" cellpadding="0" cellspacing="0"><tr>
                <td style="padding:20px 32px;vertical-align:middle;width:45%;">
                  <img src="${brand.logo}" alt="${brand.name}" style="display:block;height:110px;width:auto;max-width:280px;filter:drop-shadow(0 2px 4px rgba(0,0,0,0.3));opacity:0.92;">
                </td>
                <td style="padding:20px 32px;vertical-align:middle;text-align:right;width:55%;">
                  <div style="font-size:22px;font-weight:900;color:#fff;letter-spacing:-0.5px;">${brand.name}</div>
                  <div style="font-size:12px;color:#fca5a5;margin-top:6px;text-transform:uppercase;letter-spacing:.1em;font-weight:800;">Overdue Follow-Up Reminder</div>
                  <div style="font-size:11px;color:#fecaca;margin-top:4px;">${companyQuotes.length} Quote(s) — No entry recorded</div>
                </td>
              </tr></table>

              <!-- BODY -->
              <div style="padding:28px 32px 16px;background:#fff5f5;border-bottom:1px solid #fecaca;">
                <p style="margin:0;font-size:15px;color:#7f1d1d;line-height:1.8;font-weight:600;">
                  Dear <strong style="color:#b91c1c;">${spName}</strong>,
                </p>
                <p style="margin:12px 0 0;font-size:14px;color:#991b1b;line-height:1.8;">
                  The following <strong>${companyQuotes.length}</strong> quotation(s) for <strong>Machinery Exchange</strong> are <strong>OVERDUE</strong> — 
                  the follow-up deadline has passed and <strong>no action has been recorded</strong> in the system.<br>
                  Please log your follow-up immediately or escalate to your manager.
                </p>
              </div>

              <!-- TABLE -->
              <div style="padding:20px 32px 36px;">
                <table style="width:100%;border-collapse:separate;border-spacing:0;font-size:13px;border:2px solid #fca5a5;border-radius:8px;overflow:hidden;box-shadow:0 4px 12px rgba(185,28,28,0.12);" cellpadding="0" cellspacing="0">
                  <thead>
                    <tr style="background:#b91c1c;">
                      <th style="padding:12px 14px;text-align:left;color:#fff;font-weight:800;text-transform:uppercase;font-size:11px;letter-spacing:.06em;">Quote</th>
                      <th style="padding:12px 14px;text-align:left;color:#fff;font-weight:800;text-transform:uppercase;font-size:11px;letter-spacing:.06em;">Customer</th>
                      <th style="padding:12px 14px;text-align:left;color:#fff;font-weight:800;text-transform:uppercase;font-size:11px;letter-spacing:.06em;">Stage</th>
                      <th style="padding:12px 14px;text-align:left;color:#fff;font-weight:800;text-transform:uppercase;font-size:11px;letter-spacing:.06em;">Was Due</th>
                      <th style="padding:12px 14px;text-align:left;color:#fca5a5;font-weight:900;text-transform:uppercase;font-size:11px;letter-spacing:.06em;">⏰ Overdue By</th>
                    </tr>
                  </thead>
                  <tbody>${tableRows}</tbody>
                </table>
              </div>

              <!-- FOOTER -->
              <div style="background:#7f1d1d;padding:14px 28px;font-size:11px;color:#fca5a5;text-align:center;font-weight:600;">
                Automated OVERDUE alert — Machinery Exchange Sales System. Do not reply — log follow-ups directly in Omnis.
              </div>
              <div style="height:4px;background:linear-gradient(90deg,#991b1b,#ef4444,#991b1b);"></div>
            </div></body></html>`;
          }

        } else {
          // ✅ STANDARD DAILY REMINDER TEMPLATE
          emailSubject = `${brand.name} - Daily Quotation Follow-ups (${companyQuotes.length})`;
          emailText = `You have ${companyQuotes.length} quotations that need follow up today.`;
          emailHtml = `
          <!DOCTYPE html><html><head><meta charset="utf-8"></head>
          <body style="margin:0;padding:24px;font-family:Arial,'Helvetica Neue',sans-serif;background:#f0f4f8;">
          <div style="max-width:920px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 8px 30px rgba(0,0,0,0.12);">
            <table style="width:100%;border-collapse:collapse;background:${brand.color};" cellpadding="0" cellspacing="0"><tr>
              <td style="padding:24px 32px;vertical-align:middle;width:45%;">
                <img src="${brand.logo}" alt="${brand.name}" style="display:block;height:125px;width:auto;max-width:300px;filter:drop-shadow(0 2px 4px rgba(0,0,0,0.2));">
              </td>
              <td style="padding:24px 32px;vertical-align:middle;text-align:right;width:55%;">
                <div style="font-size:24px;font-weight:800;color:#fff;letter-spacing:-0.5px;">${brand.name}</div>
                <div style="font-size:13px;color:rgba(255,255,255,.8);margin-top:6px;text-transform:uppercase;letter-spacing:.08em;font-weight:700;">Daily Quotation Follow-Ups</div>
                <div style="font-size:13px;color:rgba(255,255,255,.8);margin-top:4px;">Date: ${currentDateStr}</div>
              </td>
            </tr></table>
            <div style="padding:32px 32px 16px;">
              <p style="margin:0;font-size:16px;color:#0f172a;line-height:1.7;">
                Dear <strong>${spName}</strong>,<br><br>
                You have <strong>${companyQuotes.length}</strong> quotation(s) for ${brand.name} that require follow-up <strong>today</strong>.
                Please review the list below and take the necessary actions to update their status.
              </p>
            </div>
            <div style="padding:16px 32px 36px;overflow-x:auto;">
              <table style="width:100%;border-collapse:separate;border-spacing:0;font-size:14px;border:1px solid #cbd5e1;border-radius:8px;overflow:hidden;box-shadow:0 4px 6px -1px rgba(0,0,0,0.05);" cellpadding="0" cellspacing="0">
                <thead>
                  <tr style="background:${brand.color};">
                    <th style="padding:12px;text-align:left;color:white;font-weight:700;text-transform:uppercase;letter-spacing:.05em;font-size:12px;">ID</th>
                    <th style="padding:12px;text-align:left;color:white;font-weight:700;text-transform:uppercase;letter-spacing:.05em;font-size:12px;">Title</th>
                    <th style="padding:12px;text-align:left;color:white;font-weight:700;text-transform:uppercase;letter-spacing:.05em;font-size:12px;">Customer</th>
                    <th style="padding:12px;text-align:left;color:white;font-weight:700;text-transform:uppercase;letter-spacing:.05em;font-size:12px;">Date</th>
                    <th style="padding:12px;text-align:left;color:white;font-weight:700;text-transform:uppercase;letter-spacing:.05em;font-size:12px;">Status</th>
                    <th style="padding:12px;text-align:left;color:white;font-weight:700;text-transform:uppercase;letter-spacing:.05em;font-size:12px;">Next Follow Up</th>
                  </tr>
                </thead>
                <tbody>${tableRows}</tbody>
              </table>
            </div>
            <div style="background:#f8fafc;border-top:1px solid #e2e8f0;padding:12px 28px;font-size:11px;color:#94a3b8;text-align:center;">
              This is an automated daily reminder from the Omnis Order Management System. Please do not reply to this email.
            </div>
          </div></body></html>`;
        }

        await sb.from("omnis_email_queue").insert({
          system: "fleetrack",
          related_type: isOverdueDispatch ? "quotation_overdue" : "quotation_reminder",
          to_email: spEmail,
          cc_email: MANAGEMENT_CC,
          subject: emailSubject,
          body_html: emailHtml,
          body_text: emailText,
          status: "pending"
        });

        emailsQueued++;
      }
    }

    // ── Stamp last_overdue_reminder_sent_at on dispatched quotes ─────────────
    if (isOverdueDispatch) {
      const sentNames = dueLifecycles.map((ql: any) => ql.quote_name).filter(Boolean);
      if (sentNames.length > 0) {
        await sb
          .from("omnis_quote_lifecycle")
          .update({ last_overdue_reminder_sent_at: new Date().toISOString() })
          .in("quote_name", sentNames);
      }
    }

    return new Response(JSON.stringify({ 
      success: true, 
      quotes_found: dueLifecycles.length,
      emails_queued: emailsQueued 
    }), { status: 200, headers: { "Content-Type": "application/json" } });

  } catch (e: any) {
    console.error(e);
    return new Response(JSON.stringify({ error: e.message }), { status: 500 });
  }
});

