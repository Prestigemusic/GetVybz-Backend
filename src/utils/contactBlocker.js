// utils/contactBlocker.js

/**
 * Detects phone numbers, bank/account numbers, or keywords that suggest
 * taking the conversation off-platform (WhatsApp, Telegram, etc).
 */
export const containsContact = (text) => {
  const input = String(text || "").toLowerCase();

  // Regex patterns
  const patterns = [
    // Nigerian and intl phone numbers (with spaces/dashes/dots)
    /(\+?234|0)\s?[-.]?\d{2,4}[-.\s]?\d{3,4}[-.\s]?\d{3,4}/,

    // Generic international numbers
    /\+?\d{2,4}[-.\s]?\d{3,4}[-.\s]?\d{3,4,}/,

    // Bank account numbers (6–20 digits, often with keywords)
    /\b(?:account|acct|a\/c|iban|sort code)\b[:\s\-]*\d{6,20}/i,

    // Pure long digit sequences (7–20 digits) that look like account numbers
    /\b\d{7,20}\b/,

    // Off-platform keywords
    /\b(whatsapp|telegram|signal|imo|wechat|snapchat)\b/,
  ];

  return patterns.some((pattern) => pattern.test(input));
};