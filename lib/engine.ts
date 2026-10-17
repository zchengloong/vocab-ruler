import "server-only";

import { createHash, randomUUID } from "node:crypto";

import {
  coverageLevel,
  getScope,
  levelForScore,
  SCALE_MAX,
} from "@/lib/books";
import type { ScopeSlug } from "@/lib/books";
import {
  deleteOldTests,
  deleteTest as deleteTestRow,
  finishTest,
  getBookRecord,
  getPool,
  insertTest,
  loadTest,
  saveTestProgress,
  type PoolWord,
} from "@/lib/db";
import {
  clamp,
  estimateVocabulary,
  percentileBand,
  posteriorFor,
  roundScore,
  sampleNormal,
} from "@/lib/irt";
import type {
  AnswerResponse,
  BandStat,
  PublicItem,
  ReviewEntry,
  TestResult,
} from "@/lib/types";

export class EngineError extends Error {
  status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.name = "EngineError";
    this.status = status;
  }
}

type StoredResponse = {
  wordId: number;
  word: string;
  phonetic: string;
  translation: string;
  options: string[];
  correctIndex: number;
  chosenIndex: number | null;
  correct: boolean;
  difficulty: number;
  percentile: number;
  band: string;
};

const OPTION_KEYS = ["A", "B", "C", "D"];

