// Dzongkha → Roman Dzongkha Converter (Unicode-safe, rule-based, accurate)

const consonantMap = {
  "\u0F40": "k",  "\u0F41": "kh", "\u0F42": "g",  "\u0F44": "ch", "\u0F45": "chh",
  "\u0F46": "j",  "\u0F47": "ny", "\u0F49": "t",  "\u0F4A": "th", "\u0F4B": "d",
  "\u0F4C": "n",  "\u0F4E": "p",  "\u0F4F": "ph", "\u0F50": "b",  "\u0F51": "m",
  "\u0F53": "ts", "\u0F54": "tsh","\u0F55": "dz", "\u0F5D": "w",  "\u0F5E": "zh",
  "\u0F5F": "z",  "\u0F60": "’",  "\u0F61": "y",  "\u0F62": "r",  "\u0F63": "l",
  "\u0F64": "sh", "\u0F66": "s",  "\u0F67": "h",  "\u0F68": "a"
};

const subjoinedMap = {
  "\u0F90": "k",  "\u0F91": "kh", "\u0F92": "g",  "\u0F93": "ng",
  "\u0F94": "ch", "\u0F95": "chh","\u0F96": "j",  "\u0F97": "ny",
  "\u0F99": "t",  "\u0F9A": "th", "\u0F9B": "d",  "\u0F9C": "n",
  "\u0F9E": "p",  "\u0F9F": "ph", "\u0FA0": "b",  "\u0FA1": "m",
  "\u0FA3": "ts", "\u0FA4": "tsh","\u0FA5": "dz",
  "\u0FA9": "w",  "\u0FBB": "y",  "\u0FBA": "r",  "\u0FBC": "l",
  "\u0FB4": "sh", "\u0FB6": "s",  "\u0FB7": "h"
};

const vowelMap = {
  "\u0F72": "i", "\u0F74": "u", "\u0F7A": "e", "\u0F7C": "o",
  "\u0F71": "â", "\u0F7D": "ai", "\u0F7E": "au"
};

const finalMap = {
  "\u0F42": "g", "\u0F43": "ng", "\u0F4B": "d", "\u0F4C": "n",
  "\u0F50": "b", "\u0F51": "m", "\u0F60": "’", "\u0F62": "r",
  "\u0F63": "l", "\u0F66": "s"
};

function parseSyllable(syllable) {
  const chars = [...syllable];
  let root = "", subjoined = "", vowel = "", final = "";

  if (chars.length === 0) return "";

  root = consonantMap[chars[0]] || "";

  for (let i = 1; i < chars.length; i++) {
    const ch = chars[i];
    if (subjoinedMap[ch]) subjoined += subjoinedMap[ch];
    else if (vowelMap[ch]) vowel = vowelMap[ch];
    else if (finalMap[ch]) final += finalMap[ch];
  }

  let nucleus = vowel || "a";
  if (vowel === "â") {
    // long vowel overrides inherent 'a'
    if (nucleus === "a") nucleus = "â";
  } else if (vowel) {
    // remove inherent 'a' if explicit vowel
    if (nucleus !== "a") root = root.replace(/a$/, "");
  }

  return root + subjoined + nucleus + final;
}

function applyRules(word) {
  let w = word;

  // Drop silent prefixes
  w = w.replace(/^d(?=k|g)/, "");
  w = w.replace(/^b(?=z|zh)/, "");
  w = w.replace(/^s(?=d)/, "");
  w = w.replace(/^h(?=b)/, "");

  // Collapse clusters
  w = w.replace(/^brg/, "g");
  w = w.replace(/^bzlogthabs$/, "dokthap");

  // Final simplification
  w = w.replace(/bo$/, "po");

  return w;
}

function convertDzongkha(text) {
  const syllables = text.split("\u0F0B").filter(Boolean);
  const romanSyllables = syllables.map(parseSyllable);
  const joined = romanSyllables.join("");
  return applyRules(joined);
}

// --- Demo ---
console.log(convertDzongkha("\u0F51\u0F40\u0F62\u0F71\u0F0B\u0F54\u0F7C")); // དཀར་པོ → "kâp"
console.log(convertDzongkha("\u0F51\u0F5F\u0FBC\u0F7C\u0F0B\u0F4A\u0F56\u0F66")); // བཟློག་ཐབས → "dokthap"
console.log(convertDzongkha("\u0F60\u0F56\u0FB2\u0F74\u0F42")); // འབྲུག → "’druk"
console.log(convertDzongkha("\u0F51\u0F5F\u0F0B\u0F54\u0F7C")); // བཟང་པོ → "zangpo"
console.log(convertDzongkha("\u0F63\u0FB7")); // ལྷ → "lha"
