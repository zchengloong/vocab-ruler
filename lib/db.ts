import "server-only";

import { DatabaseSync } from "node:sqlite";
import path from "node:path";

import { getScope, SCOPES } from "@/lib/books";
import type { ScopeSlug } from "@/lib/books";
import { percentileBand } from "@/lib/irt";

const DB_PATH =
  process.env.VOCAB_DB_PATH ?? path.join(process.cwd(), "data", "vocab.db");

export type PoolWord = {
  id: number;
  word: string;
  phonetic: string;
  translation: string;
  pos: string;
  difficulty: number;
  percentile: number;
  band: string;
  distractors: string[];
};

export type BookRecord = {
  slug: ScopeSlug;
  name: string;
  size: number;
  target: number;
};

export type TestRow = {
  id: string;
  scope: ScopeSlug;
  length: number;
  theta: number;
  se: number;
  current_word_id: number | null;
  responses: string;
  status: "active" | "done";
  result: string | null;
  created_at: string;
  updated_at: string;
  finished_at: string | null;
};

type GlobalDb = typeof globalThis & {
  __vocabRulerDb?: DatabaseSync;
  __vocabRulerPools?: Map<string, PoolWord[]>;
  __vocabRulerBooks?: Map<string, BookRecord>;
};

const globalDb = globalThis as GlobalDb;

const TEST_SCHEMA = `
  CREATE TABLE IF NOT EXISTS tests (
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
  CREATE INDEX IF NOT EXISTS idx_tests_created ON tests (created_at);
`;

export function getDb(): DatabaseSync {
  if (!globalDb.__vocabRulerDb) {
    const db = new DatabaseSync(DB_PATH);
    db.exec("PRAGMA journal_mode = WAL;");
    db.exec("PRAGMA busy_timeout = 4000;");
    db.exec(TEST_SCHEMA);
    globalDb.__vocabRulerDb = db;
  }
  return globalDb.__vocabRulerDb;
}

function readBooks(): Map<string, BookRecord> {
  if (!globalDb.__vocabRulerBooks) {
    const rows = getDb()
      .prepare("SELECT slug, name, size, target FROM books")
      .all() as unknown as Array<{
      slug: string;
      name: string;
      size: number;
      target: number;
    }>;

    const map = new Map<string, BookRecord>();
    for (const row of rows) {
      map.set(row.slug, {
        slug: row.slug as ScopeSlug,
        name: row.name,
        size: row.size,
        target: row.target,
      });
    }
    globalDb.__vocabRulerBooks = map;
  }
  return globalDb.__vocabRulerBooks;
}

export function getBookRecord(slug: string): BookRecord | null {
  return readBooks().get(slug) ?? null;
}

export function getBooksWithSizes(): Array<{
  slug: ScopeSlug;
  name: string;
  short: string;
  english: string;
  blurb: string;
  size: number;
  target: number;
}> {
  return SCOPES.map((scope) => {
    const record = getBookRecord(scope.slug);
    if (!record) {
      throw new Error(
        `The word bank is missing the "${scope.slug}" list. Run: npm run db:build`,
      );
    }
    return {
      slug: scope.slug,
      name: scope.name,
      short: scope.short,
      english: scope.english,
      blurb: scope.blurb,
      size: record.size,
      target: record.target,
    };
  });
}

/** All words for a scope, ordered from most to least frequent. Cached per process. */
export function getPool(slug: string): PoolWord[] {
  const scope = getScope(slug);
  if (!scope) throw new Error(`Unknown scope: ${slug}`);

  if (!globalDb.__vocabRulerPools) {
    globalDb.__vocabRulerPools = new Map();
  }
  const cached = globalDb.__vocabRulerPools.get(slug);
  if (cached) return cached;

  const row = getDb().prepare("SELECT 1 AS ok FROM books WHERE slug = ?").get(slug);
  if (!row) {
    throw new Error(
      `The word bank is missing the "${slug}" list. Run: npm run db:build`,
    );
  }

  const rows = getDb()
    .prepare(
      `SELECT w.id, w.word, w.phonetic, w.translation, w.pos, w.distractors,
              bw.book_rank, bw.difficulty
       FROM book_words bw
       JOIN words w ON w.id = bw.word_id
       WHERE bw.book = ?
       ORDER BY bw.book_rank ASC`,
    )
    .all(slug) as unknown as Array<{
    id: number;
    word: string;
    phonetic: string;
    translation: string;
    pos: string;
    distractors: string;
    book_rank: number;
    difficulty: number;
  }>;

  if (rows.length === 0) {
    throw new Error(`The word bank list "${slug}" is empty`);
  }

  const size = rows.length;
  const pool = rows.map((entry) => {
    const percentile = Math.min(0.999, Math.max(0.001, (entry.book_rank - 0.5) / size));
    let distractors: string[] = [];
    try {
      const parsed = JSON.parse(entry.distractors) as unknown;
      if (Array.isArray(parsed)) {
        distractors = parsed.filter((item): item is string => typeof item === "string");
      }
    } catch {
      distractors = [];
    }
    return {
      id: entry.id,
      word: entry.word,
      phonetic: entry.phonetic,
      translation: entry.translation,
      pos: entry.pos,
      difficulty: entry.difficulty,
      percentile,
      band: percentileBand(percentile).label,
      distractors,
    };
  });

  globalDb.__vocabRulerPools.set(slug, pool);
  return pool;
}

export function loadTest(id: string): TestRow | null {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const row = getDb()
    .prepare(
      `SELECT id, scope, length, theta, se, current_word_id, responses, status,
              result, created_at, updated_at, finished_at
       FROM tests WHERE id = ?`,
    )
    .get(id) as unknown as TestRow | undefined;
  return row ?? null;
}

export function insertTest(input: {
  id: string;
  scope: string;
  length: number;
  theta: number;
  se: number;
  currentWordId: number;
  createdAt: string;
}): void {
  getDb()
    .prepare(
      `INSERT INTO tests
         (id, scope, length, theta, se, current_word_id, responses, status, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, '[]', 'active', ?, ?)`,
    )
    .run(
      input.id,
      input.scope,
      input.length,
      input.theta,
      input.se,
      input.currentWordId,
      input.createdAt,
      input.createdAt,
    );
}

export function saveTestProgress(input: {
  id: string;
  theta: number;
  se: number;
  currentWordId: number | null;
  responses: string;
  updatedAt: string;
}): void {
  getDb()
    .prepare(
      `UPDATE tests
       SET theta = ?, se = ?, current_word_id = ?, responses = ?, updated_at = ?
       WHERE id = ? AND status = 'active'`,
    )
    .run(
      input.theta,
      input.se,
      input.currentWordId,
      input.responses,
      input.updatedAt,
      input.id,
    );
}

export function finishTest(input: {
  id: string;
  theta: number;
  se: number;
  responses: string;
  result: string;
  finishedAt: string;
}): void {
  getDb()
    .prepare(
      `UPDATE tests
       SET theta = ?, se = ?, current_word_id = NULL, responses = ?, status = 'done',
           result = ?, updated_at = ?, finished_at = ?
       WHERE id = ? AND status = 'active'`,
    )
    .run(
      input.theta,
      input.se,
      input.responses,
      input.result,
      input.finishedAt,
      input.finishedAt,
      input.id,
    );
}

export function deleteOldTests(beforeIso: string): void {
  getDb().prepare("DELETE FROM tests WHERE created_at < ?").run(beforeIso);
}

export function dbPath(): string {
  return DB_PATH;
}

export function deleteTest(id: string): void {
  getDb().prepare("DELETE FROM tests WHERE id = ?").run(id);
}
