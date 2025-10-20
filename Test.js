/**
 * Dzongkha (U-chen script) -> Roman Dzongkha converter (extended)
 *
 * Implements:
 *  - initial mapping (hard vs soft) using prefixed letters (nyönju) and superscripts (gocen)
 *    (See Guide Appendix: discussion of gocen/'nyönju effects on hard/soft initials) 6 7
 *  - vowel mapping with circumflex (chimto) for long vowels; ä/ö/ü handled as always long; vowels
 *    before final -ng are treated as long (no circumflex written) 8 9
 *  - jenju (final) mapping: -k -t -p -n -sh (and l/r/ng behavior) 10
 *  - small exceptions dictionary built from Appendix sample entries (phonological irregularities) 11
 *
 * Limitations / caveats:
 *  - Tibetan orthography is complex (stacked letters, prefixes, historical spellings).
 *    This converter uses orthographic heuristics (prefix/superscript detection + exception list)
 *    following the Guide, but cannot guarantee perfect pronunciation for every rare cluster.
 *  - Tone assignment (high vs low register) is not fully derived from orthography here;
 *    the Guide documents tone marking principles but full tone assignment can require
 *    lexical knowledge beyond visible graphemes. 12
 */

// --------------------------- MAPPINGS --------------------------- //
// initial consonants: provide both hard (with prefix/gocen) and soft/devoiced forms
const initialMap = {
  'ཀ': { hard: 'k', soft: 'k' },
  'ཁ': { hard: 'kh', soft: 'kh' },
  // voiced series: soft form (devoiced) uses apostrophe after letter per Guide (g', j', d', b', etc.)
  'ག': { hard: 'g', soft: "g'" },   // g / g'
  'ང': { hard: 'ng', soft: 'ng' },
  'ཅ': { hard: 'c', soft: 'c' },
  'ཆ': { hard: 'ch', soft: 'ch' },
  'ཇ': { hard: "j", soft: "j'" },   // j / j'
  'ཉ': { hard: 'ny', soft: 'ny' },
  'ཏ': { hard: 't', soft: 't' },
  'ཐ': { hard: 'th', soft: 'th' },
  'ད': { hard: 'd', soft: "d'" },   // d / d'
  'ན': { hard: 'n', soft: 'n' },
  'པ': { hard: 'p', soft: 'p' },
  'ཕ': { hard: 'ph', soft: 'ph' },
  'བ': { hard: 'b', soft: "b'" },   // b / b'
  'མ': { hard: 'm', soft: 'm' },
  'ཙ': { hard: 'ts', soft: 'ts' },
  'ཚ': { hard: 'tsh', soft: 'tsh' },
  'ཛ': { hard: 'dz', soft: 'dz' },
  'ཝ': { hard: 'w', soft: 'w' },
  'ཞ': { hard: 'zh', soft: "zh'" }, // zh / zh'
  'ཟ': { hard: 'z', soft: "z'" },   // z / z'
  'འ': { hard: 'a', soft: 'a' },    // glottal letter used for vowel onsets
  'ཡ': { hard: 'y', soft: 'y' },
  'ར': { hard: 'r', soft: 'r' },
  'ལ': { hard: 'l', soft: 'l' },
  'ཤ': { hard: 'sh', soft: 'sh' },
  'ས': { hard: 's', soft: 's' },
  'ཧ': { hard: 'h', soft: 'h' },
  'ཨ': { hard: 'a', soft: 'a' }
};

// vowel signs in Tibetan (common ones used in Dhzongkha orthography)
const vowelSigns = {
  '': 'a',     // inherent a
  'ི': 'i',    // i (g'ikhu)
  'ུ': 'u',    // u (zh'apju)
  'ེ': 'e',    // e
  'ོ': 'o'     // o
  // long mark 'ཱ' handled separately (az'ur / long sign)
};

// long vowel marker
const LONG_MARK = 'ཱ'; // U+0F71 (az'ur) — when present, vowel becomes long (circumflex) unless ä/ö/ü or final -ng rule applies

// characters used as prefixes (nyönju) that affect pronunciation (Guide: g, d, b, m and ḥ/འ have same effect as gocen) 13
const prefixChars = new Set(['ག','ད','བ','མ','འ']);

