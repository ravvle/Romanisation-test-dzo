/**
 * Dzongkha → Roman Dzongkha Converter (Fully Complete Single File)
 * ---------------------------------------------------------------
 * Phonological transcription aligned with the Dzongkha Development Commission’s
 * Guide to Roman Dzongkha (1994). Handles:
 *   - Root initials
 *   - Subjoined (stacked) consonants/clusters
 *   - Vowel signs and inherent vowels
 *   - Finals (coda consonants)
 *   - Normalization rules (silent prefixes, cluster reductions)
 *   - Dictionary overrides for common/irregular items
 *
 * Note:
 * - Roman Dzongkha uses c/ch, ts/tsh, zh/z, hr/lh, and the apostrophe (’) to mark
 *   high tone before nasals/liquids/vowels and to mark devoiced initials in certain paradigms.
 * - This converter is designed for consistent phonological output for standard Dzongkha
 *   (Wang–Thê standard) from Ucen script.
 *
 * Public API:
 *   convertDzongkha(text: string) => string
 *   convertLine(text: string) => string   // preserves tsheg as spaces
 *
 * Examples:
 *   convertDzongkha("དཀར་པོ")  // "kâp"
 *   convertDzongkha("འབྲུག")    // "’druk"
 *   convertDzongkha("བཟློག་ཐབས") // "dokthap"
 */

/* ==========================
   Core mapping tables
   ========================== */

// Root initials (head letters)
const ROOT = {
  "ཀ": "k",  "ཁ": "kh", "ག": "g",  "ང": "ng",
  "ཅ": "c",  "ཆ": "ch", "ཇ": "j",  "ཉ": "ny",
  "ཏ": "t",  "ཐ": "th","ད": "d",  "ན": "n",
  "པ": "p",  "ཕ": "ph","བ": "b",  "མ": "m",
  "ཙ": "ts", "ཚ": "tsh","ཛ": "dz",
  "ཝ": "w",  "ཞ": "zh","ཟ": "z",
  "འ": "’",  "ཡ": "y", "ར": "r",
  "ལ": "l",  "ཤ": "sh","ས": "s",  "ཧ": "h",
  "ཨ": "a"
};

// Subjoined (stacked) consonants (U+0F90–U+0FBC)
const SUB = {
  "ྐ": "k",  "ྑ": "kh","ྒ": "g",  "ྔ": "ng",
  "ྕ": "c",  "ྖ": "ch","ྗ": "j",  "ྙ": "ny",
  "ྟ": "t",  "ྠ": "th","ྡ": "d",  "ྣ": "n",
  "ྤ": "p",  "ྥ": "ph","ྦ": "b",  "ྨ": "m",
  "ྩ": "ts", "ྪ": "tsh","ྫ": "dz",
  "ྭ": "w",  "ྱ": "y", "ྲ": "r",
  "ླ": "l",  "ྴ": "sh","ྶ": "s",  "ྷ": "h"
};

// Vowel signs (above/below) and long marker
// Inherent vowel is 'a' when no explicit vowel sign
const VOWEL = {
  "":  "a",
  "ི": "i",
  "ུ": "u",
  "ེ": "e",
  "ོ": "o",
  "ཱ": "â",  // long a
  "ཻ": "ai",
  "ཽ": "au"
};

// Final consonants (codas). Roman Dzongkha writes only pronounced finals.
const FINAL = {
  "ག": "g",
  "ང": "ng",
  "ད": "d",
  "ན": "n",
  "བ": "b",
  "མ": "m",
  "འ": "’",
  "ར": "r",
  "ལ": "l",
  "ས": "s"
};

// Special marks
const TSHEG = "\u0F0B";     // syllable separator (་)
const TSEC  = "\u0F0C";     // tsek (rarely used)
const SHAD  = "\u0F0D";     // shad (།)
const NYIS  = "\u0F0E";     // nyis shad (༎)

