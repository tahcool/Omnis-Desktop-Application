/**
 * ai-proxy-client.js — Client helper for calling the AI proxy Edge Function.
 *
 * Replaces direct OpenAI API calls and client-side key storage.
 * All AI requests are routed through the authenticated ai-proxy Edge Function.
 *
 * Usage:
 *   const result = await window.callAIProxy('magic_fill', { text: 'some text' });
 *   // result = { ok: true, action: 'magic_fill', result: { customer: '...', ... } }
 */

(function () {
  'use strict';

  /**
   * Call the AI proxy Edge Function with a predefined action.
   * @param {string} action - One of: magic_fill, smart_title, quotation_intelligence, order_intelligence, test_connection
   * @param {object} params - Action-specific input parameters
   * @returns {Promise<object>} - The parsed response from the proxy
   */
  window.callAIProxy = async function callAIProxy(action, params = {}) {
    if (!window.supabase) {
      throw new Error('Supabase client not initialized');
    }

    // Get the current session token
    const { data: { session } } = await window.supabase.auth.getSession();
    if (!session?.access_token) {
      throw new Error('Not authenticated. Please log in.');
    }

    const supabaseUrl = window.supabase.supabaseUrl || window.SUPABASE_URL || '';
    const anonKey = window.supabase.supabaseKey || window.SUPABASE_ANON_KEY || '';

    const resp = await fetch(`${supabaseUrl}/functions/v1/ai-proxy`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
        'apikey': anonKey,
      },
      body: JSON.stringify({ action, ...params }),
    });

    const body = await resp.json();

    if (!resp.ok) {
      throw new Error(body.error || `AI proxy error (${resp.status})`);
    }

    return body;
  };

  /**
   * Check if the AI proxy is configured and accessible.
   * Returns { ok: true } or { ok: false, error: '...' }
   */
  window.checkAIStatus = async function checkAIStatus() {
    try {
      const result = await window.callAIProxy('test_connection');
      return { ok: true, result };
    } catch (e) {
      return { ok: false, error: e.message };
    }
  };
})();
