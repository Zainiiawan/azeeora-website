import { logger } from './logger';

export const canSendWhatsApp = (): boolean => {
  return Boolean(process.env.WHATSAPP_TOKEN && process.env.WHATSAPP_PHONE_ID);
};

/**
 * Sends a WhatsApp template message using Meta Cloud API.
 * The customer must have opted in, or you must use an approved template for transactional messages.
 */
export const sendWhatsAppNotification = async (
  to: string,
  templateName: string,
  languageCode: string = 'en',
  components: any[] = []
): Promise<void> => {
  if (!canSendWhatsApp()) {
    logger.warn(`[WHATSAPP SKIPPED] Notification to ${to} (Missing WHATSAPP_TOKEN or WHATSAPP_PHONE_ID)`);
    return;
  }

  // Ensure the number is correctly formatted (e.g., removing leading 0 or + and using country code)
  const formattedTo = to.replace(/[^0-9]/g, '');
  if (!formattedTo) return;

  const url = `https://graph.facebook.com/v18.0/${process.env.WHATSAPP_PHONE_ID}/messages`;
  
  const payload = {
    messaging_product: 'whatsapp',
    to: formattedTo,
    type: 'template',
    template: {
      name: templateName,
      language: {
        code: languageCode
      },
      components
    }
  };

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.WHATSAPP_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      const errText = await res.text();
      logger.error(`WhatsApp failed: ${to}`, { status: res.status, error: errText });
    } else {
      logger.info(`WhatsApp sent successfully to ${to}`);
    }
  } catch (err: any) {
    logger.error(`WhatsApp error: ${to}`, { error: err.message });
  }
};
