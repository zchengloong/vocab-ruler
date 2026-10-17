"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { CoverageRing } from "@/components/coverage-ring";
import { ScoreRuler } from "@/components/score-ruler";
import { ShareCardDialog } from "@/components/share-card";
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Check,
  EyeOff,
  Info,
  Rotate,
  Share,
  Speaker,
  Star,
  X,
} from "@/components/icons";
import {
  formatDate,
  formatDuration,
  formatNumber,
  formatPercent,
} from "@/lib/format";
import {
  onStorageChange,
  readWordbook,
  saveHistory,
  toggleWordbook,
} from "@/lib/storage";
import type { ReviewEntry, TestResult } from "@/lib/types";

const EXAMS = [
  { name: "四级 CET-4", value: 4500 },
  { name: "考研", value: 5500 },
  { name: "六级 CET-6", value: 6000 },
  { name: "雅思 IELTS", value: 7000 },
  { name: "托福 TOEFL", value: 8500 },
  { name: "GRE", value: 11000 },
] as const;

function useCountUp(target: number): number {
  const [value, setValue] = useState(target);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setValue(target);
      return;
    }
    let frame = 0;
    let fallback = 0;
    const start = performance.now();
    const duration = 800;
    const tick = (now: number) => {
      const progress = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(target * eased));
      if (progress < 1) frame = requestAnimationFrame(tick);
    };
    setValue(0);
    frame = requestAnimationFrame(tick);
    // Headless browsers and background tabs can throttle rAF; make sure the
    // final number always lands.
    fallback = window.setTimeout(() => setValue(target), duration + 150);
    return () => {
      cancelAnimationFrame(frame);
      clearTimeout(fallback);
    };
  }, [target]);

  return value;
}

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

