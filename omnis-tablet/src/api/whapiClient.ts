/**
 * WHAPI WhatsApp Messaging Client Helper
 * Configured for sending automated WhatsApp alerts for Enquiries, Follow-ups, and Quote Updates.
 */

export interface WhapiConfig {
  apiUrl: string;
  apiKey: string;
}

// Default WHAPI Endpoint (WHAPI Cloud standard endpoint)
const DEFAULT_WHAPI_URL = 'https://gate.whapi.cloud/messages/text';
const DEFAULT_WHAPI_KEY = ''; // Configurable by user

export async function sendWhatsAppMessage(params: {
  recipientPhone: string;
  message: string;
  config?: Partial<WhapiConfig>;
}): Promise<{ success: boolean; data?: any; error?: string }> {
  const { recipientPhone, message, config } = params;
  const apiUrl = config?.apiUrl || DEFAULT_WHAPI_URL;
  const apiKey = config?.apiKey || DEFAULT_WHAPI_KEY;

  if (!apiKey) {
    console.log('[WHAPI] Skipping WhatsApp dispatch — WHAPI API Key ready to be configured by admin.');
    return { success: false, error: 'WHAPI API key unconfigured' };
  }

  try {
    const formattedPhone = recipientPhone.replace(/[^0-9]/g, '');
    const to = formattedPhone.includes('@s.whatsapp.net') ? formattedPhone : `${formattedPhone}@s.whatsapp.net`;

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        to,
        body: message,
      }),
    });

    const json = await response.json();
    if (response.ok) {
      console.log('[WHAPI] WhatsApp notification sent successfully:', json);
      return { success: true, data: json };
    } else {
      console.error('[WHAPI] WhatsApp dispatch failed:', json);
      return { success: false, error: json?.message || 'WHAPI Error' };
    }
  } catch (e: any) {
    console.error('[WHAPI] WhatsApp request exception:', e);
    return { success: false, error: e?.message || 'Exception' };
  }
}
