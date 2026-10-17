"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { Modal } from "@/components/modal";
import { TrendChart } from "@/components/trend-chart";
import {
  ArrowRight,
  Chart,
  Clock,
  Rotate,
  Trash,
} from "@/components/icons";
import {
  formatDate,
  formatDateTime,
  formatNumber,
  formatPercent,
} from "@/lib/format";
import {
  clearHistory,
  onStorageChange,
  readHistory,
  removeHistory,
} from "@/lib/storage";
import type { HistoryEntry } from "@/lib/types";

export function HistoryView() {
  const [history, setHistory] = useState<HistoryEntry[] | null>(null);
  const [filter, setFilter] = useState<string>("all");
  const [clearOpen, setClearOpen] = useState(false);

  useEffect(() => {
    const sync = () => setHistory(readHistory());
    sync();
    return onStorageChange(sync);
  }, []);

  const scopes = useMemo(() => {
    const map = new Map<string, string>();
    for (const entry of history ?? []) {
      map.set(entry.scope, entry.scopeName);
    }
    return [...map.entries()].map(([slug, name]) => ({ slug, name }));
  }, [history]);

  const filtered = useMemo(() => {
    const list = history ?? [];
    return filter === "all" ? list : list.filter((entry) => entry.scope === filter);
  }, [filter, history]);

  const chartMode = filter === "all" ? "coverage" : "score";
  const averageCoverage =
    filtered.length > 0
      ? filtered.reduce((sum, entry) => sum + entry.coverage, 0) / filtered.length
      : 0;
  const best =
    filtered.length > 0
      ? filtered.reduce((top, entry) => (entry.score > top.score ? entry : top), filtered[0])
      : null;

  function removeEntry(id: string) {
    removeHistory(id);
    void fetch(`/api/tests/${id}`, { method: "DELETE" }).catch(() => {});
  }

  if (!history) {
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
          <p className="eyebrow">MEASUREMENTS</p>
          <h1 className="mt-4 font-display text-4xl tracking-tight sm:text-5xl">
            你的测量记录
          </h1>
          <p className="mt-3 max-w-lg text-[13px] leading-6 text-ink-soft">
            记录只存在这台设备的浏览器里。删除一条记录时，也会请求服务端删掉对应的匿名结果。
          </p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setClearOpen(true)}
            disabled={history.length === 0}
            className="btn btn-outline px-4! py-2.5! text-[12px] disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Trash className="h-3.5 w-3.5" />
            清空记录
          </button>
          <Link href="/#test" className="btn btn-primary px-4! py-2.5! text-[12px]">
            <Rotate className="h-3.5 w-3.5" />
            再测一次
          </Link>
        </div>
      </div>

      {history.length === 0 ? (
        <div className="card mt-10 flex flex-col items-center px-6 py-20 text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-green-soft text-green">
            <Chart className="h-6 w-6" />
          </span>
          <h2 className="mt-6 font-display text-2xl tracking-tight">还没有测量记录</h2>
          <p className="mt-2 max-w-sm text-sm leading-6 text-ink-soft">
            完成一次测试后，分数、置信区间和趋势会出现在这里。建议每隔几周用同一个词书复测。
          </p>
          <Link href="/#test" className="btn btn-primary mt-7">
            开始第一次测试
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      ) : (
        <>
          <div className="mt-9 grid gap-3 sm:grid-cols-3">
            <div className="card-flat p-5">
              <p className="text-[10px] font-semibold tracking-[0.14em] text-ink-soft">
                测量次数
              </p>
              <p className="mt-2 font-display text-3xl tracking-tight">
                {history.length}
                <span className="ml-1 text-xs font-normal text-ink-soft">次</span>
              </p>
            </div>
            <div className="card-flat p-5">
              <p className="text-[10px] font-semibold tracking-[0.14em] text-ink-soft">
                当前筛选平均覆盖
              </p>
              <p className="mt-2 font-display text-3xl tracking-tight">
                {formatPercent(averageCoverage, 1)}
              </p>
            </div>
            <div className="card-flat p-5">
              <p className="text-[10px] font-semibold tracking-[0.14em] text-ink-soft">
                当前筛选最高
              </p>
              <p className="mt-2 font-display text-3xl tracking-tight">
                {best ? formatNumber(best.score) : "—"}
                <span className="ml-1 text-xs font-normal text-ink-soft">词</span>
              </p>
            </div>
          </div>

          <section className="card mt-6 p-5 sm:p-8">
            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
              <div>
                <p className="eyebrow">TREND</p>
                <h2 className="mt-3 font-display text-xl tracking-tight">
                  {chartMode === "coverage" ? "掌握率趋势" : "词汇量趋势"}
                </h2>
                <p className="mt-1 text-[11.5px] text-ink-soft">
                  {filter === "all"
                    ? "混合范围时用词库覆盖率对比，只代表各自词库内的掌握程度"
                    : "同范围复测的估算词汇量，阴影为 90% 置信区间"}
                </p>
              </div>
              <div className="flex flex-wrap gap-1.5">
                <button
                  type="button"
                  onClick={() => setFilter("all")}
                  className={`rounded-full border px-3 py-1.5 text-[11px] font-semibold transition-colors ${
                    filter === "all"
                      ? "border-ink bg-ink text-paper-2"
                      : "border-line/80 bg-white/30 text-ink-soft hover:text-ink"
                  }`}
                >
                  全部范围
                </button>
                {scopes.map((scope) => (
                  <button
                    key={scope.slug}
                    type="button"
                    onClick={() => setFilter(scope.slug)}
                    className={`rounded-full border px-3 py-1.5 text-[11px] font-semibold transition-colors ${
                      filter === scope.slug
                        ? "border-ink bg-ink text-paper-2"
                        : "border-line/80 bg-white/30 text-ink-soft hover:text-ink"
                    }`}
                  >
                    {scope.name}
                  </button>
                ))}
              </div>
            </div>
            <div className="mt-4">
              <TrendChart entries={filtered} mode={chartMode} />
            </div>
          </section>

          <section className="mt-8">
            <div className="flex items-end justify-between gap-3">
              <h2 className="font-display text-xl tracking-tight">每一次</h2>
              <span className="text-[11px] text-ink-soft">{filtered.length} 条</span>
            </div>
            <div className="mt-4 overflow-hidden rounded-2xl border border-line/75 bg-white/25">
              {filtered.map((entry) => (
                <div
                  key={entry.id}
                  className="group flex flex-wrap items-center gap-x-5 gap-y-3 border-b border-line/60 px-4 py-4 transition-colors last:border-b-0 hover:bg-white/40 sm:px-5"
                >
                  <div className="flex min-w-[120px] items-center gap-3">
                    <span className="flex h-9 w-9 items-center justify-center rounded-full bg-green-soft/70 text-green">
                      <Clock className="h-4 w-4" />
                    </span>
                    <div>
                      <p className="text-[11px] font-semibold text-ink-soft">
                        {entry.scopeName}
                      </p>
                      <p className="mt-0.5 text-[10px] text-ink-soft/70">
                        {formatDateTime(entry.createdAt)}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-baseline gap-1.5">
                    <span className="font-display text-2xl tracking-tight">
                      {formatNumber(entry.score)}
                    </span>
                    <span className="text-[10px] text-ink-soft">词</span>
                  </div>

                  <div className="hidden text-[11px] text-ink-soft md:block">
                    90% CI {formatNumber(entry.ciLow)} – {formatNumber(entry.ciHigh)}
                  </div>

                  <div className="hidden items-center gap-2 text-[11px] text-ink-soft lg:flex">
                    <div className="h-1.5 w-24 overflow-hidden rounded-full bg-line/60">
                      <div
                        className="h-full rounded-full bg-green"
                        style={{ width: `${Math.min(100, entry.coverage * 100)}%` }}
                      />
                    </div>
                    {formatPercent(entry.coverage, 1)}
                  </div>

                  <div className="ml-auto flex items-center gap-1">
                    <Link
                      href={`/result/${entry.id}`}
                      className="inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-[11px] font-semibold text-ink-soft transition-colors hover:bg-white/60 hover:text-ink"
                    >
                      查看
                      <ArrowRight className="h-3 w-3" />
                    </Link>
                    <button
                      type="button"
                      onClick={() => removeEntry(entry.id)}
                      aria-label={`删除 ${formatDate(entry.createdAt)} 的记录`}
                      className="flex h-8 w-8 items-center justify-center rounded-full text-ink-soft/50 transition-colors hover:bg-coral-soft hover:text-coral"
                    >
                      <Trash className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <p className="mt-3 text-[10.5px] leading-5 text-ink-soft/65">
              服务端只保存匿名结果，保留 30 天；这里删除后，服务端副本也会被请求移除。
            </p>
          </section>
        </>
      )}

      <Modal
        open={clearOpen}
        onClose={() => setClearOpen(false)}
        title="清空所有记录？"
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
                const ids = history.map((entry) => entry.id);
                clearHistory();
                setClearOpen(false);
                for (const id of ids) {
                  void fetch(`/api/tests/${id}`, { method: "DELETE" }).catch(() => {});
                }
              }}
              className="btn btn-primary px-4! py-2.5! text-[12px]"
            >
              确认清空
            </button>
          </>
        }
      >
        <p className="text-sm leading-6 text-ink-soft">
          这会移除本机的全部 {history.length} 条记录，并请求服务端删除对应结果。生词本不会被清空。
        </p>
      </Modal>
    </div>
  );
}
