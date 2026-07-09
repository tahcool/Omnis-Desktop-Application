import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { task, content, tone } = await req.json();
    const OPENAI_API_KEY = "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";

    if (!OPENAI_API_KEY) {
      throw new Error("Missing OPENAI_API_KEY environment variable in Edge Function");
    }

    let prompt = "";
    let systemPrompt = "You are an expert marketing assistant. You MUST return your response as a raw JSON object. Do not wrap the JSON in markdown code blocks like ```json.";

    if (task === 'generate_subjects') {
      prompt = `Generate 3 highly engaging, context-aware email subject lines for the following marketing campaign content. Return a JSON object with a 'subjects' array, where each item has 'subject' (string) and 'score' (estimated open rate 1-100 integer):\n\n${content}`;
    } else if (task === 'rewrite_content') {
      prompt = `Rewrite the following marketing text. The desired tone or action is: ${tone}. Return a JSON object with 'content' containing the rewritten text:\n\n${content}`;
    } else if (task === 'check_spam') {
      prompt = `Analyze the following marketing email HTML for spam trigger words, phrasing, and general deliverability best practices. Return a JSON object with 'score' (0-100 integer) and 'suggestions' (an array of strings with actionable advice):\n\n${content}`;
    } else if (task === 'draft_email') {
      prompt = `Draft a highly engaging, visual, poster-style marketing email based on the following topic/prompt: ${content}.
You must return a JSON object with two fields: 'subject' (a catchy subject line) and 'blocks' (an array of layout blocks to build the email).
The blocks should create a beautiful flyer layout.
Supported block types and schemas:
- { "type": "header", "text": "Catchy Headline", "bg": "#1e293b", "color": "#ffffff", "size": "28px" }
- { "type": "image", "url": "https://placehold.co/600x300/1e293b/ffffff.png?text=Your+Image+Text", "alt": "Description", "align": "center" }
- { "type": "text", "content": "The body of the email in plain text. Use <br> for line breaks." }
- { "type": "button", "label": "Call To Action", "link": "https://powerstar.co.zw", "bg": "#2563eb", "color": "#ffffff", "align": "center" }
- { "type": "divider", "color": "#e2e8f0", "margin": "20px" }

Return a complete layout array with at least a header, an image, some text, and a call-to-action button. Make the colors and text engaging and relevant to the topic. CRITICAL: For images, ALWAYS append '.png' to the placehold.co URL and replace any spaces in the text parameter with a '+' sign.`;
    } else if (task === 'create_course') {
      let scrapedText = content;
      let foundVideos = [];
      let sourceTopic = "the provided text";
      
      if (content.startsWith('http://') || content.startsWith('https://')) {
        sourceTopic = "the URL: " + content;
        try {
          const resp = await fetch(content);
          const html = await resp.text();
          const ytRegex = /(https?:\/\/(?:www\.)?(?:youtube\.com\/watch\?v=|youtu\.be\/)[a-zA-Z0-9_-]+)/g;
          const matches = html.match(ytRegex);
          if (matches) foundVideos = [...new Set(matches)];
          let bodyMatch = html.match(/<body[^>]*>([\s\S]*)<\/body>/i);
          let bodyText = bodyMatch ? bodyMatch[1] : html;
          bodyText = bodyText.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');
          bodyText = bodyText.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');
          bodyText = bodyText.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
          scrapedText = bodyText.substring(0, 10000); // limit to 10k chars
        } catch (e) {
          scrapedText = "Failed to scrape URL. Generate a general course based on the topic of the URL: " + content;
        }
      } else {
        // It's raw text
        const ytRegex = /(https?:\/\/(?:www\.)?(?:youtube\.com\/watch\?v=|youtu\.be\/)[a-zA-Z0-9_-]+)/g;
        const matches = content.match(ytRegex);
        if (matches) foundVideos = [...new Set(matches)];
        scrapedText = content.substring(0, 10000);
      }
      
      systemPrompt = "You are an expert instructional designer. You MUST return your response as a raw JSON object. Do not wrap the JSON in markdown code blocks like ```json.";
      prompt = `Create a complete training course in JSON format based on ${sourceTopic}.

Extracted Text:
${scrapedText}

Found Videos:
${foundVideos.join(', ')}

You MUST return a JSON object that matches this EXACT schema:
{
  "id": "string (unique id)",
  "title": "string (course title)",
  "subtitle": "string (course subtitle)",
  "brand": "string (e.g. 'Custom Training')",
  "level": "string ('Beginner', 'Intermediate', or 'Advanced')",
  "duration": "string (e.g. '30 min')",
  "tags": ["string array of 3-4 tags"],
  "color1": "#1e293b",
  "color2": "#334155",
  "description": "string (short description)",
  "sections": [
    {
      "id": "string (section id)",
      "title": "string (section title)",
      "icon": "string (short label)",
      "steps": [
        {
          "id": "string",
          "type": "step",
          "step_number": "string (e.g. 'I - 1 / 3')",
          "title": "string (step title)",
          "video": "string (use one of the found videos, or leave empty if none)",
          "body": "string (detailed explanation)",
          "procedure": ["string array of steps"],
          "tools": ["string array of tools required (optional)"],
          "caution": "string (optional caution note)",
          "note": "string (optional note)"
        }
      ]
    },
    {
      "id": "sec-quiz",
      "title": "Knowledge Check",
      "icon": "Quiz",
      "steps": [
        {
          "id": "quiz-1",
          "type": "quiz",
          "title": "Knowledge Check",
          "questions": [
            {
              "q": "string (question)",
              "options": ["string array of exactly 4 options"],
              "correct": 0,
              "explanation": "string (why it's correct)"
            }
          ]
        }
      ]
    }
  ]
}

CRITICAL: Include exactly one section at the end with id 'sec-quiz' and type 'quiz' containing 3-5 relevant questions. If videos were found, assign them to the 'video' field in the 'step' blocks.`;
    } else {
      throw new Error("Invalid task requested");
    }

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: prompt }
        ],
        response_format: { type: "json_object" }
      }),
    });

    const data = await response.json();
    
    if (data.error) {
      throw new Error(data.error.message);
    }

    const resultText = data.choices[0].message.content;
    const resultObj = JSON.parse(resultText);

    return new Response(JSON.stringify(resultObj), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});
