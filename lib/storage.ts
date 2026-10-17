import type { HistoryEntry, TestResult, WordbookEntry } from "@/lib/types";

const HISTORY_KEY = "vocab-ruler:history:v1";
const WORDBOOK_KEY = "vocab-ruler:wordbook:v1";
const CONFIG_KEY = "vocab-ruler:config:v1";
const UPDATE_EVENT = "vocab-ruler:update";
const HISTORY_LIMIT = 80;

function canUseStorage(): boolean {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function read<T>(key: string, fallback: T): T {
  if (!canUseStorage()) return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function write<T>(key: string, value: T): void {
  if (!canUseStorage()) return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
    window.dispatchEvent(new Event(UPDATE_EVENT));
  } catch {
    // Storage can be unavailable in private mode or full.
  }
}

export function onStorageChange(callback: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  const handler = () => callback();
  window.addEventListener("storage", handler);
  window.addEventListener(UPDATE_EVENT, handler);
  return () => {
    window.removeEventListener("storage", handler);
    window.removeEventListener(UPDATE_EVENT, handler);
  };
}

export function readHistory(): HistoryEntry[] {
  const value = read<unknown>(HISTORY_KEY, []);
  if (!Array.isArray(value)) return [];
  return value.filter(
    (entry): entry is HistoryEntry =>
      Boolean(entry) &&
      typeof entry === "object" &&
      typeof (entry as HistoryEntry).id === "string" &&
      typeof (entry as HistoryEntry).score === "number",
  );
}

export function saveHistory(result: TestResult): void {
  const history = readHistory();
  const entry: HistoryEntry = {
    id: result.id,
    scope: result.scope,
    scopeName: result.scopeName,
    score: result.score,
    ciLow: result.ciLow,
    ciHigh: result.ciHigh,
    coverage: result.coverage,
    mode: result.mode,
    createdAt: result.createdAt,
  };
  const next = [entry, ...history.filter((item) => item.id !== entry.id)]
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt))
    .slice(0, HISTORY_LIMIT);
  write(HISTORY_KEY, next);
}

export function removeHistory(id: string): void {
  write(
    HISTORY_KEY,
    readHistory().filter((entry) => entry.id !== id),
  );
}

export function clearHistory(): void {
  write(HISTORY_KEY, []);
}

export function readWordbook(): WordbookEntry[] {
  const value = read<unknown>(WORDBOOK_KEY, []);
  if (!Array.isArray(value)) return [];
  return value.filter(
    (entry): entry is WordbookEntry =>
      Boolean(entry) &&
      typeof entry === "object" &&
      typeof (entry as WordbookEntry).word === "string",
  );
}

export function isInWordbook(word: string): boolean {
  return readWordbook().some((entry) => entry.word.toLowerCase() === word.toLowerCase());
}

export function addToWordbook(entry: WordbookEntry): void {
  const book = readWordbook();
  if (book.some((item) => item.word.toLowerCase() === entry.word.toLowerCase())) return;
  write(WORDBOOK_KEY, [
    { ...entry, addedAt: entry.addedAt || new Date().toISOString() },
    ...book,
  ]);
}

export function removeFromWordbook(word: string): void {
  write(
    WORDBOOK_KEY,
    readWordbook().filter((entry) => entry.word.toLowerCase() !== word.toLowerCase()),
  );
}

export function toggleWordbook(entry: WordbookEntry): boolean {
  if (isInWordbook(entry.word)) {
    removeFromWordbook(entry.word);
    return false;
  }
  addToWordbook(entry);
  return true;
}

export function clearWordbook(): void {
  write(WORDBOOK_KEY, []);
}

export type SavedConfig = {
  scope: string;
  length: number;
};

export function readConfig(): SavedConfig | null {
  const value = read<SavedConfig | null>(CONFIG_KEY, null);
  if (!value || typeof value.scope !== "string" || typeof value.length !== "number") {
    return null;
  }
  return value;
}

export function saveConfig(config: SavedConfig): void {
  write(CONFIG_KEY, config);
}

export function exportWordbookCsv(entries: WordbookEntry[]): void {
  const escape = (value: string) => `"${value.replaceAll('"', '""')}"`;
  const rows = [
    ["word", "phonetic", "translation", "scope", "addedAt"],
    ...entries.map((entry) => [
      entry.word,
      entry.phonetic,
      entry.translation,
      entry.scopeName,
      entry.addedAt.slice(0, 10),
    ]),
  ];
  const csv = `\uFEFF${rows.map((row) => row.map(escape).join(",")).join("\r\n")}`;
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `词尺生词本-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  // Revoking synchronously can cancel the download in some browsers.
  window.setTimeout(() => URL.revokeObjectURL(url), 1500);
}
