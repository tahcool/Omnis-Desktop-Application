// Supabase Edge Function: ai-proxy
// Deploy: supabase functions deploy ai-proxy
//
// Structured AI proxy with predefined actions.
// No unrestricted provider relay — only authorized actions are processed.
// OpenAI key stored in Deno.env, never exposed to clients.
//
// Actions map 1:1 to existing client-side AI workflows that previously
// called OpenAI directly with a client-stored key.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { SUPER_ADMIN_EMAILS, isSuperAdmin, hasSystemAccess } from "../_shared/admin-config.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// ── Predefined Actions ──────────────────────────────────────────────

interface ActionDef {
  /** Required input fields (validated before calling OpenAI) */
  requiredFields: string[];
  /** Optional input fields */
  optionalFields?: string[];
  /** Build the system + user prompts */
  buildPrompt: (input: Record<string, unknown>) => {
    system: string;
    user: string;
    model?: string;
    jsonMode?: boolean;
  };
  /** Admin-only action? */
  adminOnly?: boolean;
}

const ACTIONS: Record<string, ActionDef> = {
  // ── Quotation Magic Fill ──
  magic_fill: {
    requiredFields: ["text"],
    buildPrompt: ({ text }) => ({
      system:
        "You are a quotation data extraction assistant. Extract structured data from natural language.",
      user: `Extract quotation details from this text: "${text}".
Return exactly this JSON format:
{
  "customer": "customer name or null",
  "salesperson": "salesperson name or null",
  "item_code": "equipment or item mentioned or null",
  "price": number or null,
  "lead_time": "lead time like '2 Weeks' or null"
}`,
      model: "gpt-4o-mini",
      jsonMode: true,
    }),
  },

  // ── Quotation Smart Title ──
  smart_title: {
    requiredFields: ["customer", "item"],
    buildPrompt: ({ customer, item }) => ({
      system:
        "You are a business document assistant. Generate concise, professional titles.",
      user: `Generate a professional quotation title for:
Customer: ${customer || "Unknown"}
Item: ${item || "Unknown"}

Return a JSON object: { "title": "Professional Quotation Title" }`,
      model: "gpt-4o-mini",
      jsonMode: true,
    }),
  },

  // ── Quotation Intelligence ──
  quotation_intelligence: {
    requiredFields: ["customer", "item"],
    optionalFields: ["price", "quantity", "leadTime"],
    buildPrompt: ({ customer, item, price, quantity, leadTime }) => ({
      system:
        "You are a sales intelligence assistant specializing in B2B equipment sales.",
      user: `Provide brief sales intelligence for this quotation:
Customer: ${customer}
Item: ${item}
Price: ${price || "Not set"}
Quantity: ${quantity || 1}
Lead Time: ${leadTime || "Not set"}

Return a JSON object with:
{
  "insights": "2-3 sentence analysis",
  "suggestedPrice": number or null,
  "competitorInfo": "brief competitor context or null",
  "negotiationTips": ["tip1", "tip2"]
}`,
      model: "gpt-4o-mini",
      jsonMode: true,
    }),
  },

  // ── Order Intelligence ──
  order_intelligence: {
    requiredFields: ["context"],
    buildPrompt: ({ context }) => ({
      system:
        "You are a sales analytics assistant. Analyze order data and provide actionable insights.",
      user: `Analyze this sales order context and provide intelligence:\n${context}\n\nReturn a JSON object with "insights" (string) and "recommendations" (array of strings).`,
      model: "gpt-4o-mini",
      jsonMode: true,
    }),
  },

  // ── Test Connection (admin only) ──
  test_connection: {
    requiredFields: [],
    adminOnly: true,
    buildPrompt: () => ({
      system: "You are a test assistant.",
      user: "Reply with exactly: {\"ok\": true, \"message\": \"Connection successful\"}",
      model: "gpt-4o-mini",
      jsonMode: true,
    }),
  },
};

// ── Main Handler ────────────────────────────────────────────────────

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // 1. Authenticate
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Authentication required" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Invalid or expired authentication token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 2. Parse request
    const body = await req.json();
    const { action, ...input } = body;

    if (!action || typeof action !== "string") {
      return new Response(
        JSON.stringify({ error: "Missing or invalid 'action' field", availableActions: Object.keys(ACTIONS) }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const actionDef = ACTIONS[action];
    if (!actionDef) {
      return new Response(
        JSON.stringify({ error: `Unknown action: '${action}'`, availableActions: Object.keys(ACTIONS) }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 3. Authorization check for admin-only actions
    if (actionDef.adminOnly) {
      const { data: access } = await supabase
        .from("user_system_access")
        .select("is_admin")
        .eq("user_id", user.id)
        .single();

      const isAdmin = access?.is_admin === true || isSuperAdmin(user.email || "");
      if (!isAdmin) {
        return new Response(
          JSON.stringify({ error: "Admin privileges required for this action" }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // 4. Validate required fields
    const missingFields = actionDef.requiredFields.filter(
      (f) => input[f] === undefined || input[f] === null || input[f] === ""
    );
    if (missingFields.length > 0) {
      return new Response(
        JSON.stringify({ error: `Missing required fields: ${missingFields.join(", ")}` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 5. Get OpenAI key from environment (never from client)
    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
    if (!OPENAI_API_KEY) {
      return new Response(
        JSON.stringify({ error: "AI service not configured. Contact your administrator." }),
        { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 6. Build prompt and call OpenAI
    const promptConfig = actionDef.buildPrompt(input);
    const openaiBody: Record<string, unknown> = {
      model: promptConfig.model || "gpt-4o-mini",
      messages: [
        { role: "system", content: promptConfig.system },
        { role: "user", content: promptConfig.user },
      ],
    };
    if (promptConfig.jsonMode) {
      openaiBody.response_format = { type: "json_object" };
    }

    const openaiBaseUrl = Deno.env.get("OPENAI_BASE_URL") || "https://api.openai.com";
    const openaiRes = await fetch(`${openaiBaseUrl}/v1/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(openaiBody),
    });

    const openaiData = await openaiRes.json();

    if (openaiData.error) {
      console.error(`[ai-proxy] OpenAI error for action '${action}':`, openaiData.error);
      return new Response(
        JSON.stringify({ error: "AI service error. Please try again." }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 7. Parse and return result
    const content = openaiData.choices?.[0]?.message?.content;
    if (!content) {
      return new Response(
        JSON.stringify({ error: "No response from AI service" }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let result: unknown;
    if (promptConfig.jsonMode) {
      try {
        result = JSON.parse(content);
      } catch {
        result = { raw: content };
      }
    } else {
      result = { content };
    }

    return new Response(
      JSON.stringify({ ok: true, action, result }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[ai-proxy] Error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
