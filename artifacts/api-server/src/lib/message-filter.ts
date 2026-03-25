const PHONE_PATTERN = /(\+?1?[\s.\-]?\(?\d{3}\)?[\s.\-]?\d{3}[\s.\-]?\d{4}|\b\d{10}\b)/g;
const EMAIL_PATTERN = /[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g;
const SOCIAL_PATTERN = /\b(whatsapp|telegram|snapchat|instagram|venmo|cashapp|zelle|paypal|fb|facebook)\s*[:@#]?\s*\S+/gi;
const VERBAL_PHONE_PATTERN = /\b(call me|text me|reach me|contact me|my number|my cell|my phone|phone is|number is)\b.{0,30}\d{7,}/gi;

export function checkMessageContent(content: string): { blocked: boolean; reason?: string } {
  if (PHONE_PATTERN.test(content)) {
    return { blocked: true, reason: "Phone numbers cannot be shared in messages. Use the in-app call button to connect directly and safely." };
  }
  if (EMAIL_PATTERN.test(content)) {
    return { blocked: true, reason: "Email addresses cannot be shared in messages. All communication must remain on-platform for your protection." };
  }
  if (SOCIAL_PATTERN.test(content)) {
    return { blocked: true, reason: "Social media handles and payment apps cannot be shared in messages. Use the platform's built-in tools." };
  }
  if (VERBAL_PHONE_PATTERN.test(content)) {
    return { blocked: true, reason: "Personal contact information cannot be shared. Use the in-app call feature to connect securely." };
  }
  return { blocked: false };
}
