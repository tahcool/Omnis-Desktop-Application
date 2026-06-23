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
      return new Response(JSON.stringify({ message: "No quotes need follow up today." }), { status: 200 });
    }

    // Filter to those that are strictly due today or earlier
    const dueLifecycles = allLifecycles.filter((ql: any) => {
      let due = ql.current_stage === 1 ? ql.stage_1_due : (ql.current_stage === 2 ? ql.stage_2_due : ql.stage_3_due);
      return due <= today;
    });

    if (dueLifecycles.length === 0) {
      return new Response(JSON.stringify({ message: "No quotes need follow up today." }), { status: 200 });
    }

    // 2. Group by Sales Person and Company
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

    // 4. Generate HTML and Queue Emails
    let emailsQueued = 0;
    const currentDateStr = new Date().toLocaleDateString('en-GB', {day:'2-digit',month:'long',year:'numeric'});

    for (const [spName, companies] of Object.entries(groups)) {
      const spObj = salesPersons?.find(p => p.name === spName);
      const spEmail = spObj?.email;
      if (!spEmail) {
        console.warn(`No email mapping found for sales person: ${spName}`);
        continue;
      }

      for (const [companyName, companyQuotes] of Object.entries(companies)) {
        const brand = getBranding(companyName);
        
        let tableRows = "";
        for (const ql of companyQuotes) {
          const q = ql.frappe_quotation;
          const dt = q.transaction_date ? new Date(q.transaction_date).toLocaleDateString('en-GB') : '-';
          const due = ql.current_stage === 1 ? ql.stage_1_due : (ql.current_stage === 2 ? ql.stage_2_due : ql.stage_3_due);
          const fup = due ? new Date(due).toLocaleDateString('en-GB') : '-';
          
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
            </tr>
          `;
        }

        const emailHtml = `
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
                    You have <strong>${companyQuotes.length}</strong> quotation(s) for ${brand.name} that require follow-up today or are past due. 
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
        </div></body></html>
        `;

        // Queue it
        await sb.from("omnis_email_queue").insert({
          system: "fleetrack",
          related_type: "quotation_reminder",
          to_email: spEmail,
          cc_email: MANAGEMENT_CC,
          subject: `${brand.name} - Daily Quotation Follow-ups (${companyQuotes.length})`,
          body_html: emailHtml,
          body_text: `You have ${companyQuotes.length} quotations that need follow up today.`,
          status: "pending"
        });

        emailsQueued++;
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
