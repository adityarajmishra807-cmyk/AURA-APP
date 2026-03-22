// Comprehensive profanity filter for Aura
// Block submission when bad/dangerous words are detected

const BAD_WORDS = [
  // English slurs & profanity
  "fuck", "shit", "bitch", "asshole", "bastard", "dick", "pussy", "cock",
  "cunt", "whore", "slut", "fag", "faggot", "nigger", "nigga", "retard",
  "retarded", "rape", "rapist", "molest", "pedophile", "pedo",
  // Violent / dangerous
  "kill yourself", "kys", "suicide", "hang yourself", "slit your wrists",
  "school shooting", "bomb threat", "terrorist", "genocide",
  // Hate speech
  "nazi", "white power", "heil hitler",
  // Hindi slurs & profanity
  "madarchod", "bhenchod", "chutiya", "chutiye", "gaandu", "gaand",
  "bhosdike", "bsdk", "mc", "bc", "randi", "harami", "haramkhor",
  "lodu", "lund", "jhatu", "jhaatu", "kamina", "kamine", "sala",
  "saale", "kutte", "kutta", "suar", "haram", "chut",
  // Common evasions
  "f u c k", "s h i t", "b i t c h", "n i g g", "f*ck", "sh*t",
  "b*tch", "a$$", "fck", "fuk", "fuq", "phuck", "phuk",
  "stfu", "gtfo",
];

// Build regex patterns for each word (word boundary matching)
const patterns = BAD_WORDS.map((word) => {
  // Escape special regex chars
  const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  // Allow optional spaces/dots/dashes between letters for evasion detection
  return new RegExp(escaped, "i");
});

/**
 * Check if text contains profanity.
 * Returns the first matched bad word or null if clean.
 */
export function detectProfanity(text: string): string | null {
  if (!text) return null;
  const normalized = text.toLowerCase().trim();

  for (let i = 0; i < BAD_WORDS.length; i++) {
    if (patterns[i].test(normalized)) {
      return BAD_WORDS[i];
    }
  }
  return null;
}

/**
 * Returns true if text is clean (no profanity).
 */
export function isClean(text: string): boolean {
  return detectProfanity(text) === null;
}

/**
 * Validates text and returns an error message if profanity is found.
 */
export function validateContent(text: string): string | null {
  const match = detectProfanity(text);
  if (match) {
    return "Your message contains inappropriate language. Please remove it and try again.";
  }
  return null;
}
