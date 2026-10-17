import type { ScopeSlug } from "@/lib/books";

export type PublicOption = {
  key: string;
  text: string;
};

export type PublicItem = {
  wordId: number;
  word: string;
  phonetic: string;
  options: PublicOption[];
  scope: ScopeSlug;
  index: number;
  total: number;
};

export type TestStartResponse = {
  testId: string;
  item: PublicItem;
  scope: ScopeSlug;
  length: number;
};

export type AnswerRequest = {
  wordId: number;
  /** 0-3 option index, or null for "don't know". */
  choice: number | null;
};

export type AnswerResponse = {
  correct: boolean;
  chosenIndex: number | null;
  correctIndex: number;
  correctText: string;
  nextItem: PublicItem | null;
  finished: boolean;
  progress: {
    answered: number;
    total: number;
  };
  result?: TestResult;
};

export type ReviewEntry = {
  word: string;
  phonetic: string;
  translation: string;
  chosenText: string | null;
  correct: boolean;
  known: boolean;
  band: string;
  options: string[];
  correctIndex: number;
  chosenIndex: number | null;
};

export type BandStat = {
  label: string;
  total: number;
  correct: number;
};

export type TestResult = {
  id: string;
  scope: ScopeSlug;
  scopeName: string;
  scopeShort: string;
  mode: "all" | "book";
  length: number;
  score: number;
  ciLow: number;
  ciHigh: number;
  theta: number;
  se: number;
  correctCount: number;
  answered: number;
  poolSize: number;
  target: number;
  coverage: number;
  level: string;
  levelNote: string;
  bands: BandStat[];
  review: ReviewEntry[];
  createdAt: string;
  durationSec: number;
};

export type HistoryEntry = {
  id: string;
  scope: ScopeSlug;
  scopeName: string;
  score: number;
  ciLow: number;
  ciHigh: number;
  coverage: number;
  mode: "all" | "book";
  createdAt: string;
};

export type WordbookEntry = {
  word: string;
  phonetic: string;
  translation: string;
  scope: ScopeSlug;
  scopeName: string;
  addedAt: string;
};

export type BookInfo = {
  slug: ScopeSlug;
  size: number;
  target: number;
};
