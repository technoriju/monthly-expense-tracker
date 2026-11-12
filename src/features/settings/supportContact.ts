/** Developer support contacts shown on the Help & Support screen. Not user data. */
export const SUPPORT_EMAIL = 'technoriju@gmail.com';

/** WhatsApp number in international format without "+" (India, +91), as wa.me expects. */
export const SUPPORT_WHATSAPP = '919330882613';
export const SUPPORT_WHATSAPP_DISPLAY = '+91 93308 82613';

export function supportEmailUrl(subject: string): string {
  return `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(subject)}`;
}

export function supportWhatsAppUrl(): string {
  return `https://wa.me/${SUPPORT_WHATSAPP}`;
}
