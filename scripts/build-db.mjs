#!/usr/bin/env node
/**
 * Build the word bank SQLite database from ECDICT.
 *
 * Usage:
 *   node scripts/build-db.mjs
 *
 * Input : data/ecdict.csv  (https://github.com/skywind3000/ECDICT, MIT)
 * Output: data/vocab.db, data/vocab.db.gz, data/bank-meta.json
 */

import { existsSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { gzipSync } from "node:zlib";
import { DatabaseSync } from "node:sqlite";

import {
  cleanPhonetic,
  cleanTranslation,
  mulberry32,
  normalizeWord,
  parseTags,
  sensesOverlap,
  shuffleInPlace,
} from "./lib/clean.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DATA_DIR = path.join(ROOT, "data");
const CSV_PATH = path.join(DATA_DIR, "ecdict.csv");
const DB_PATH = path.join(DATA_DIR, "vocab.db");
const GZ_PATH = path.join(DATA_DIR, "vocab.db.gz");
const META_PATH = path.join(DATA_DIR, "bank-meta.json");

const ALL_SIZE = 12000;

const BOOKS = [
  { slug: "all", name: "综合词汇", tag: null, target: 12000, limit: ALL_SIZE },
  { slug: "cet4", name: "四级 CET-4", tag: "cet4", target: 4500 },
  { slug: "cet6", name: "六级 CET-6", tag: "cet6", target: 6000 },
  { slug: "kaoyan", name: "考研英语", tag: "ky", target: 5500 },
  { slug: "toefl", name: "托福 TOEFL", tag: "toefl", target: 8000 },
  { slug: "ielts", name: "雅思 IELTS", tag: "ielts", target: 7000 },
  { slug: "gre", name: "GRE", tag: "gre", target: 10000 },
];

function probit(p) {
  if (p <= 0) return -Infinity;
  if (p >= 1) return Infinity;
  const a = [
    -3.969683028665376e1, 2.209460984245205e2, -2.759285104469687e2,
    1.38357751867269e2, -3.066479806614716e1, 2.506628277459239,
  ];
  const b = [
    -5.447609879822406e1, 1.615858368580409e2, -1.556989798598866e2,
    6.680131188771972e1, -1.328068155288572e1,
  ];
  const c = [
    -7.784894002430293e-3, -3.223964580411365e-1, -2.400758277161838,
    -2.549732539343734, 4.374664141464968, 2.938163982698783,
  ];
  const d = [
    7.784695709041462e-3, 3.224671290700398e-1, 2.445134137142996,
    3.754408661907416,
  ];
  const plow = 0.02425;
  const phigh = 1 - plow;
  let q;
  let r;

  if (p < plow) {
    q = Math.sqrt(-2 * Math.log(p));
    return (
      (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) /
      ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1)
    );
  }
  if (p > phigh) {
    q = Math.sqrt(-2 * Math.log(1 - p));
    return -(
      (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) /
      ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1)
    );
  }
  q = p - 0.5;
  r = q * q;
  return (
    ((((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) * q) /
    (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1)
  );
}

function difficultyForRank(rank, size) {
  const percentile = Math.min(0.998, Math.max(0.002, (rank - 0.5) / size));
  return Math.min(3.4, Math.max(-3.4, probit(percentile) * 1.55));
}

/**
 * Minimal streaming-safe CSV reader. ECDICT has quoted fields with commas
 * and escaped quotes, so splitting on commas/newlines is not enough.
 */
function* csvRows(text) {
  const source = text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
  let row = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < source.length; i += 1) {
    const char = source[i];

    if (inQuotes) {
      if (char === '"') {
        if (source[i + 1] === '"') {
          field += '"';
          i += 1;
        } else {
          inQuotes = false;
        }
      } else {
        field += char;
      }
      continue;
    }

    if (char === '"') {
      inQuotes = true;
    } else if (char === ",") {
      row.push(field);
      field = "";
    } else if (char === "\n") {
      row.push(field);
      field = "";
      yield row;
      row = [];
    } else if (char !== "\r") {
      field += char;
    }
  }

  if (field.length > 0 || row.length > 0) {
    row.push(field);
    yield row;
  }
}

