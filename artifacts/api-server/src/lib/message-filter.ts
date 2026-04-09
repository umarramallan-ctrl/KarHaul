import Anthropic from "@anthropic-ai/sdk";

const PHONE_PATTERN = /(\+?1?[\s.\-]?\(?\d{3}\)?[\s.\-]?\d{3}[\s.\-]?\d{4}|\b\d{10}\b)/g;
const EMAIL_PATTERN = /[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g;
const SOCIAL_PATTERN = /\b(whatsapp|telegram|snapchat|instagram|venmo|cashapp|zelle|paypal|fb|facebook)\s*[:@#]?\s*\S+/gi;
const VERBAL_PHONE_PATTERN = /\b(call me|text me|reach me|contact me|my number|my cell|my phone|phone is|number is)\b.{0,30}\d{7,}/gi;

function regexCheck(content: string): { blocked: boolean; reason?: string } {
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

export async function checkMessageContent(content: string): Promise<{ blocked: boolean; reason?: string }> {
  // Fast regex check first
  const regexResult = regexCheck(content);
  if (regexResult.blocked) return regexResult;

  // AI check for subtle off-platform contact sharing (only if API key present)
  if (!process.env.ANTHROPIC_API_KEY) return { blocked: false };

  try {
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const response = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 500,
      messages: [{
        role: "user",
        content: `You are a content moderator for a vehicle transport marketplace. Determine if this message attempts to share off-platform contact information (phone, email, social media, payment apps) in an indirect or encoded way — e.g., writing out numbers as words, using code words, embedding contact info in URLs, or other evasion tactics.

Message: """${content}"""

Respond with ONLY a JSON object: {"blocked": true/false, "reason": "explanation if blocked, null if not"}`,
      }],
    });

    const text = (response.content[0] as any).text?.trim() || "";
    const jsonMatch = text.match(/\{[^}]+\}/s);
    if (!jsonMatch) return { blocked: false };
    const parsed = JSON.parse(jsonMatch[0]);
    if (parsed.blocked && parsed.reason) {
      return { blocked: true, reason: parsed.reason };
    }
  } catch {
    // Non-critical — don't fail on AI errors
  }

  return { blocked: false };
}
