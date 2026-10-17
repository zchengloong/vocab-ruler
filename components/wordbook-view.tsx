"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { Modal } from "@/components/modal";
import {
  ArrowRight,
  BookOpen,
  Download,
  Search,
  Speaker,
  Star,
  Trash,
  X,
} from "@/components/icons";
import { formatDate, formatNumber } from "@/lib/format";
import {
  clearWordbook,
  exportWordbookCsv,
  onStorageChange,
  readWordbook,
  removeFromWordbook,
} from "@/lib/storage";
import type { WordbookEntry } from "@/lib/types";

function phoneticLabel(phonetic: string): string {
  if (!phonetic) return "";
  const normalized = phonetic
    .trim()
    .replaceAll("'", "ˈ")
    .replaceAll(",", "ˌ")
    .replace(/^\/+|\/+$/g, "");
  return `/${normalized}/`;
}

function speak(word: string) {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
  const utterance = new SpeechSynthesisUtterance(word);
  utterance.lang = "en-US";
  utterance.rate = 0.9;
  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(utterance);
}

export function WordbookView() {
  const [entries, setEntries] = useState<WordbookEntry[] | null>(null);
  const [query, setQuery] = useState("");
  const [clearOpen, setClearOpen] = useState(false);

  useEffect(() => {
    const sync = () => setEntries(readWordbook());
    sync();
    return onStorageChange(sync);
  }, []);

  const filtered = useMemo(() => {
    const list = entries ?? [];
    const keyword = query.trim().toLowerCase();
    if (!keyword) return list;
    return list.filter(
      (entry) =>
        entry.word.toLowerCase().includes(keyword) ||
        entry.translation.includes(keyword) ||
        entry.scopeName.toLowerCase().includes(keyword),
    );
  }, [entries, query]);

  const scopeCount = useMemo(() => {
    return new Set((entries ?? []).map((entry) => entry.scope)).size;
  }, [entries]);

  if (!entries) {
    return (
      <div className="container-page py-16">
        <div className="h-8 w-40 animate-pulse rounded-full bg-line/50" />
        <div className="mt-8 h-72 animate-pulse rounded-[1.75rem] bg-line/30" />
      </div>
    );
  }

  return (
    <div className="container-page py-10 sm:py-14">
      <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
        <div>
          <p className="eyebrow">WORDBOOK</p>
          <h1 className="mt-4 font-display text-4xl tracking-tight sm:text-5xl">
            我的生词本
          </h1>
          <p className="mt-3 max-w-lg text-[13px] leading-6 text-ink-soft">
            从测试结果里点星标收藏的词会出现在这里。可以搜索、朗读、导出 CSV，或直接删掉已经记住的词。
          </p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => exportWordbookCsv(entries)}
            disabled={entries.length === 0}
            className="btn btn-outline px-4! py-2.5! text-[12px] disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Download className="h-3.5 w-3.5" />
            导出 CSV
          </button>
          <Link href="/#test" className="btn btn-primary px-4! py-2.5! text-[12px]">
            再测一次
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>

      {entries.length === 0 ? (
        <div className="card mt-10 flex flex-col items-center px-6 py-20 text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-green-soft text-green">
            <BookOpen className="h-6 w-6" />
          </span>
          <h2 className="mt-6 font-display text-2xl tracking-tight">生词本还是空的</h2>
          <p className="mt-2 max-w-sm text-sm leading-6 text-ink-soft">
            测完一次后，在结果页把不认识的词点上星标，就会收集到这里。也可以直接导出成 CSV 导入其他工具。
          </p>
          <Link href="/#test" className="btn btn-primary mt-7">
            去测一次
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      ) : (
        <>
          <div className="mt-8 grid gap-3 sm:grid-cols-3">
            <div className="card-flat p-5">
              <p className="text-[10px] font-semibold tracking-[0.14em] text-ink-soft">
                收藏词汇
              </p>
              <p className="mt-2 font-display text-3xl tracking-tight">
                {formatNumber(entries.length)}
                <span className="ml-1 text-xs font-normal text-ink-soft">词</span>
              </p>
            </div>
            <div className="card-flat p-5">
              <p className="text-[10px] font-semibold tracking-[0.14em] text-ink-soft">
                来源词书
              </p>
              <p className="mt-2 font-display text-3xl tracking-tight">
                {scopeCount}
                <span className="ml-1 text-xs font-normal text-ink-soft">本</span>
              </p>
            </div>
            <div className="card-flat p-5">
              <p className="text-[10px] font-semibold tracking-[0.14em] text-ink-soft">
                最近添加
              </p>
              <p className="mt-2 font-display text-2xl tracking-tight">
                {entries[0] ? formatDate(entries[0].addedAt) : "—"}
              </p>
            </div>
          </div>

          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <label className="relative w-full max-w-sm">
              <span className="sr-only">搜索生词</span>
              <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-soft/60" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="搜索单词、释义或词书…"
                className="h-11 w-full rounded-full border border-line/80 bg-white/40 pl-10 pr-10 text-[13px] outline-none transition-colors placeholder:text-ink-soft/55 focus:border-green/50 focus:bg-white/70"
              />
              {query ? (
                <button
                  type="button"
                  onClick={() => setQuery("")}
                  aria-label="清空搜索"
                  className="absolute right-2 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full text-ink-soft/60 hover:bg-ink/5 hover:text-ink"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              ) : null}
            </label>
            <div className="flex items-center gap-3 text-[11px] text-ink-soft">
              <span>{filtered.length} 条结果</span>
              <button
                type="button"
                onClick={() => setClearOpen(true)}
                className="inline-flex items-center gap-1 font-semibold text-ink-soft/75 transition-colors hover:text-coral"
              >
                <Trash className="h-3 w-3" />
                清空
              </button>
            </div>
          </div>

          {filtered.length === 0 ? (
            <div className="mt-5 rounded-2xl border border-dashed border-line py-16 text-center">
              <p className="text-sm text-ink-soft">没有匹配「{query}」的词。</p>
              <button
                type="button"
                onClick={() => setQuery("")}
                className="mt-3 text-[12px] font-semibold text-green"
              >
                清除搜索
              </button>
            </div>
          ) : (
            <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {filtered.map((entry) => (
                <article
                  key={entry.word}
                  className="group rounded-2xl border border-line/75 bg-white/30 p-4 transition-all hover:-translate-y-0.5 hover:border-ink/20 hover:bg-white/50"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-baseline gap-x-2">
                        <h2 className="font-display text-[23px] tracking-tight">
                          {entry.word}
                        </h2>
                        <button
                          type="button"
                          onClick={() => speak(entry.word)}
                          aria-label={`朗读 ${entry.word}`}
                          className="text-ink-soft/55 transition-colors hover:text-green"
                        >
                          <Speaker className="h-3.5 w-3.5" />
                        </button>
                      </div>
                      {entry.phonetic ? (
                        <p className="mt-1 text-[11px] text-ink-soft">
                          {phoneticLabel(entry.phonetic)}
                        </p>
                      ) : null}
                    </div>
                    <button
                      type="button"
                      onClick={() => removeFromWordbook(entry.word)}
                      aria-label={`从生词本移除 ${entry.word}`}
                      className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-ink-soft/35 transition-colors hover:bg-coral-soft hover:text-coral"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <p className="mt-3 line-clamp-2 min-h-[42px] text-[13px] leading-6">
                    {entry.translation}
                  </p>
                  <div className="mt-3 flex items-center justify-between border-t border-line/60 pt-3">
                    <span className="inline-flex items-center gap-1 rounded-full bg-green-soft/60 px-2.5 py-1 text-[9.5px] font-semibold text-green">
                      <Star className="h-2.5 w-2.5" filled />
                      {entry.scopeName}
                    </span>
                    <span className="text-[10px] text-ink-soft/65">
                      {formatDate(entry.addedAt)}
                    </span>
                  </div>
                </article>
              ))}
            </div>
          )}
        </>
      )}

      <Modal
        open={clearOpen}
        onClose={() => setClearOpen(false)}
        title="清空生词本？"
        footer={
          <>
            <button
              type="button"
              onClick={() => setClearOpen(false)}
              className="btn btn-outline px-4! py-2.5! text-[12px]"
            >
              取消
            </button>
            <button
              type="button"
              onClick={() => {
                clearWordbook();
                setClearOpen(false);
              }}
              className="btn btn-primary px-4! py-2.5! text-[12px]"
            >
              确认清空
            </button>
          </>
        }
      >
        <p className="text-sm leading-6 text-ink-soft">
          这会移除本机收藏的全部 {entries.length} 个生词，无法撤销。历史测试记录不受影响。
        </p>
      </Modal>
    </div>
  );
}