function buildDistractors(entry, index, entries, random) {
  const correctSenses = entry.translation.split("；");
  const length = entry.translation.length;
  const radius = Math.max(220, Math.round(entries.length * 0.06));
  let candidates = [];
  const seenText = new Set();

  const collect = (windowRadius, samePosOnly) => {
    const start = Math.max(0, index - windowRadius);
    const end = Math.min(entries.length, index + windowRadius + 1);
    for (let i = start; i < end; i += 1) {
      if (i === index) continue;
      const candidate = entries[i];
      if (samePosOnly && candidate.pos !== entry.pos) continue;
      if (candidate.word.slice(0, 4) === entry.word.slice(0, 4)) continue;
      if (candidate.translation === entry.translation) continue;
      if (seenText.has(candidate.translation)) continue;
      if (sensesOverlap(candidate.translation, correctSenses)) continue;
      const ratio = candidate.translation.length / length;
      if (ratio < 0.45 || ratio > 2.2) continue;
      seenText.add(candidate.translation);
      candidates.push(candidate);
    }
  };

  collect(radius, true);
  if (candidates.length < 12) collect(radius * 3, true);
  if (candidates.length < 12) collect(radius, false);
  if (candidates.length < 12) collect(entries.length, false);

  if (candidates.length < 3) {
    // Last-resort fallback: any distinct gloss, ignoring length and POS.
    for (const candidate of entries) {
      if (candidate.id === entry.id) continue;
      if (candidate.translation === entry.translation) continue;
      if (sensesOverlap(candidate.translation, correctSenses)) continue;
      if (seenText.has(candidate.translation)) continue;
      seenText.add(candidate.translation);
      candidates.push(candidate);
      if (candidates.length >= 3) break;
    }
  }

  if (candidates.length < 3) return null;

  shuffleInPlace(candidates, random);
  const chosen = [];
  const used = new Set([entry.translation]);
  for (const candidate of candidates) {
    if (used.has(candidate.translation)) continue;
    used.add(candidate.translation);
    chosen.push(candidate.translation);
    if (chosen.length === 3) break;
  }
  return chosen.length === 3 ? chosen : null;
}