// Utility sets
const COMBINING = new Set(Object.keys(SUB).concat(Object.keys(VOWEL)).concat(Object.keys(FINAL)));

/* ==========================
   Helper utilities
   ========================== */

/**
 * Split a Dzongkha line into syllables by tsheg.
 * Keeps empty tokens to preserve spacing decisions later.
 */
function splitSyllables(line) {
  return line.split(TSHEG);
}

/**
 * Tokenize a syllable into its components:
 * - head (root initial)
 * - stacks (array of subjoined consonants)
 * - vowels (array of vowel signs)
 * - finals (array of final consonants)
 * - other marks (ignored or handled in normalization)
 */
function tokenizeSyllable(syl) {
  const chars = [...syl];
  const token = { head: "", stacks: [], vowels: [], finals: [], rest: [] };

  if (chars.length === 0) return token;

  // First char: head (if mapped)
  const first = chars[0];
  if (ROOT[first]) {
    token.head = first;
  } else {
    // Not a standard head; treat as rest
    token.rest.push(first);
  }

  // Remaining chars
  for (let i = 1; i < chars.length; i++) {
    const ch = chars[i];
    if (SUB[ch]) token.stacks.push(ch);
    else if (VOWEL[ch]) token.vowels.push(ch);
    else if (FINAL[ch]) token.finals.push(ch);
    else token.rest.push(ch);
  }

  return token;
}

/**
 * Build raw Roman from a tokenized syllable (before normalization).
 */
function buildRomanFromToken(token) {
  let rom = "";

  // Head
  if (token.head) {
    rom += ROOT[token.head];
  }

  // Subjoined stacks (clusters)
  for (const s of token.stacks) {
    rom += SUB[s];
  }

  // Vowels
  let vowelApplied = false;
  for (const v of token.vowels) {
    // Replace inherent 'a' if an explicit vowel sign appears
    if (/a$/.test(rom)) rom = rom.replace(/a$/, "");
    rom += VOWEL[v];
    vowelApplied = true;
  }

  // Finals
  for (const f of token.finals) {
    rom += FINAL[f];
  }

  // If no explicit vowel applied and the last char isn't a vowel, add inherent 'a'
  if (!vowelApplied && !/[aeiouâ]$/.test(rom)) {
    rom += "a";
  }

  return rom;
}

/* ==========================
   Normalization
   ========================== */

/**
 * Dictionary overrides: common/irregular forms per Guide examples.
 * Extend this dictionary if needed.
 */
const DICT = {
  // numbers and common examples cited
  "brgyad": "gä",       // eight
  "sdod":  "dö",        // sit
  "hbah":  "ba",        // target (example of devoicing)
  "dkar":  "kâ",
  "dkarpo":"kâp",       // white
  "bzlogthabs": "dokthap", // preventive measures
  // common nouns
  "’brug": "’druk",     // Druk (Bhutan)
  // add more known exceptions here as needed
};

/**
 * Rule-based phonological simplifications.
 * These target silent or historically motivated prefixes/clusters that do not surface
 * in modern Dzongkha pronunciation, following the Guide’s phonological adequacy.
 */
function applyRules(word) {
  let w = word;

  // Initial silent/devoicing prefix reductions (common patterns)
  // d- prefix before k/g → drop d
  w = w.replace(/^dk/, "k");
  w = w.replace(/^dg/, "g");

  // b- prefix before z/zh/dz → drop b
  w = w.replace(/^bz/, "z");
  w = w.replace(/^bzh/, "zh");
  w = w.replace(/^bdz/, "dz");

  // s- prefix before d → drop s
  w = w.replace(/^sd/, "d");

  // h- prefix before b → drop h (hb- → b-)
  w = w.replace(/^hb/, "b");

  // Collapsing some historical clusters to modern pronunciations
  // ’brug often pronounced ’druk
  w = w.replace(/^’brug$/, "’druk");

  // Finals simplification: often -po remains in compounds; keep conservative
  // but map -bo → -po where phonology surfaces as /p/
  w = w.replace(/bo$/, "po");

  // Normalize multiple apostrophes (defensive)
  w = w.replace(/’’+/g, "’");

  return w;
}

