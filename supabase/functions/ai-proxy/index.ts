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
  /** Build the system + user prompts (for chat completions) */
  buildPrompt: (input: Record<string, unknown>) => {
    system: string;
    user: string;
    model?: string;
    jsonMode?: boolean;
  };
  /** Admin-only action? */
  adminOnly?: boolean;
  /** If true, uses DALL-E image generation instead of chat completions */
  isImageAction?: boolean;
  /** Build the DALL-E prompt (required when isImageAction is true) */
  buildImagePrompt?: (input: Record<string, unknown>) => string;
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

  // ── Product Image Generation (DALL-E 3) ──
  generate_product_image: {
    requiredFields: ["name"],
    optionalFields: ["brand", "category", "description"],
    isImageAction: true,
    buildImagePrompt: ({ name, brand, category, description }) => {
      // Build a highly specific prompt for accurate product imagery
      let prompt = `Professional commercial product photography of a ${brand ? brand + " " : ""}${name}`;
      if (category) prompt += ` (${category})`;
      prompt += ".";
      if (description) {
        // Use first 300 chars of description to keep prompt focused
        const descSnippet = String(description).substring(0, 300);
        prompt += ` Technical details: ${descSnippet}.`;
      }
      prompt += " Studio-lit, centered on pure white background, no text, no watermark, no human hands, high resolution commercial product photography, photorealistic, detailed accurate representation of this specific product.";
      return prompt;
    },
    // buildPrompt is required by the interface but unused for image actions
    buildPrompt: () => ({ system: "", user: "" }),
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

    const openaiBaseUrl = Deno.env.get("OPENAI_BASE_URL") || "https://api.openai.com";

    // ── 6a. Product Image path (Search-first, DALL-E fallback) ──
    if (actionDef.isImageAction && actionDef.buildImagePrompt) {
      const { name, brand, category, description } = input as Record<string, string>;

      // --- Strategy 1: Search for real product photos via SerpAPI ---
      const SERPAPI_KEY = Deno.env.get("SERPAPI_KEY");
      if (SERPAPI_KEY) {
        // Helper: search SerpAPI, download best candidate, return base64 Response or null
        const tryImageSearch = async (query: string, tbs: string): Promise<Response | null> => {
          console.log(`[ai-proxy] Image search: "${query}" (filter: ${tbs})`);

          const serpUrl = new URL("https://serpapi.com/search.json");
          serpUrl.searchParams.set("q", query);
          serpUrl.searchParams.set("tbm", "isch");
          serpUrl.searchParams.set("ijn", "0");
          serpUrl.searchParams.set("api_key", SERPAPI_KEY);
          serpUrl.searchParams.set("tbs", tbs);

          const serpRes = await fetch(serpUrl.toString());
          const serpData = await serpRes.json();

          if (!serpData.images_results || serpData.images_results.length === 0) {
            console.log(`[ai-proxy] No results for "${query}"`);
            return null;
          }

          // Filter for usable images
          const candidates = serpData.images_results
            .filter((img: Record<string, unknown>) => {
              const w = Number(img.original_width || 0);
              const h = Number(img.original_height || 0);
              const url = String(img.original || "");
              return w >= 300 && h >= 200
                && !url.includes('.gif')
                && !url.includes('.svg')
                && !url.includes('tracking')
                && !url.includes('pixel');
            })
            .slice(0, 5);

          if (candidates.length === 0) {
            console.log(`[ai-proxy] No suitable candidates from "${query}"`);
            return null;
          }

          // Try downloading each candidate
          for (const candidate of candidates) {
            const imageUrl = String(candidate.original);
            try {
              const imgRes = await fetch(imageUrl, {
                headers: {
                  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
                  "Accept": "image/*",
                },
                redirect: "follow",
              });

              if (imgRes.ok) {
                const contentType = imgRes.headers.get("content-type") || "image/jpeg";
                if (contentType.startsWith("image/")) {
                  const arrayBuffer = await imgRes.arrayBuffer();
                  const bytes = new Uint8Array(arrayBuffer);

                  if (bytes.length > 5000) {
                    let binary = "";
                    for (let i = 0; i < bytes.length; i++) {
                      binary += String.fromCharCode(bytes[i]);
                    }
                    const b64 = btoa(binary);
                    console.log(`[ai-proxy] ✓ Found image (${Math.round(bytes.length / 1024)}KB) from: ${imageUrl.substring(0, 100)}`);

                    return new Response(
                      JSON.stringify({
                        ok: true,
                        action,
                        result: {
                          b64_json: b64,
                          content_type: contentType,
                          source: "web_search",
                          source_url: imageUrl,
                          revised_prompt: `Web search: "${query}"`,
                        },
                      }),
                      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
                    );
                  }
                }
              }
            } catch (dlErr) {
              console.warn(`[ai-proxy] Download failed: ${imageUrl.substring(0, 80)}: ${dlErr.message}`);
              continue;
            }
          }

          console.log(`[ai-proxy] All ${candidates.length} candidates failed to download`);
          return null;
        };

        try {
          const baseName = `${brand ? brand + " " : ""}${name} ${category ? category : ""}`.trim();

          // Pass 1: Search for transparent/white background PNG images
          let result = await tryImageSearch(`${baseName} PNG white background`, "isz:m,ic:trans");

          // Pass 2: Broader search — just add "white background" to query, no transparency filter
          if (!result) {
            result = await tryImageSearch(`${baseName} product photo white background`, "isz:m");
          }

          // Pass 3: Broadest — just find any decent product photo
          if (!result) {
            result = await tryImageSearch(`${baseName} product photo`, "isz:m");
          }

          if (result) return result;

          console.log(`[ai-proxy] All 3 search passes found nothing, falling back to DALL-E`);
        } catch (searchErr) {
          console.warn(`[ai-proxy] SerpAPI search failed, falling back to DALL-E:`, searchErr.message);
        }

      } else {
        console.log(`[ai-proxy] SERPAPI_KEY not set, using DALL-E directly`);
      }

      // --- Strategy 2: DALL-E fallback (generates an approximation) ---
      const imagePrompt = actionDef.buildImagePrompt!(input);
      console.log(`[ai-proxy] DALL-E fallback prompt: ${imagePrompt.substring(0, 120)}...`);

      const dalleBody = {
        model: "dall-e-3",
        prompt: imagePrompt,
        n: 1,
        size: "1024x1024",
        quality: "standard",
        response_format: "b64_json",
      };

      const dalleRes = await fetch(`${openaiBaseUrl}/v1/images/generations`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${OPENAI_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(dalleBody),
      });

      const dalleData = await dalleRes.json();

      if (dalleData.error) {
        console.error(`[ai-proxy] DALL-E error:`, dalleData.error);
        return new Response(
          JSON.stringify({ error: `Image generation failed: ${dalleData.error.message || "Unknown error"}` }),
          { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const imageData = dalleData.data?.[0];
      if (!imageData?.b64_json) {
        return new Response(
          JSON.stringify({ error: "No image data returned from AI service" }),
          { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({
          ok: true,
          action,
          result: {
            b64_json: imageData.b64_json,
            content_type: "image/png",
            source: "dall-e-3",
            revised_prompt: imageData.revised_prompt || imagePrompt,
          },
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }


    // ── 6b. Chat Completions path (default) ──
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