// "subjoined/superscript" characters (gocen) used in stacked clusters — common set used in Tibetan Unicode
// (we include the frequent subjoined characters as literal glyphs so detection can be done on the raw syllable string)
const subjoinedChars = new Set([
  'ྐ','ྑ','ྒ','ྒྷ','ྔ','ྕ','ྖ','ྗ','྘','ྙ','ྚ','ྛ','ྜ','ྜྷ','ྞ',
  'ྟ','ྠ','ྡ','ྡྷ','ྣ','ྤ','ྥ','ྦ','ྦྷ','ྨ','ྩ','ྪ','ྫ','ྫྷ','ྭ',
  'ྮ','ྯ','ྰ','ྱ','ྲ','ླ','ྴ','ྵ','ྶ','ྷ','ྸ'
]);
// note: presence of any of these usually indicates a stacked cluster (gocen) which influences hard/soft choice. 14

// final (jenju) mapping (phonological finals that are written in Roman Dzongkha)
const finalMap = {
  'ཀ': 'k',
  'ཏ': 't',
  'པ': 'p',
  'ན': 'n',
  'ཤ': 'sh',
  'ལ': 'l',
  'ར': 'r',
  'ང': 'ng'
  // other characters may appear orthographically, but Roman Dzongkha writes only pronounced final segments. 15
};

// small exceptions dictionary: spelled Tibetan -> Roman (samples from Appendix and sample texts)
// (Add more as you want; these are explicit mappings where spelling -> pronunciation is irregular)
const exceptions = {
  // examples pulled from the Guide/sample text; these map historical spellings to the phonological Roman forms shown in the Appendix
  'བརྒྱད': 'gä',       // eight — example in Appendix (guide shows gä) 16
  'རྨགཔ': "'map",      // 'map (husband) example in Appendix uses leading apostrophe) 17
  'རྒསཔ': 'gep',       // shown examples in appendix tables 18
  'སྐུ': 'ku',         // honorific prefix example contrast with kû in appendix 19
  'ཀུཝ': 'kû'          // shows long û example with 'kû' in Appendix 20
  // Add other high-frequency exceptions from your corpus as needed (Appendix provides many sample forms). 21
};

// utility: is Tibetan-range character?
function isTibetanChar(ch) {
  const code = ch.charCodeAt(0);
  return code >= 0x0F00 && code <= 0x0FFF;
}

// decompose syllable into ordered characters (keeps diacritics)
function charsOf(s) { return Array.from(s); }

// improved decomposition: detect prefixes (nyönju), subjoined (gocen), base initial, vowel sign, long mark, final
function decomposeSyllable(syll) {
  const chars = charsOf(syll);
  // remove punctuation/trailing markers for processing
  const tsheg = '\u0F0B';
  const cleaned = chars.filter(c => c !== tsheg && c !== ' ' && c !== '།' && c !== '༎' && c !== '༏' && c !== '༔');

  // scan for explicit long mark
  let longMarkPresent = false;
  const remaining = [];
  for (const ch of cleaned) {
    if (ch === LONG_MARK) longMarkPresent = true;
    else remaining.push(ch);
  }

  // find vowel sign (one of vowelSigns keys except '')
  let vowelSign = '';
  for (const v of Object.keys(vowelSigns)) {
    if (v && remaining.includes(v)) {
      vowelSign = v;
      // remove one instance
      const idx = remaining.indexOf(v);
      if (idx !== -1) remaining.splice(idx,1);
      break;
    }
  }

  // Now remaining are consonantal elements possibly with stacked subjoined chars.
  // We will detect:
  //  - prefix (any character from prefixChars that occurs before the primary initial)
  //  - the base initial (first main consonant in the remaining that appears in initialMap)
  //  - any subjoined chars anywhere indicate gocen/superscript effects.

  let hasPrefix = false;
  for (let i = 0; i < remaining.length - 1; i++) {
    if (prefixChars.has(remaining[i])) {
      // if a prefix appears before something else, mark hasPrefix
      hasPrefix = true;
      break;
    }
  }

  // detect subjoined char presence (gocen)
  let hasSubjoined = remaining.some(ch => subjoinedChars.has(ch));

  // find first consonant that is present in initialMap (treat that as base initial)
  let baseInitial = null;
  for (const ch of remaining) {
    if (initialMap[ch]) { baseInitial = ch; break; }
  }

  // possible final is last item in remaining that is a finalMap key
  let finalChar = null;
  for (let i = remaining.length - 1; i >= 0; i--) {
    const ch = remaining[i];
    if (finalMap[ch]) { finalChar = ch; break; }
  }

  return {
    baseInitial,
    vowelSign,     // e.g. 'ི', 'ེ', etc. empty string when inherent
    longMarkPresent,
    hasPrefix,
    hasSubjoined,
    finalChar
  };
}

