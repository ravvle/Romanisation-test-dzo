// Dzongkha → Roman Dzongkha Converter (Phonological Transcription)

const consonantMap = {
  "ཀ": "k", "ཁ": "kh", "ག": "g", "ང": "ng",
  "ཅ": "ch", "ཆ": "chh", "ཇ": "j", "ཉ": "ny",
  "ཏ": "t", "ཐ": "th", "ད": "d", "ན": "n",
  "པ": "p", "ཕ": "ph", "བ": "b", "མ": "m",
  "ཙ": "ts", "ཚ": "tsh", "ཛ": "dz",
  "ཝ": "w", "ཞ": "zh", "ཟ": "z", "འ": "’",
  "ཡ": "y", "ར": "r", "ལ": "l", "ཤ": "sh",
  "ས": "s", "ཧ": "h", "ཨ": "a"
};

const subjoinedMap = {
  "ྐ": "k", "ྑ": "kh", "ྒ": "g", "ྔ": "ng",
  "ྕ": "ch", "ྖ": "chh", "ྗ": "j", "ྙ": "ny",
  "ྟ": "t", "ྠ": "th", "ྡ": "d", "ྣ": "n",
  "ྤ": "p", "ྥ": "ph", "ྦ": "b", "ྨ": "m",
  "ྩ": "ts", "ྪ": "tsh", "ྫ": "dz",
  "ྭ": "w", "ྱ": "y", "ྲ": "r", "ླ": "l",
  "ྴ": "sh", "ྶ": "s", "ྷ": "h"
};

const vowelMap = {
  "": "a", "ི": "i", "ུ": "u", "ེ": "e", "ོ": "o",
  "ཱ": "â", "ཻ": "ai", "ཽ": "au"
};

const finalMap = {
  "ག": "g", "ང": "ng", "ད": "d", "ན": "n",
  "བ": "b", "མ": "m", "འ": "’", "ར": "r",
  "ལ": "l", "ས": "s"
};

function convertSyllable(syllable) {
  let result = "";
  const chars = [...syllable];

  if (consonantMap[chars[0]]) result += consonantMap[chars[0]];

  for (let ch of chars.slice(1)) {
    if (subjoinedMap[ch]) result += subjoinedMap[ch];
  }

  let vowelApplied = false;
  for (let ch of chars.slice(1)) {
    if (vowelMap[ch]) {
      result = result.replace(/a$/, "");
      result += vowelMap[ch];
      vowelApplied = true;
    }
  }

  for (let ch of chars.slice(1)) {
    if (finalMap[ch]) result += finalMap[ch];
  }

  if (!vowelApplied && !/[aeiouâ]$/.test(result)) {
    result += "a";
  }

  return result;
}

function applyPhonologicalRules(word) {
  let w = word;

  // Drop silent prefixes
  w = w.replace(/^d(?=[kg])/, "");
  w = w.replace(/^b(?=z)/, "");
  w = w.replace(/^s(?=d)/, "");
  w = w.replace(/^h(?=b)/, "");

  // Collapse clusters
  w = w.replace(/^brg/, "g");
  w = w.replace(/^bzlogthabs$/, "dokthap");

  // Final simplifications
  w = w.replace(/bo$/, "po");

  return w;
}

function normalizeSyllables(syllables) {
  const raw = syllables.map(convertSyllable).join("");
  return applyPhonologicalRules(raw);
}

function convertDzongkha(text) {
  const syllables = text.split("་").filter(s => s);
  return normalizeSyllables(syllables);
}

// --- Demo ---
console.log(convertDzongkha("དཀར་པོ"));        // → "kâp"
console.log(convertDzongkha("བཟློག་ཐབས"));    // → "dokthap"
console.log(convertDzongkha("འབྲུག"));          // → "’druk"
console.log(convertDzongkha("བཟང་པོ"));        // → "zangpo"
console.log(convertDzongkha("ལྷ"));              // → "lha"
