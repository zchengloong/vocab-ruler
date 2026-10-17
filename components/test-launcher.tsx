"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { ArrowRight, Check } from "@/components/icons";
import { readConfig, saveConfig } from "@/lib/storage";
import { TEST_LENGTHS } from "@/lib/books";
import type { ScopeSlug } from "@/lib/books";
import { formatNumber } from "@/lib/format";

type BookOption = {
  slug: ScopeSlug;
  name: string;
  short: string;
  english: string;
  blurb: string;
  size: number;
  target: number;
};

export function TestLauncher({ books }: { books: BookOption[] }) {
  const router = useRouter();
  const [scope, setScope] = useState<ScopeSlug>("all");
  const [length, setLength] = useState(30);
  const [starting, setStarting] = useState(false);

  useEffect(() => {
    const saved = readConfig();
    if (saved && books.some((book) => book.slug === saved.scope)) {
      setScope(saved.scope as ScopeSlug);
      if (TEST_LENGTHS.some((item) => item.value === saved.length)) {
        setLength(saved.length);
      }
    }
  }, [books]);

  const selected = books.find((book) => book.slug === scope) ?? books[0];
  const isOverall = scope === "all";

  function start() {
    setStarting(true);
    saveConfig({ scope, length });
    router.push(`/test?scope=${scope}&length=${length}`);
  }

  return (
    <div>
      <div className="mb-7 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="eyebrow">CHOOSE A SCOPE</p>
          <h2 className="mt-3 font-display text-3xl tracking-tight sm:text-[2.15rem]">
            这次，想量哪一部分？
          </h2>
        </div>
        <p className="max-w-xs text-sm leading-6 text-ink-soft">
          综合词汇估算整体水平；单项词书只测这本书的掌握量，分母不同，不能直接横比。
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4" role="radiogroup" aria-label="测试范围">
        {books.map((book) => {
          const active = book.slug === scope;
          return (
            <button
              key={book.slug}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => setScope(book.slug)}
              className={`group relative overflow-hidden rounded-2xl border p-4 text-left transition-all duration-200 ${
                active
                  ? "border-green bg-green-soft/70 shadow-[0_10px_30px_-22px_rgba(13,107,79,.9)]"
                  : "border-line/80 bg-white/35 hover:-translate-y-0.5 hover:border-ink/30 hover:bg-white/60"
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <span className="text-[10px] font-bold tracking-[0.16em] text-ink-soft">
                  {book.english.toUpperCase()}
                </span>
                {active ? (
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-green text-paper-2">
                    <Check className="h-3 w-3" />
                  </span>
                ) : (
                  <span className="flex h-5 w-5 items-center justify-center rounded-full border border-line/90 text-transparent transition-colors group-hover:border-ink/30">
                    <Check className="h-3 w-3" />
                  </span>
                )}
              </div>
              <p className="mt-3 font-display text-xl font-semibold tracking-tight">
                {book.name}
              </p>
              <p className="mt-1 line-clamp-2 text-[12px] leading-5 text-ink-soft">
                {book.blurb}
              </p>
              <div className="mt-4 flex items-center justify-between text-[11px] text-ink-soft">
                <span className="tabular-nums">
                  {formatNumber(book.size)} 词
                </span>
                <span>{book.slug === "all" ? "估算总量" : "掌握量"}</span>
              </div>
            </button>
          );
        })}
      </div>

      <div className="mt-8 grid gap-5 border-t border-line/70 pt-7 md:grid-cols-[1fr_auto] md:items-end">
        <div>
          <p className="text-sm font-semibold">题量</p>
          <div
            className="mt-3 inline-grid grid-cols-3 gap-1 rounded-full border border-line/80 bg-white/35 p-1"
            role="radiogroup"
            aria-label="题量"
          >
            {TEST_LENGTHS.map((option) => {
              const active = option.value === length;
              return (
                <button
                  key={option.value}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  onClick={() => setLength(option.value)}
                  className={`rounded-full px-2.5 py-2.5 text-center transition-colors ${
                    active ? "bg-ink text-paper-2" : "text-ink-soft hover:text-ink"
                  }`}
                >
                  <span className="block whitespace-nowrap text-[11.5px] font-semibold">
                    {option.label} · {option.value} 题
                  </span>
                  <span
                    className={`mt-0.5 block whitespace-nowrap text-[9px] ${
                      active ? "text-paper-2/65" : "text-ink-soft/80"
                    }`}
                  >
                    {option.hint}
                  </span>
                </button>
              );
            })}
          </div>
          <p className="mt-3 text-xs text-ink-soft">
            自适应出题会在你能力附近挑选单词，题量越多，置信区间越窄。
          </p>
        </div>

        <div className="flex flex-col items-stretch gap-3 md:items-end">
          <p className="text-xs text-ink-soft md:text-right">
            已选 <span className="font-semibold text-ink">{selected.name}</span>
            {isOverall ? "，估算整体词汇量" : "，只统计这本书"}
            <br />
            无需注册 · 记录保存在本机
          </p>
          <button
            type="button"
            onClick={start}
            disabled={starting}
            className="btn btn-primary group min-w-[220px] px-7 py-4 text-[15px] disabled:cursor-wait disabled:opacity-70"
          >
            {starting ? "正在进入测试…" : `开始 ${length} 题测试`}
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