async function main() {
  if (!existsSync(CSV_PATH)) {
    console.error("Missing data/ecdict.csv.");
    console.error("Download it from https://github.com/skywind3000/ECDICT (MIT license).");
    process.exit(1);
  }

  mkdirSync(DATA_DIR, { recursive: true });
  console.log("Reading ECDICT CSV …");
  const csvText = readFileSync(CSV_PATH, "utf8");
  const iterator = csvRows(csvText);
  const headerRow = iterator.next().value;
  if (!headerRow) throw new Error("ECDICT CSV is empty");

  const columns = new Map(headerRow.map((name, index) => [String(name).trim(), index]));
  for (const required of ["word", "phonetic", "translation", "tag", "bnc", "frq"]) {
    if (!columns.has(required)) {
      throw new Error(`ECDICT CSV is missing the "${required}" column`);
    }
  }

  const deduped = new Map();
  let rawRows = 0;
  let missingRank = 0;
  let missingTranslation = 0;

  for (const row of iterator) {
    rawRows += 1;
    const column = (name) => row[columns.get(name)] ?? "";
    const tags = parseTags(column("tag"));
    if (tags.length === 0) continue;
    const word = normalizeWord(column("word"));
    if (!word) continue;

    const frq = Number.parseInt(column("frq"), 10) || 0;
    const bnc = Number.parseInt(column("bnc"), 10) || 0;
    const rank = frq > 0 ? frq : bnc;
    if (rank <= 0) {
      missingRank += 1;
      continue;
    }

    const cleaned = cleanTranslation(column("translation"));
    if (!cleaned) {
      missingTranslation += 1;
      continue;
    }

    const existing = deduped.get(word);
    if (!existing) {
      deduped.set(word, {
        word,
        phonetic: cleanPhonetic(column("phonetic")),
        translation: cleaned.text,
        pos: cleaned.pos,
        rank,
        bnc,
        frq,
        tags: new Set(tags),
      });
      continue;
    }

    existing.tags = new Set([...existing.tags, ...tags]);
    if (rank < existing.rank) {
      existing.rank = rank;
      existing.bnc = bnc;
      existing.frq = frq;
    }
    if (!existing.phonetic) existing.phonetic = cleanPhonetic(column("phonetic"));
  }

  console.log(`  ${rawRows.toLocaleString()} raw rows`);

  const entries = [...deduped.values()]
    .filter((entry) => entry.translation && entry.word)
    .sort((left, right) => left.rank - right.rank || left.word.localeCompare(right.word));

  entries.forEach((entry, index) => {
    entry.id = index + 1;
  });

  console.log(`  ${entries.length.toLocaleString()} unique study words after cleaning`);
  console.log(`  skipped: ${missingRank} unranked, ${missingTranslation} without a usable gloss`);

  console.log("Generating distractors …");
  const random = mulberry32(20261017);
  let distractorFailures = 0;

  for (let i = 0; i < entries.length; i += 1) {
    const entriesWithOptions = buildDistractors(entries[i], i, entries, random);
    if (!entriesWithOptions) {
      distractorFailures += 1;
      entries[i].distractors = null;
    } else {
      entries[i].distractors = entriesWithOptions;
    }
    if ((i + 1) % 5000 === 0) console.log(`  ${i + 1} / ${entries.length}`);
  }

  const usable = entries.filter((entry) => entry.distractors);
  usable.forEach((entry, index) => {
    entry.id = index + 1;
  });
  console.log(`  ${usable.length.toLocaleString()} words with 3 distractors (${distractorFailures} dropped)`);

  const bookRows = [];
  for (const book of BOOKS) {
    let pool;
    if (book.slug === "all") {
      pool = usable.slice(0, ALL_SIZE);
    } else {
      pool = usable.filter((entry) => entry.tags.has(book.tag));
    }
    if (pool.length < 200) {
      throw new Error(`Book ${book.slug} would only contain ${pool.length} words`);
    }
    pool.forEach((entry, index) => {
      bookRows.push({
        book: book.slug,
        wordId: entry.id,
        rank: index + 1,
        difficulty: difficultyForRank(index + 1, pool.length),
      });
    });
    book.size = pool.length;
  }

  if (existsSync(DB_PATH)) rmSync(DB_PATH);
  if (existsSync(`${DB_PATH}-wal`)) rmSync(`${DB_PATH}-wal`);
  if (existsSync(`${DB_PATH}-shm`)) rmSync(`${DB_PATH}-shm`);

  console.log("Writing SQLite database …");
  const db = new DatabaseSync(DB_PATH);
  db.exec("PRAGMA journal_mode = MEMORY;");
  db.exec("PRAGMA synchronous = OFF;");
  db.exec(`
    CREATE TABLE meta (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
    CREATE TABLE words (
      id INTEGER PRIMARY KEY,
      word TEXT NOT NULL UNIQUE,
      phonetic TEXT NOT NULL,
      translation TEXT NOT NULL,
      pos TEXT NOT NULL,
      rank INTEGER NOT NULL,
      bnc INTEGER NOT NULL,
      frq INTEGER NOT NULL,
      tags TEXT NOT NULL,
      distractors TEXT NOT NULL
    );
    CREATE TABLE books (
      slug TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      size INTEGER NOT NULL,
      target INTEGER NOT NULL
    );
    CREATE TABLE book_words (
      book TEXT NOT NULL,
      word_id INTEGER NOT NULL,
      book_rank INTEGER NOT NULL,
      difficulty REAL NOT NULL,
      PRIMARY KEY (book, word_id)
    );
    CREATE INDEX idx_book_words_rank ON book_words (book, book_rank);
    CREATE TABLE tests (
      id TEXT PRIMARY KEY,
      scope TEXT NOT NULL,
      length INTEGER NOT NULL,
      theta REAL NOT NULL,
      se REAL NOT NULL,
      current_word_id INTEGER,
      responses TEXT NOT NULL DEFAULT '[]',
      status TEXT NOT NULL DEFAULT 'active',
      result TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      finished_at TEXT
    );
    CREATE INDEX idx_tests_created ON tests (created_at);
  `);

  db.exec("BEGIN");
  const insertWord = db.prepare(
    "INSERT INTO words (id, word, phonetic, translation, pos, rank, bnc, frq, tags, distractors) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
  );
  for (const entry of usable) {
    insertWord.run(
      entry.id,
      entry.word,
      entry.phonetic,
      entry.translation,
      entry.pos,
      entry.rank,
      entry.bnc,
      entry.frq,
      [...entry.tags].sort().join(" "),
      JSON.stringify(entry.distractors),
    );
  }

  const insertBook = db.prepare("INSERT INTO books (slug, name, size, target) VALUES (?, ?, ?, ?)");
  for (const book of BOOKS) {
    insertBook.run(book.slug, book.name, book.size, book.target);
  }

  const insertBookWord = db.prepare(
    "INSERT INTO book_words (book, word_id, book_rank, difficulty) VALUES (?, ?, ?, ?)",
  );
  for (const row of bookRows) {
    insertBookWord.run(row.book, row.wordId, row.rank, row.difficulty);
  }

  const meta = {
    version: 1,
    builtAt: new Date().toISOString(),
    source: "ECDICT",
    sourceUrl: "https://github.com/skywind3000/ECDICT",
    license: "MIT",
    totalWords: usable.length,
    books: BOOKS.map((book) => ({
      slug: book.slug,
      name: book.name,
      size: book.size,
      target: book.target,
    })),
  };

  const insertMeta = db.prepare("INSERT INTO meta (key, value) VALUES (?, ?)");
  insertMeta.run("bank", JSON.stringify(meta));
  insertMeta.run("version", "1");
  db.exec("COMMIT");
  db.exec("PRAGMA optimize;");
  db.close();

  console.log("Compressing snapshot …");
  const dbBytes = readFileSync(DB_PATH);
  const gzBytes = gzipSync(dbBytes, { level: 9 });
  writeFileSync(GZ_PATH, gzBytes);
  writeFileSync(META_PATH, `${JSON.stringify(meta, null, 2)}\n`);

  const dbSize = statSync(DB_PATH).size / 1024 / 1024;
  const gzSize = statSync(GZ_PATH).size / 1024 / 1024;
  console.log("");
  console.log(`Done. ${usable.length.toLocaleString()} words, ${bookRows.length.toLocaleString()} book entries.`);
  for (const book of BOOKS) {
    console.log(`  ${book.slug.padEnd(7)} ${String(book.size).padStart(6)} words  (target ${book.target})`);
  }
  console.log(`  database ${dbSize.toFixed(1)} MB → ${gzSize.toFixed(1)} MB gzipped`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