function ExamReference({ score }: { score: number }) {
  return (
    <div>
      <div className="flex items-end justify-between gap-4">
        <div>
          <h2 className="font-display text-xl tracking-tight">离下一档还有多远</h2>
          <p className="mt-1 text-[12px] text-ink-soft">
            按词库规模折算的参考线，不等同于官方分数线
          </p>
        </div>
        <span className="chip hidden sm:inline-flex">
          <Check className="h-3 w-3 text-green" />
          当前 {formatNumber(score)} 词
        </span>
      </div>

      <div className="mt-7 space-y-5">
        {EXAMS.map((exam) => {
          const passed = score >= exam.value;
          const difference = Math.max(0, exam.value - score);
          const width = Math.min(100, (score / exam.value) * 100);
          return (
            <div key={exam.name}>
              <div className="flex items-baseline justify-between gap-3">
                <span className="text-[13px] font-semibold">{exam.name}</span>
                <span
                  className={`flex items-center gap-1 text-[11px] font-semibold ${
                    passed ? "text-green" : "text-ink-soft"
                  }`}
                >
                  {passed ? (
                    <>
                      <Check className="h-3.5 w-3.5" />
                      已越过
                    </>
                  ) : (
                    `差 ${formatNumber(difference)} 词`
                  )}
                </span>
              </div>
              <div className="mt-2 flex items-center gap-3">
                <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-line/50">
                  <div
                    className={`h-full rounded-full ${
                      passed ? "bg-green" : "bg-ink/35"
                    }`}
                    style={{ width: `${width}%` }}
                  />
                </div>
                <span className="w-16 text-right text-[10px] tabular-nums text-ink-soft/80">
                  {formatNumber(exam.value)}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function BookDetail({ result }: { result: TestResult }) {
  const advice =
    result.coverage >= 0.9
      ? "这本书已接近完全覆盖。下一步可以用真题检验输出能力，并定期复现低频词。"
      : result.coverage >= 0.75
        ? "核心词掌握不错。把本次答错与不认识的词加入生词本，优先补低频段。"
        : result.coverage >= 0.5
          ? "常用词已经过半。建议先巩固高频与常用段，再向进阶词推进。"
          : "先从最高频的词开始更划算，它们覆盖了大多数真实文本。";

  return (
    <div>
      <div className="flex items-end justify-between gap-4">
        <div>
          <h2 className="font-display text-xl tracking-tight">这本书的覆盖情况</h2>
          <p className="mt-1 text-[12px] text-ink-soft">
            只评估 {result.scopeName}，不能与综合词汇量直接横比
          </p>
        </div>
        <span className="display-number text-3xl">
          {formatPercent(result.coverage, 1)}
        </span>
      </div>

      <div className="mt-5 h-3 overflow-hidden rounded-full bg-line/50">
        <div
          className="h-full rounded-full bg-green transition-[width] duration-700"
          style={{ width: `${Math.min(100, result.coverage * 100)}%` }}
        />
      </div>
      <div className="mt-2 flex justify-between text-[11px] text-ink-soft">
        <span>0</span>
        <span>
          约 {formatNumber(result.score)} / {formatNumber(result.poolSize)} 词
        </span>
      </div>

      <p className="mt-5 text-[12px] leading-6 text-ink-soft">
        常见大纲参考 {formatNumber(result.target)} 词；ECDICT 收录的这本词书为{" "}
        {formatNumber(result.poolSize)} 词，因此以实际收录量为分母。
      </p>

      <div className="mt-5 rounded-2xl bg-green-soft/45 p-4 text-[12px] leading-6 text-ink-soft">
        <span className="font-semibold text-green-deep">下一步：</span>
        {advice}
      </div>
    </div>
  );
}

function BandBreakdown({ result }: { result: TestResult }) {
  return (
    <section className="card mt-6 p-6 sm:p-8">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
        <div>
          <p className="eyebrow">FREQUENCY BANDS</p>
          <h2 className="mt-3 font-display text-xl tracking-tight">四个频段的掌握</h2>
          <p className="mt-1 text-[12px] text-ink-soft">
            按{result.mode === "all" ? "测试词库" : "该词书"}内词频从高到低分成四段
          </p>
        </div>
        <span className="text-[10px] leading-5 text-ink-soft/75 sm:max-w-[210px] sm:text-right">
          自适应抽题会把题目集中在你当前水平附近，题量不均属正常；比较正确率更有意义。
        </span>
      </div>

      <div className="mt-7 grid gap-x-10 gap-y-6 sm:grid-cols-2">
        {result.bands.map((band, index) => {
          const rate = band.total > 0 ? band.correct / band.total : 0;
          return (
            <div key={band.label}>
              <div className="flex items-baseline justify-between gap-3">
                <span className="text-[12px] font-semibold">
                  {band.label}
                  <span className="ml-2 font-normal text-ink-soft/65">
                    第 {index + 1} 段
                  </span>
                </span>
                <span className="text-[11px] tabular-nums text-ink-soft">
                  {band.total > 0
                    ? `${band.correct} / ${band.total}`
                    : "本次未覆盖"}
                </span>
              </div>
              <div className="mt-2 flex items-center gap-3">
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-line/50">
                  <div
                    className={`h-full rounded-full ${
                      band.total > 0 ? "bg-green" : "bg-transparent"
                    }`}
                    style={{ width: `${rate * 100}%` }}
                  />
                </div>
                <span className="w-9 text-right text-[11px] tabular-nums text-ink-soft">
                  {band.total > 0 ? `${Math.round(rate * 100)}%` : "—"}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function ReviewList({ result }: { result: TestResult }) {
  const [filter, setFilter] = useState<"all" | "wrong" | "unknown">("all");
  const [expanded, setExpanded] = useState(false);
  const [saved, setSaved] = useState<Set<string>>(new Set());

  useEffect(() => {
    const sync = () =>
      setSaved(new Set(readWordbook().map((entry) => entry.word.toLowerCase())));
    sync();
    return onStorageChange(sync);
  }, []);

  const counts = useMemo(() => {
    const wrong = result.review.filter(
      (entry) => !entry.correct && entry.chosenIndex !== null,
    ).length;
    const unknown = result.review.filter((entry) => entry.chosenIndex === null).length;
    return { all: result.review.length, wrong, unknown };
  }, [result.review]);

  const items = useMemo(() => {
    if (filter === "wrong") {
      return result.review.filter(
        (entry) => !entry.correct && entry.chosenIndex !== null,
      );
    }
    if (filter === "unknown") {
      return result.review.filter((entry) => entry.chosenIndex === null);
    }
    return result.review;
  }, [filter, result.review]);

  const shown = expanded ? items : items.slice(0, 8);

  function toggleSaved(entry: ReviewEntry) {
    toggleWordbook({
      word: entry.word,
      phonetic: entry.phonetic,
      translation: entry.translation,
      scope: result.scope,
      scopeName: result.scopeName,
      addedAt: new Date().toISOString(),
    });
    setSaved(new Set(readWordbook().map((item) => item.word.toLowerCase())));
  }

  const tabs = [
    { key: "all" as const, label: "全部", count: counts.all },
    { key: "wrong" as const, label: "答错", count: counts.wrong },
    { key: "unknown" as const, label: "不认识", count: counts.unknown },
  ];

  return (
    <section id="review" className="mt-12 scroll-mt-24">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="eyebrow">REVIEW</p>
          <h2 className="mt-3 font-display text-2xl tracking-tight">
            这次遇到的 {result.review.length} 个词
          </h2>
          <p className="mt-1 text-[12px] text-ink-soft">
            点星标可以加入生词本；你的选择与正确答案都保留在这里。
          </p>
        </div>
        <Link href="/wordbook" className="btn btn-outline self-start px-4! py-2.5! text-[12px]">
          <BookOpen className="h-3.5 w-3.5" />
          打开生词本
        </Link>
      </div>

      <div className="mt-5 flex flex-wrap gap-1.5">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => {
              setFilter(tab.key);
              setExpanded(false);
            }}
            aria-pressed={filter === tab.key}
            className={`rounded-full border px-4 py-2 text-[12px] font-semibold transition-colors ${
              filter === tab.key
                ? "border-ink bg-ink text-paper-2"
                : "border-line/80 bg-white/30 text-ink-soft hover:border-ink/30 hover:text-ink"
            }`}
          >
            {tab.label}
            <span
              className={`ml-1.5 text-[10px] ${
                filter === tab.key ? "text-paper-2/60" : "text-ink-soft/60"
              }`}
            >
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {shown.length === 0 ? (
        <div className="mt-5 rounded-2xl border border-dashed border-line py-12 text-center text-sm text-ink-soft">
          这个分类下没有词。
        </div>
      ) : (
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          {shown.map((entry) => {
            const isSaved = saved.has(entry.word.toLowerCase());
            const unknown = entry.chosenIndex === null;
            return (
              <article
                key={`${entry.word}-${entry.correctIndex}-${entry.chosenIndex}`}
                className={`min-w-0 rounded-2xl border p-4 transition-colors ${
                  entry.correct
                    ? "border-line/70 bg-white/35"
                    : unknown
                      ? "border-gold/25 bg-[#f8f0df]/70"
                      : "border-coral/25 bg-coral-soft/25"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                      <h3 className="font-display text-[22px] tracking-tight">
                        {entry.word}
                      </h3>
                      <button
                        type="button"
                        onClick={() => speak(entry.word)}
                        aria-label={`朗读 ${entry.word}`}
                        className="text-ink-soft/70 transition-colors hover:text-green"
                      >
                        <Speaker className="h-3.5 w-3.5" />
                      </button>
                      <span className="rounded-full bg-ink/5 px-2 py-0.5 text-[9px] font-semibold text-ink-soft">
                        {entry.band}
                      </span>
                    </div>
                    {entry.phonetic ? (
                      <p className="mt-1 text-[11px] text-ink-soft">
                        {phoneticLabel(entry.phonetic)}
                      </p>
                    ) : null}
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    <span
                      className={`flex h-7 w-7 items-center justify-center rounded-full ${
                        entry.correct
                          ? "bg-green-soft text-green"
                          : unknown
                            ? "bg-gold/10 text-gold"
                            : "bg-coral-soft text-coral"
                      }`}
                      title={entry.correct ? "答对" : unknown ? "不认识" : "答错"}
                    >
                      {entry.correct ? (
                        <Check className="h-3.5 w-3.5" />
                      ) : unknown ? (
                        <EyeOff className="h-3.5 w-3.5" />
                      ) : (
                        <X className="h-3.5 w-3.5" />
                      )}
                    </span>
                    <button
                      type="button"
                      data-testid={`star-${entry.word}`}
                      onClick={() => toggleSaved(entry)}
                      aria-label={isSaved ? "从生词本移除" : "加入生词本"}
                      aria-pressed={isSaved}
                      className={`flex h-7 w-7 items-center justify-center rounded-full transition-colors ${
                        isSaved
                          ? "bg-green-soft text-green"
                          : "text-ink-soft/55 hover:bg-ink/5 hover:text-ink"
                      }`}
                    >
                      <Star className="h-3.5 w-3.5" filled={isSaved} />
                    </button>
                  </div>
                </div>

                <p className="mt-3 line-clamp-2 text-[13px] font-medium leading-6">
                  {entry.translation}
                </p>
                <p className="mt-2 truncate text-[11px] text-ink-soft">
                  {entry.correct
                    ? `你的选择：${entry.chosenText}`
                    : unknown
                      ? "你的选择：不认识"
                      : `你的选择：${entry.chosenText}`}
                </p>
              </article>
            );
          })}
        </div>
      )}

      {items.length > 8 ? (
        <button
          type="button"
          onClick={() => setExpanded((value) => !value)}
          className="btn btn-outline mx-auto mt-5 flex px-5! py-2.5! text-[12px]"
        >
          {expanded ? "收起" : `展开剩余 ${items.length - 8} 个词`}
        </button>
      ) : null}
    </section>
  );
}

export function ResultView({ result }: { result: TestResult }) {
  const [shareOpen, setShareOpen] = useState(false);
  const animated = useCountUp(result.score);

  useEffect(() => {
    saveHistory(result);
  }, [result]);

  const isOverall = result.mode === "all";
  const correctRate =
    result.answered > 0 ? result.correctCount / result.answered : 0;

  return (
    <div className="container-page py-8 sm:py-12">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          href="/history"
          className="inline-flex items-center gap-2 text-[12px] font-medium text-ink-soft transition-colors hover:text-ink"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          历史记录
        </Link>
        <div className="flex items-center gap-2">
          <button
            type="button"
            data-testid="share"
            onClick={() => setShareOpen(true)}
            className="btn btn-outline px-4! py-2.5! text-[12px]"
          >
            <Share className="h-3.5 w-3.5" />
            分享成绩
          </button>
          <Link
            href={`/test?scope=${result.scope}&length=${result.length}`}
            className="btn btn-primary px-4! py-2.5! text-[12px]"
          >
            <Rotate className="h-3.5 w-3.5" />
            再测一次
          </Link>
        </div>
      </div>

      <section className="card mt-6 overflow-hidden">
        <div className="grid lg:grid-cols-[1.18fr_0.82fr]">
          <div className="relative p-6 sm:p-10">
            <div className="flex items-center gap-2 text-[10px] font-bold tracking-[0.16em] text-ink-soft">
              <span className="h-1.5 w-1.5 rounded-full bg-green" />
              TEST COMPLETE
              <span className="text-line">/</span>
              {formatDate(result.createdAt)}
            </div>

            <p className="mt-8 text-[13px] font-medium text-ink-soft">
              {isOverall ? "你的综合词汇量" : `${result.scopeName} 词库掌握量`}
            </p>
            <div className="mt-1 flex flex-wrap items-end gap-x-3 gap-y-1">
              <span data-testid="score" className="display-number text-[clamp(4.4rem,11vw,7.2rem)] font-medium leading-[0.9]">
                {formatNumber(animated)}
              </span>
              <span className="mb-2 text-sm text-ink-soft">
                {isOverall ? "词" : `/ ${formatNumber(result.poolSize)} 词`}
              </span>
            </div>

            <p className="mt-4 flex items-center gap-1.5 text-[12px] text-ink-soft">
              <Info className="h-3.5 w-3.5" />
              90% 置信区间{" "}
              <span className="font-semibold text-ink">
                {formatNumber(result.ciLow)} – {formatNumber(result.ciHigh)}
              </span>{" "}
              词
            </p>

            <div className="mt-5 flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-ink px-3.5 py-1.5 text-[11px] font-semibold text-paper-2">
                <Sparkle />
                {result.level}
              </span>
              <span className="chip">
                正确 {result.correctCount} / {result.answered}
              </span>
              <span className="chip">
                词库覆盖 {formatPercent(result.coverage)}
              </span>
            </div>

            <p className="mt-5 max-w-md text-[13px] leading-6 text-ink-soft">
              {result.levelNote}。这不是考试分数，而是根据这次作答和词频难度推算出的词汇量区间。
            </p>

            <div className="mt-7 flex flex-wrap gap-2">
              <a href="#review" className="btn btn-primary px-4! py-2.5! text-[12px]">
                查看这次遇到的词
                <ArrowRight className="h-3.5 w-3.5" />
              </a>
              <Link href="/method" className="btn btn-quiet px-3! py-2.5! text-[12px]">
                它是怎么算的
              </Link>
            </div>
          </div>

          <div className="relative border-t border-line/60 bg-green-soft/25 p-6 sm:p-9 lg:border-l lg:border-t-0">
            <div className="pointer-events-none absolute -right-10 -top-10 h-36 w-36 rounded-full bg-green/10 blur-2xl" />
            <div className="relative">
              {isOverall ? (
                <>
                  <p className="mb-3 text-[10px] font-bold tracking-[0.16em] text-ink-soft">
                    POSITION ON THE 12,000-WORD SCALE
                  </p>
                  <div className="hidden sm:block">
                    <ScoreRuler
                      score={result.score}
                      ciLow={result.ciLow}
                      ciHigh={result.ciHigh}
                      max={12000}
                    />
                  </div>
                  <div className="sm:hidden">
                    <div className="flex justify-between text-[10px] text-ink-soft">
                      <span>0</span>
                      <span>12,000 词</span>
                    </div>
                    <div className="relative mt-2 h-2.5 rounded-full bg-green/10">
                      <div
                        className="h-full rounded-full bg-green"
                        style={{
                          width: `${Math.min(100, (result.score / 12000) * 100)}%`,
                        }}
                      />
                      <span
                        className="absolute top-1/2 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-paper-2 bg-green"
                        style={{
                          left: `${Math.min(98, Math.max(2, (result.score / 12000) * 100))}%`,
                        }}
                      />
                    </div>
                    <p className="mt-2 text-right text-[10px] text-ink-soft">
                      约 {formatNumber(result.score)} 词
                    </p>
                  </div>
                </>
              ) : (
                <CoverageRing value={result.coverage} />
              )}

              <dl className="mt-6 grid grid-cols-2 gap-x-5 gap-y-4 border-t border-line/60 pt-5">
                <div>
                  <dt className="text-[9.5px] font-semibold tracking-[0.12em] text-ink-soft">
                    正确率
                  </dt>
                  <dd className="mt-1 font-display text-xl tracking-tight">
                    {formatPercent(correctRate)}
                  </dd>
                </div>
                <div>
                  <dt className="text-[9.5px] font-semibold tracking-[0.12em] text-ink-soft">
                    用时
                  </dt>
                  <dd className="mt-1 font-display text-xl tracking-tight">
                    {formatDuration(result.durationSec)}
                  </dd>
                </div>
                <div>
                  <dt className="text-[9.5px] font-semibold tracking-[0.12em] text-ink-soft">
                    题量
                  </dt>
                  <dd className="mt-1 font-display text-xl tracking-tight">
                    {result.length} 题
                  </dd>
                </div>
                <div>
                  <dt className="text-[9.5px] font-semibold tracking-[0.12em] text-ink-soft">
                    词库规模
                  </dt>
                  <dd className="mt-1 font-display text-xl tracking-tight">
                    {formatNumber(result.poolSize)}
                  </dd>
                </div>
              </dl>
            </div>
          </div>
        </div>
      </section>

      <div className="mt-6 grid items-start gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <section className="card p-6 sm:p-8">
          {isOverall ? <ExamReference score={result.score} /> : <BookDetail result={result} />}
        </section>

        <aside className="card p-6 sm:p-8">
          <h2 className="font-display text-xl tracking-tight">怎么读这个数字</h2>
          <div className="mt-5 space-y-5">
            <div className="flex gap-3">
              <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-green-soft text-[10px] font-bold text-green">
                1
              </span>
              <div>
                <p className="text-[12.5px] font-semibold">区间比一个数字更诚实</p>
                <p className="mt-1 text-[11.5px] leading-5 text-ink-soft">
                  90% 置信区间表示：如果重复测量，大约有九成结果会落在{" "}
                  {formatNumber(result.ciLow)}–{formatNumber(result.ciHigh)} 词之间。
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-green-soft text-[10px] font-bold text-green">
                2
              </span>
              <div>
                <p className="text-[12.5px] font-semibold">正确率不是分数</p>
                <p className="mt-1 text-[11.5px] leading-5 text-ink-soft">
                  自适应题目会尽量贴近你的水平，所以正确率通常不会很高；答对难题比答对简单题更能抬高估计。
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-green-soft text-[10px] font-bold text-green">
                3
              </span>
              <div>
                <p className="text-[12.5px] font-semibold">看趋势，而不是单次</p>
                <p className="mt-1 text-[11.5px] leading-5 text-ink-soft">
                  一次测试有随机误差。隔几周用同样的范围再测，曲线比单次数字更有意义。
                </p>
              </div>
            </div>
          </div>
          <Link
            href="/method"
            className="mt-6 inline-flex items-center gap-1.5 text-[11px] font-semibold text-green transition-colors hover:text-green-deep"
          >
            阅读完整测算方法
            <ArrowRight className="h-3 w-3" />
          </Link>
        </aside>
      </div>

      <BandBreakdown result={result} />
      <ReviewList result={result} />

      <ShareCardDialog
        open={shareOpen}
        onClose={() => setShareOpen(false)}
        result={result}
      />
    </div>
  );
}

function Sparkle() {
  return (
    <svg
      viewBox="0 0 16 16"
      className="h-3 w-3 text-[#e7a58f]"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M8 1.5 9.5 6 14 7.5 9.5 9 8 13.5 6.5 9 2 7.5 6.5 6 8 1.5Z" />
    </svg>
  );
}
