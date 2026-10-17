"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { ArrowRight, Chart } from "@/components/icons";
import { formatDate, formatNumber } from "@/lib/format";
import { onStorageChange, readHistory } from "@/lib/storage";
import type { HistoryEntry } from "@/lib/types";

export function RecentResults() {
  const [history, setHistory] = useState<HistoryEntry[] | null>(null);

  useEffect(() => {
    const sync = () => setHistory(readHistory());
    sync();
    return onStorageChange(sync);
  }, []);

  if (!history || history.length === 0) return null;

  return (
    <section className="container-page pb-4">
      <div className="mb-5 flex items-end justify-between gap-4">
        <div>
          <p className="eyebrow">YOUR MEASUREMENTS</p>
          <h2 className="mt-3 font-display text-2xl tracking-tight">最近量到哪了</h2>
        </div>
        <Link
          href="/history"
          className="btn btn-quiet px-3 py-2 text-sm"
        >
          全部记录
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {history.slice(0, 3).map((entry) => (
          <Link
            key={entry.id}
            href={`/result/${entry.id}`}
            className="card-flat group flex items-center justify-between gap-4 p-5 transition-all hover:-translate-y-0.5 hover:border-ink/25 hover:bg-white/55"
          >
            <div>
              <p className="text-[11px] font-semibold tracking-[0.12em] text-ink-soft">
                {entry.scopeName}
              </p>
              <p className="mt-2 flex items-baseline gap-1.5">
                <span className="font-display text-3xl tracking-tight">
                  {formatNumber(entry.score)}
                </span>
                <span className="text-xs text-ink-soft">词</span>
              </p>
              <p className="mt-1 text-[11px] text-ink-soft">
                {formatDate(entry.createdAt)} · 掌握率{" "}
                {(entry.coverage * 100).toFixed(0)}%
              </p>
            </div>
            <span className="flex h-9 w-9 items-center justify-center rounded-full border border-line/80 bg-white/40 text-ink-soft transition-colors group-hover:border-green/30 group-hover:text-green">
              <Chart className="h-4 w-4" />
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}
