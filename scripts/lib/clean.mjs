/**
 * Shared text helpers for turning ECDICT rows into test-ready vocab items.
 * Deliberately dependency-free so the seed script can run on plain Node.
 */

export const STUDY_TAGS = [
  "zk",
  "gk",
  "cet4",
  "cet6",
  "ky",
  "toefl",
  "ielts",
  "gre",
];

export const STUDY_TAG_SET = new Set(STUDY_TAGS);

const POS_WORDS = new Set([
  "n",
  "v",
  "vt",
  "vi",
  "adj",
  "adv",
  "a",
  "ad",
  "prep",
  "conj",
  "pron",
  "num",
  "art",
  "int",
  "aux",
  "abbr",
  "pl",
]);

export function normalizeWord(raw) {
  if (!raw) return null;
  const word = String(raw).trim().toLowerCase();
  if (!/^[a-z][a-z-]{1,23}$/.test(word)) return null;
  if (word.includes("--") || word.endsWith("-")) return null;
  return word;
}

export function parseTags(raw) {
  if (!raw) return [];
  return String(raw)
    .trim()
    .split(/\s+/)
    .filter((tag) => STUDY_TAG_SET.has(tag));
}

export function posFamily(raw) {
  if (!raw) return "other";
  const value = String(raw).toLowerCase();
  if (value === "n" || value === "pl") return "n";
  if (value === "v" || value === "vt" || value === "vi") return "v";
  if (value === "a" || value === "adj") return "adj";
  if (value === "ad" || value === "adv") return "adv";
  if (POS_WORDS.has(value)) return value;
  return "other";
}

function stripEscapes(raw) {
  return String(raw)
    .replace(/\\r\\n/g, "\n")
    .replace(/\\n/g, "\n")
    .replace(/\\r/g, "\n")
    .replace(/\r\n?/g, "\n");
}

function stripLatinParentheticals(text) {
  // "(item 的复数形式)" is a dead giveaway in a multiple-choice option.
  return text
    .replace(/\([^()]*[A-Za-z][^()]*\)/g, "")
    .replace(/（[^（）]*[A-Za-z][^（）]*）/g, "")
    .replace(/\s{2,}/g, " ");
}

function splitTopLevel(text) {
  const parts = [];
  let buffer = "";
  let depth = 0;

  for (const char of text) {
    if (char === "(" || char === "（" || char === "[") {
      depth += 1;
    } else if (char === ")" || char === "）" || char === "]") {
      depth = Math.max(0, depth - 1);
    }

    if (depth === 0 && (char === ";" || char === "；" || char === "," || char === "，")) {
      if (buffer.trim()) parts.push(buffer.trim());
      buffer = "";
    } else {
      buffer += char;
    }
  }

  if (buffer.trim()) parts.push(buffer.trim());
  return parts;
}

export function truncateAtBoundary(text, maxLength) {
  if (text.length <= maxLength) return text;
  const cut = text.slice(0, maxLength);
  const index = Math.max(cut.lastIndexOf("；"), cut.lastIndexOf("，"));
  const base = index >= 8 ? cut.slice(0, index) : cut;
  return `${base.replace(/[；，]$/, "")}…`;
}

/**
 * Turn a raw ECDICT translation into a concise multiple-choice option.
 * Returns null when no usable Chinese gloss exists.
 */
export function cleanTranslation(raw, options = {}) {
  const { maxSenses = 2, maxLength = 30 } = options;
  if (!raw) return null;

  const lines = stripEscapes(raw).split(/\n+/);
  let pos = "other";
  let senses = [];

  for (const rawLine of lines) {
    let line = rawLine.trim();
    if (!line) continue;
    if (/^\[(网络|人名)\]/i.test(line)) continue;
    if (/人名/.test(line)) continue;
    if (line.startsWith("[") && line.indexOf("]") <= 10) {
      line = line.slice(line.indexOf("]") + 1).trim();
    }
    if (!line) continue;

    const posMatch = line.match(/^(n|v|vt|vi|adj|adv|a|ad|prep|conj|pron|num|art|int|aux|abbr|pl)\.\s*/i);
    if (posMatch) {
      pos = posFamily(posMatch[1]);
      line = line.slice(posMatch[0].length);
    }

    line = stripLatinParentheticals(line)
      .replace(/\s+/g, " ")
      .replace(/^[，,；;、:：\-–—\s]+|[，,；;、:：\-–—\s]+$/g, "")
      .trim();

    if (!line) continue;
    if (!/[\u3400-\u9fff]/.test(line)) continue;

    const candidates = splitTopLevel(line)
      .map((part) =>
        part
          .replace(/[。!！?？]+$/g, "")
          .replace(/^[，,；;、:：\-–—\s]+|[，,；;、:：\-–—\s]+$/g, "")
          .trim(),
      )
      .filter((part) => part.length >= 1 && /[\u3400-\u9fff]/.test(part));

    if (candidates.length === 0) continue;

    for (const candidate of candidates) {
      if (!senses.includes(candidate)) senses.push(candidate);
      if (senses.length >= maxSenses) break;
    }

    // The first usable line is normally the primary part of speech. Mixing
    // noun and verb glosses makes options confusing, so stop here.
    if (senses.length > 0) break;
  }

  if (senses.length === 0) return null;

  const text = truncateAtBoundary(senses.join("；"), maxLength);
  return { text, pos };
}

export function cleanPhonetic(raw) {
  if (!raw) return "";
  return String(raw).trim().replace(/^[,;/\s]+|[,;/\s]+$/g, "").slice(0, 60);
}

export function sensesOverlap(left, rightSenses) {
  const leftSenses = new Set(left.split("；"));
  for (const sense of rightSenses) {
    if (!sense) continue;
    if (leftSenses.has(sense)) return true;
  }
  return false;
}

/** Deterministic PRNG so every rebuild produces the same distractors. */
export function mulberry32(seed) {
  let state = seed >>> 0;
  return function random() {
    state |= 0;
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function shuffleInPlace(array, random) {
  for (let i = array.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}