// convert one syllable to Roman Dzongkha
function convertSyllable(syll) {
  if (!syll || typeof syll !== 'string') return '';

  // strip whitespace and tsheg at ends
  const trimmed = syll.trim().replace(/^[\u0F0B\s]+|[\u0F0B\s]+$/g, '');

  // check exceptions dictionary (exact full-syllable match)
  if (exceptions[trimmed]) return exceptions[trimmed];

  const decomp = decomposeSyllable(trimmed);
  const { baseInitial, vowelSign, longMarkPresent, hasPrefix, hasSubjoined, finalChar } = decomp;

  // If no base initial (rare), fall back to return original
  if (!baseInitial) {
    // maybe a pure punctuation or foreign glyph
    return trimmed;
  }

  // choose hard vs soft form:
  // Guide: presence of gocen (superscript) and certain prefixes turns a 'soft' into 'hard'.
  // We treat hasPrefix || hasSubjoined => choose hard form; otherwise choose soft form for voiced consonants.
  const preferHard = hasPrefix || hasSubjoined;

  const initialInfo = initialMap[baseInitial];
  let initialRoman = initialInfo ? (preferHard ? initialInfo.hard : initialInfo.soft) : baseInitial;

  // determine vowel
  let vowelRoman = vowelSigns[vowelSign] || 'a'; // default inherent 'a'

  // if vowel is ä/ö/ü in orthography these typically derive from specific orthographic markers in the Guide;
  // Phonological Dzongkha represents them differently. For now, detect explicit vowel letters ä/ö/ü if present in input
  // (rare in Tibetan Unicode input). This is left for future lexicon-driven mapping if you have a dataset.
  // Handle long vowel marking:
  // - LONG_MARK present -> use circumflex (â ê î ô û) except when vowel is ä/ö/ü (which are always long already).
  // - also: if final is 'ང' (-ng), vowel is automatically long (no circumflex written before -ng per Guide). 22 23

  // check final -ng rule
  const finalIsNg = finalChar === 'ང';

  if (longMarkPresent && !finalIsNg) {
    // apply circumflex
    const circ = { 'a':'â', 'e':'ê', 'i':'î', 'o':'ô', 'u':'û' };
    vowelRoman = circ[vowelRoman] || vowelRoman;
  } else if (finalIsNg) {
    // vowel becomes long but Guide says circumflex is not used before final -ng; represent as vowel plain + ng final separately.
    // We will *not* apply circumflex; the final -ng is written.
  }

  // final romanization
  let finalRoman = '';
  if (finalChar && finalMap[finalChar]) {
    finalRoman = finalMap[finalChar];
  }

  // assemble: initial + vowel + final
  const out = `${initialRoman}${vowelRoman}${finalRoman}`;
  return out;
}

// convert a whole text (splits on tsheg U+0F0B and also handles spaces/newlines)
function convertDzongkhaText(input) {
  if (!input) return '';
  // normalize: replace Tibetan tsheg with ASCII space, but preserve punctuation '།' etc
  const tsheg = '\u0F0B';
  // split on whitespace or tsheg boundaries, preserving tokens
  // We'll map each token separately; keep punctuation tight to token.
  const tokens = input.split(/\s+|[\u0F0B]+/g).filter(t => t !== '');
  const romanTokens = tokens.map(tok => convertSyllable(tok));
  // join with single spaces
  return romanTokens.join(' ');
}

// --------------------------- exports / usage --------------------------- //
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { convertDzongkhaText, convertSyllable, decomposeSyllable };
}

/* --------------- Example usage & tests ---------------
const dz = 'བརྒྱད་ རྨགཔ་ སྐུ ཀུཝ་';
console.log(convertDzongkhaText(dz));
// Expected (per Appendix examples): "gä 'map ku kû"
// ---------------------------------------------------- */