function mulberry32(seed: number) {
  let state = seed >>> 0;
  return function random() {
    state |= 0;
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Deterministic option order for a (test, word) pair. The server can rebuild
 * the exact same options when validating an answer, while the learner cannot
 * infer the answer from the order.
 */
function buildOptions(
  testId: string,
  word: PoolWord,
): { options: string[]; correctIndex: number } {
  if (word.distractors.length < 3) {
    throw new EngineError("题库数据不完整，请重新生成词库", 500);
  }

  const options = [word.translation, ...word.distractors.slice(0, 3)];
  const seed = createHash("sha256")
    .update(`${testId}:${word.id}`)
    .digest()
    .readUInt32LE(0);
  const random = mulberry32(seed);

  for (let i = options.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    [options[i], options[j]] = [options[j], options[i]];
  }

  const correctIndex = options.indexOf(word.translation);
  return { options, correctIndex };
}

function toPublicItem(
  testId: string,
  word: PoolWord,
  index: number,
  total: number,
  scope: ScopeSlug,
): PublicItem {
  const { options } = buildOptions(testId, word);
  return {
    wordId: word.id,
    word: word.word,
    phonetic: word.phonetic,
    options: options.map((text, optionIndex) => ({
      key: OPTION_KEYS[optionIndex],
      text,
    })),
    scope,
    index,
    total,
  };
}

function selectWord(
  pool: PoolWord[],
  theta: number,
  seen: Set<number>,
  warmup = false,
): PoolWord {
  const target = warmup
    ? -0.55
    : clamp(theta + 0.1 + sampleNormal(0, 0.3), -3.2, 3.2);

  const unseen = pool.filter((word) => !seen.has(word.id) && word.distractors.length >= 3);
  if (unseen.length === 0) {
    throw new EngineError("这个词库没有更多可用的题目了", 500);
  }

  let candidates = unseen.filter((word) => Math.abs(word.difficulty - target) <= 0.45);
  if (candidates.length < 10) {
    candidates = unseen.filter((word) => Math.abs(word.difficulty - target) <= 0.9);
  }
  if (candidates.length < 5) {
    candidates = unseen;
  }

  candidates.sort(
    (left, right) =>
      Math.abs(left.difficulty - target) - Math.abs(right.difficulty - target),
  );

  const shortlist = candidates.slice(0, 12);
  return shortlist[Math.floor(Math.random() * shortlist.length)];
}

function parseResponses(raw: string): StoredResponse[] {
  try {
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? (parsed as StoredResponse[]) : [];
  } catch {
    return [];
  }
}

function parseDuration(createdAt: string, finishedAt: string): number {
  const start = new Date(createdAt).getTime();
  const end = new Date(finishedAt).getTime();
  if (!Number.isFinite(start) || !Number.isFinite(end)) return 0;
  return Math.max(1, Math.round((end - start) / 1000));
}

function buildResult(input: {
  testId: string;
  scope: ScopeSlug;
  length: number;
  pool: PoolWord[];
  responses: StoredResponse[];
  createdAt: string;
  finishedAt: string;
}): TestResult {
  const { testId, scope, pool, responses, createdAt, finishedAt } = input;
  const scopeInfo = getScope(scope);
  const book = getBookRecord(scope);
  if (!scopeInfo || !book) {
    throw new EngineError("未知的测试范围", 400);
  }

  const irtResponses = responses.map((response) => ({
    b: response.difficulty,
    correct: response.correct,
  }));
  const posterior = posteriorFor(irtResponses);
  const estimate = estimateVocabulary(
    irtResponses,
    pool.map((word) => word.difficulty),
  );

  const score = Math.max(0, Math.min(pool.length, roundScore(estimate.score, 10)));
  const ciLow = Math.max(0, Math.min(score, roundScore(estimate.ciLow, 10)));
  const ciHigh = Math.min(pool.length, Math.max(score, roundScore(estimate.ciHigh, 10)));
  const coverage = score / pool.length;
  const mode = scope === "all" ? "all" : "book";

  const level =
    mode === "all"
      ? levelForScore(score)
      : {
          label: coverageLevel(coverage).label,
          note: coverageLevel(coverage).note,
        };

  const bandLabels = ["高频", "常用", "进阶", "低频"];
  const bands: BandStat[] = bandLabels.map((label) => ({
    label,
    total: 0,
    correct: 0,
  }));
  for (const response of responses) {
    const index = percentileBand(response.percentile).index;
    bands[index].total += 1;
    if (response.correct) bands[index].correct += 1;
  }

  const review: ReviewEntry[] = responses.map((response) => ({
    word: response.word,
    phonetic: response.phonetic,
    translation: response.translation,
    chosenText:
      response.chosenIndex === null ? null : response.options[response.chosenIndex],
    correct: response.correct,
    known: response.correct,
    band: response.band,
    options: response.options,
    correctIndex: response.correctIndex,
    chosenIndex: response.chosenIndex,
  }));

  return {
    id: testId,
    scope,
    scopeName: scopeInfo.name,
    scopeShort: scopeInfo.short,
    mode,
    length: input.length,
    score,
    ciLow,
    ciHigh,
    theta: Number(posterior.mean.toFixed(4)),
    se: Number(posterior.sd.toFixed(4)),
    correctCount: responses.filter((response) => response.correct).length,
    answered: responses.length,
    poolSize: pool.length,
    target: book.target,
    coverage,
    level: level.label,
    levelNote: level.note,
    bands,
    review,
    createdAt,
    durationSec: parseDuration(createdAt, finishedAt),
  };
}

export function startTest(
  scope: ScopeSlug,
  length: number,
): {
  testId: string;
  item: PublicItem;
  scope: ScopeSlug;
  length: number;
} {
  const scopeInfo = getScope(scope);
  if (!scopeInfo) throw new EngineError("未知的测试范围", 400);
  if (![20, 30, 50].includes(length)) throw new EngineError("题量必须是 20、30 或 50", 400);

  const pool = getPool(scope);
  if (pool.length < length) {
    throw new EngineError("这个词库的题目数量不足", 500);
  }

  const testId = randomUUID();
  const createdAt = new Date().toISOString();
  const first = selectWord(pool, 0, new Set(), true);

  insertTest({
    id: testId,
    scope,
    length,
    theta: 0,
    se: 1.35,
    currentWordId: first.id,
    createdAt,
  });

  try {
    const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    deleteOldTests(cutoff);
  } catch {
    // Cleanup is best-effort and must never block a new test.
  }

  return {
    testId,
    item: toPublicItem(testId, first, 1, length, scope),
    scope,
    length,
  };
}

export function answerTest(
  testId: string,
  wordId: number,
  choice: number | null,
): AnswerResponse {
  const row = loadTest(testId);
  if (!row) throw new EngineError("测试不存在或已过期", 404);
  if (row.status !== "active") throw new EngineError("这次测试已经结束", 409);
  if (row.current_word_id !== wordId) {
    throw new EngineError("题目已更新，请刷新后重试", 409);
  }
  if (choice !== null && (!Number.isInteger(choice) || choice < 0 || choice > 3)) {
    throw new EngineError("选项不合法", 400);
  }

  const pool = getPool(row.scope);
  const word = pool.find((entry) => entry.id === wordId);
  if (!word) throw new EngineError("找不到这道题", 500);

  const { options, correctIndex } = buildOptions(testId, word);
  const chosenIndex = choice === null ? null : choice;
  const correct = chosenIndex === correctIndex;
  const response: StoredResponse = {
    wordId: word.id,
    word: word.word,
    phonetic: word.phonetic,
    translation: word.translation,
    options,
    correctIndex,
    chosenIndex,
    correct,
    difficulty: word.difficulty,
    percentile: word.percentile,
    band: word.band,
  };

  const responses = [...parseResponses(row.responses), response];
  const irtResponses = responses.map((item) => ({
    b: item.difficulty,
    correct: item.correct,
  }));
  const posterior = posteriorFor(irtResponses);
  const answered = responses.length;
  const now = new Date().toISOString();

  const base: Omit<AnswerResponse, "nextItem" | "finished" | "result"> = {
    correct,
    chosenIndex,
    correctIndex,
    correctText: word.translation,
    progress: { answered, total: row.length },
  };

  if (answered >= row.length) {
    const result = buildResult({
      testId,
      scope: row.scope,
      length: row.length,
      pool,
      responses,
      createdAt: row.created_at,
      finishedAt: now,
    });

    finishTest({
      id: testId,
      theta: posterior.mean,
      se: posterior.sd,
      responses: JSON.stringify(responses),
      result: JSON.stringify(result),
      finishedAt: now,
    });

    return {
      ...base,
      nextItem: null,
      finished: true,
      result,
    };
  }

  const seen = new Set(responses.map((item) => item.wordId));
  const next = selectWord(pool, posterior.mean, seen);
  saveTestProgress({
    id: testId,
    theta: posterior.mean,
    se: posterior.sd,
    currentWordId: next.id,
    responses: JSON.stringify(responses),
    updatedAt: now,
  });

  return {
    ...base,
    nextItem: toPublicItem(testId, next, answered + 1, row.length, row.scope),
    finished: false,
  };
}

export function getTestResult(testId: string): TestResult | null {
  const row = loadTest(testId);
  if (!row || row.status !== "done" || !row.result) return null;
  try {
    return JSON.parse(row.result) as TestResult;
  } catch {
    return null;
  }
}

/** Max possible score for the overall scale, used by the result ruler. */
export const OVERALL_MAX = SCALE_MAX;

export function removeTest(testId: string): void {
  const row = loadTest(testId);
  if (!row) throw new EngineError("测试不存在", 404);
  deleteTestRow(testId);
}