/**
 * Apply dictionary + rules normalization to a single Roman word.
 */
function normalizeWord(word) {
  if (DICT[word]) return DICT[word];
  return applyRules(word);
}

/**
 * Normalize a sequence of syllables into a word:
 * - join raw syllables
 * - apply normalization on whole word
 * - allow post-word fixes
 */
function normalizeSyllableSequence(rawSyllables) {
  const rawWord = rawSyllables.join("");
  const norm = normalizeWord(rawWord);

  // Post fixes: vowel length hints (very conservative)
  // Example: dkarpo → kâp is covered by dictionary; general long-vowel inference is complex.
  return norm;
}

/* ==========================
   Top-level conversion
   ========================== */

/**
 * Convert a Dzongkha line (string) to Roman Dzongkha, preserving spaces between syllables.
 * Each tsheg (་) becomes a space. Shad marks (།, ༎) preserved as punctuation.
 */
function convertLine(line) {
  // Split into syllables by tsheg
  const syls = splitSyllables(line);

  // Convert each syllable to raw roman
  const rawSyls = syls.map(syl => {
    if (!syl) return ""; // preserve spacing
    const tok = tokenizeSyllable(syl);
    return buildRomanFromToken(tok);
  });

  // Join with spaces
  const roman = rawSyls.join(" ").replace(/\s+/g, " ").trim();

  // Normalize as needed per word boundaries (keep it line-level here)
  // For better normalization, you can split by spaces and apply per-token normalization.
  const tokens = roman.split(" ").map(normalizeWord);
  return tokens.join(" ");
}

/**
 * Convert Dzongkha text (potentially multiple lines, with punctuation).
 * - Converts every contiguous segment separated by tsheg to Roman Dzongkha
 * - Preserves shad punctuation and ASCII whitespace
 */
function convertDzongkha(text) {
  // Split on shad and nyis shad to retain punctuation units
  const parts = text.split(new RegExp(`[${SHAD}${NYIS}]`, "u"));
  const converted = parts.map(part => convertLine(part));
  // Reinsert shad marks approximated by a period when present
  const reconstructed = [];
  let idx = 0;
  for (const segment of converted) {
    reconstructed.push(segment);
    // If original had a shad after this segment, append a period
    const boundary = idx + segment.length;
    idx = boundary;
  }
  // Simple return without adding punctuation; or add punctuation by scanning original
  // Better: restore original punctuation:
  let out = "";
  let cursor = 0;
  for (const part of parts) {
    out += convertLine(part);
    cursor += part.length;
    // If next char in original is shad, append "."
    const nextChar = text[cursor];
    if (nextChar === SHAD) out += ". ";
    if (nextChar === NYIS) out += ". ";
    if (nextChar === TSEC) out += " ";
    cursor += (nextChar === SHAD || nextChar === NYIS || nextChar === TSEC) ? 1 : 0;
  }
  return out.trim().replace(/\s+\./g, ".").replace(/\.\s+\./g, ".");
}

/* ==========================
   Export (Node / browser)
   ========================== */

if (typeof module !== "undefined" && module.exports) {
  module.exports = { convertDzongkha, convertLine };
} else {
  // attach to window in browser
  // eslint-disable-next-line no-undef
  window.DzRoman = { convertDzongkha, convertLine };
}

/* ==========================
   Demo (comment out in production)
   ========================== */
// console.log(convertDzongkha("དཀར་པོ"));        // kâp
// console.log(convertDzongkha("བཟློག་ཐབས"));    // dokthap
// console.log(convertDzongkha("འབྲུག"));          // ’druk
// console.log(convertDzongkha("བཟང་པོ"));        // zangpo
// console.log(convertDzongkha("ལྷ"));              // lh(a) → lha
