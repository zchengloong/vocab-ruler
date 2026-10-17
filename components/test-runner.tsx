"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

import { Logo } from "@/components/logo";
import { Modal } from "@/components/modal";
import {
  ArrowRight,
  Check,
  EyeOff,
  Info,
  Speaker,
  X,
} from "@/components/icons";
import { getScope } from "@/lib/books";
import type { ScopeSlug } from "@/lib/books";
import { saveHistory } from "@/lib/storage";
import type { AnswerResponse, PublicItem } from "@/lib/types";

type Stage = "starting" | "active" | "error";

function displayPhonetic(phonetic: string): string {
  if (!phonetic) return "";
  const normalized = phonetic
    .trim()
    .replaceAll("'", "ˈ")
    .replaceAll(",", "ˌ")
    .replace(/^\/+|\/+$/g, "");
  return `/${normalized}/`;
}

function messageOf(payload: unknown, fallback: string): string {
  if (payload && typeof payload === "object" && "error" in payload) {
    const value = (payload as { error?: unknown }).error;
    if (typeof value === "string") return value;
  }
  return fallback;
}

export function TestRunner({
  scope,
  length,
}: {
  scope: ScopeSlug;
  length: number;
}) {
  const router = useRouter();
  const scopeInfo = getScope(scope);
  const started = useRef(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [stage, setStage] = useState<Stage>("starting");
  const [testId, setTestId] = useState<string | null>(null);
  const [item, setItem] = useState<PublicItem | null>(null);
  const [feedback, setFeedback] = useState<AnswerResponse | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [exitOpen, setExitOpen] = useState(false);

  const start = useCallback(async () => {
    setStage("starting");
    setError(null);
    setFeedback(null);
    setItem(null);
    setTestId(null);
    try {
      const response = await fetch("/api/tests", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ scope, length }),
      });
      const data = (await response.json().catch(() => null)) as
        | { testId?: string; item?: PublicItem; error?: string }
        | null;
      if (!response.ok || !data?.testId || !data.item) {
        throw new Error(messageOf(data, "没能开始测试，请稍后再试"));
      }
      setTestId(data.testId);
      setItem(data.item);
      setStage("active");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "网络似乎不太稳定");
      setStage("error");
    }
  }, [scope, length]);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    void start();
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [start]);

  useEffect(() => {
    if (stage !== "active") return;
    const handler = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [stage]);

  const advance = useCallback(() => {
    if (!feedback) return;
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    if (feedback.finished && feedback.result) {
      router.push(`/result/${feedback.result.id}`);
      return;
    }
    if (feedback.nextItem) {
      setItem(feedback.nextItem);
      setFeedback(null);
      setError(null);
    }
  }, [feedback, router]);

  const answer = useCallback(
    async (choice: number | null) => {
      if (!testId || !item || pending || feedback) return;
      setPending(true);
      setError(null);
      try {
        const response = await fetch(`/api/tests/${testId}/answer`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ wordId: item.wordId, choice }),
        });
        const data = (await response.json().catch(() => null)) as
          | (AnswerResponse & { error?: string })
          | null;
        if (!response.ok || !data || typeof data.correct !== "boolean") {
          throw new Error(messageOf(data, "提交失败，请重试"));
        }

        setFeedback(data);
        setPending(false);
        if (data.finished && data.result) {
          saveHistory(data.result);
        }
        timerRef.current = setTimeout(
          () => {
            if (data.finished && data.result) {
              router.push(`/result/${data.result.id}`);
              return;
            }
            if (data.nextItem) {
              setItem(data.nextItem);
              setFeedback(null);
              setError(null);
            }
          },
          data.finished ? 1100 : 1400,
        );
      } catch (reason) {
        setPending(false);
        setError(reason instanceof Error ? reason.message : "提交失败，请重试");
      }
    },
    [feedback, item, pending, router, testId],
  );

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (exitOpen) return;
      const tag = (document.activeElement?.tagName ?? "").toLowerCase();
      if (tag === "input" || tag === "textarea" || tag === "select") return;

      if (stage === "active" && feedback) {
        if (event.key === "Enter") {
          event.preventDefault();
          advance();
        }
        return;
      }
      if (stage !== "active" || !item) return;

      if (event.key === "Escape") {
        setExitOpen(true);
        return;
      }
      if (event.key === " " || event.key.toLowerCase() === "n") {
        event.preventDefault();
        void answer(null);
        return;
      }

      const numeric = ["1", "2", "3", "4"].indexOf(event.key);
      if (numeric >= 0) {
        event.preventDefault();
        void answer(numeric);
        return;
      }
      const alpha = ["a", "b", "c", "d"].indexOf(event.key.toLowerCase());
      if (alpha >= 0) {
        event.preventDefault();
        void answer(alpha);
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [advance, answer, exitOpen, feedback, item, stage]);

  const speak = useCallback(() => {
    if (!item || typeof window === "undefined" || !("speechSynthesis" in window)) {
      return;
    }
    const utterance = new SpeechSynthesisUtterance(item.word);
    utterance.lang = "en-US";
    utterance.rate = 0.9;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
  }, [item]);

  if (!scopeInfo) {
    return (
      <div className="flex min-h-screen items-center justify-center px-5">
        <div className="card max-w-md p-8 text-center">
          <p className="font-display text-2xl">测试范围不正确</p>
          <p className="mt-3 text-sm text-ink-soft">请回到首页重新选择词书。</p>
          <Link href="/#test" className="btn btn-primary mt-6">
            返回选择
          </Link>
        </div>
      </div>
    );
  }

  if (stage === "error") {
    return (
      <div className="flex min-h-screen items-center justify-center px-5">
        <div className="card w-full max-w-md p-8 text-center">
          <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-coral-soft text-coral">
            <X className="h-5 w-5" />
          </span>
          <p className="mt-5 font-display text-2xl tracking-tight">测试没能开始</p>
          <p className="mt-2 text-sm leading-6 text-ink-soft">{error}</p>
          <div className="mt-7 flex justify-center gap-2">
            <button type="button" onClick={() => void start()} className="btn btn-primary">
              重试
            </button>
            <Link href="/" className="btn btn-outline">
              回到首页
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (stage === "starting" || !item) {
    return (
      <div className="flex min-h-screen items-center justify-center px-5">
        <div className="text-center">
          <div className="mx-auto h-11 w-11 animate-spin rounded-full border-2 border-line border-t-green" />
          <p className="mt-6 font-display text-xl tracking-tight">正在为你准备第一道题</p>
          <p className="mt-2 text-xs tracking-wide text-ink-soft">
            {scopeInfo.name} · {length} 题 · 自适应出题
          </p>
        </div>
      </div>
    );
  }

  const answered = feedback ? feedback.progress.answered : Math.max(0, item.index - 1);
  const progress = Math.min(100, (answered / length) * 100);
  const finished = feedback?.finished === true;

  return (
    <div className="relative flex min-h-screen flex-col">
      <div
        className="pointer-events-none fixed inset-0 -z-10 opacity-40 dot-grid"
        aria-hidden="true"
      />
      <header className="sticky top-0 z-30 border-b border-line/60 bg-paper/85 backdrop-blur-xl">
        <div className="container-page flex h-16 items-center justify-between">
          <Logo compact />
          <div className="flex items-center gap-3">
            <span className="hidden text-[11px] font-semibold tracking-[0.1em] text-ink-soft sm:inline">
              {scopeInfo.name} · {length} 题
            </span>
            <button
              type="button"
              onClick={() => setExitOpen(true)}
              className="btn btn-quiet px-3! py-2! text-[12px]"
            >
              <X className="h-3.5 w-3.5" />
              退出
            </button>
          </div>
        </div>
        <div className="h-[3px] w-full bg-line/40">
          <div
            className="h-full bg-green transition-[width] duration-500 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
      </header>

      <main className="container-page flex w-full flex-1 flex-col items-center justify-center py-8 sm:py-12">
        <div className="w-full max-w-[760px] animate-fade">
          <div className="mb-4 flex items-center justify-between px-1">
            <span className="chip bg-white/40">
              <span className="h-1.5 w-1.5 rounded-full bg-green" />
              {scopeInfo.short}词库
            </span>
            <span className="text-[11px] font-semibold tracking-[0.08em] text-ink-soft tabular-nums">
              第 {item.index} / {length} 题
              <span className="ml-2 text-ink-soft/55">已答 {answered}</span>
            </span>
          </div>

          <div className="card relative overflow-hidden px-5 py-8 sm:px-12 sm:py-11">
            <div
              className="pointer-events-none absolute -right-16 -top-20 h-52 w-52 rounded-full bg-green/[0.06] blur-2xl"
              aria-hidden="true"
            />

            <div className="relative text-center">
              <p className="text-[9px] font-bold tracking-[0.26em] text-ink-soft/65">
                WORD {String(item.index).padStart(2, "0")}
              </p>
              <h1 data-testid="word" className="mt-3 break-words font-display text-[clamp(2.8rem,10vw,5.2rem)] font-medium leading-[1.05] tracking-[-0.035em]">
                {item.word}
              </h1>
              <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
                {item.phonetic ? (
                  <span className="text-[13px] tracking-wide text-ink-soft">
                    {displayPhonetic(item.phonetic)}
                  </span>
                ) : null}
                <button
                  type="button"
                  onClick={speak}
                  aria-label={`朗读 ${item.word}`}
                  className="flex h-8 w-8 items-center justify-center rounded-full border border-line/80 bg-white/40 text-ink-soft transition-colors hover:border-green/40 hover:text-green"
                >
                  <Speaker className="h-3.5 w-3.5" />
                </button>
              </div>
              <p className="mt-7 text-[11px] font-semibold tracking-[0.12em] text-ink-soft">
                选出最接近的中文释义
              </p>
            </div>

            <div className="relative mt-5 grid gap-2.5 sm:grid-cols-2">
              {item.options.map((option, index) => {
                const isCorrect = feedback?.correctIndex === index;
                const isChosen = feedback?.chosenIndex === index;
                let tone =
                  "border-line/80 bg-white/40 text-ink hover:-translate-y-0.5 hover:border-ink/25 hover:bg-white/70";
                if (feedback) {
                  if (isCorrect) {
                    tone = "border-green/55 bg-green-soft/85 text-green-deep";
                  } else if (isChosen) {
                    tone = "border-coral/50 bg-coral-soft/80 text-coral";
                  } else {
                    tone = "border-line/55 bg-white/20 text-ink-soft/55";
                  }
                }
                return (
                  <button
                    key={option.key}
                    type="button"
                    data-testid={`option-${index}`}
                    onClick={() => void answer(index)}
                    disabled={pending || Boolean(feedback)}
                    aria-pressed={isChosen}
                    className={`group flex min-h-[74px] items-center gap-3.5 rounded-2xl border px-4 py-3.5 text-left transition-all duration-150 ${tone} ${
                      pending ? "cursor-wait" : ""
                    }`}
                  >
                    <span
                      className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-[11px] font-semibold ${
                        isCorrect
                          ? "border-green bg-green text-paper-2"
                          : isChosen
                            ? "border-coral bg-coral text-paper-2"
                            : "border-line/90 text-ink-soft group-hover:border-ink/30"
                      }`}
                    >
                      {isCorrect ? (
                        <Check className="h-3.5 w-3.5" />
                      ) : isChosen ? (
                        <X className="h-3.5 w-3.5" />
                      ) : (
                        option.key
                      )}
                    </span>
                    <span className="text-[14px] leading-6">{option.text}</span>
                  </button>
                );
              })}
            </div>

            <div className="relative mt-6 flex flex-col gap-4 border-t border-line/70 pt-5 sm:flex-row sm:items-center sm:justify-between">
              <button
                type="button"
                data-testid="unknown"
                onClick={() => void answer(null)}
                disabled={pending || Boolean(feedback)}
                className="btn btn-outline self-start px-4! py-2.5! text-[12px] disabled:opacity-40"
              >
                <EyeOff className="h-3.5 w-3.5" />
                不认识
              </button>
              <p className="hidden text-[10px] tracking-wide text-ink-soft/70 sm:block">
                键盘 1–4 选择 · N / 空格 不认识
              </p>
            </div>

            {error ? (
              <div className="relative mt-4 rounded-xl border border-coral/30 bg-coral-soft/60 px-4 py-3 text-[12px] text-coral">
                {error}，请再选一次。
              </div>
            ) : null}

            {feedback ? (
              <div
                className={`relative mt-4 overflow-hidden rounded-xl border px-4 py-3 ${
                  feedback.correct
                    ? "border-green/25 bg-green-soft/60"
                    : "border-coral/25 bg-coral-soft/50"
                }`}
                aria-live="polite"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p
                    className={`text-[12.5px] font-semibold ${
                      feedback.correct ? "text-green-deep" : "text-coral"
                    }`}
                  >
                    {feedback.correct
                      ? "答对了，这个词在你的词汇里。"
                      : feedback.chosenIndex === null
                        ? `不认识 · 正确释义：${feedback.correctText}`
                        : `答错了 · 正确释义：${feedback.correctText}`}
                  </p>
                  <button
                    type="button"
                    data-testid="next"
                    onClick={advance}
                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-ink-soft transition-colors hover:text-ink"
                  >
                    {finished ? "查看结果" : "下一题"}
                    <ArrowRight className="h-3 w-3" />
                  </button>
                </div>
                <div className="absolute inset-x-0 bottom-0 h-[2px] bg-ink/5">
                  <div
                    className={`h-full animate-progress ${
                      feedback.correct ? "bg-green/60" : "bg-coral/55"
                    }`}
                  />
                </div>
              </div>
            ) : null}
          </div>

          <p className="mt-5 flex items-center justify-center gap-1.5 text-center text-[10.5px] text-ink-soft/65">
            <Info className="h-3 w-3" />
            没有计时压力。实在不认识就点「不认识」，这也是有效信息。
          </p>
        </div>
      </main>

      <Modal
        open={exitOpen}
        onClose={() => setExitOpen(false)}
        title="要退出这次测试吗？"
        footer={
          <>
            <button
              type="button"
              onClick={() => setExitOpen(false)}
              className="btn btn-outline px-4! py-2.5! text-[12px]"
            >
              继续答题
            </button>
            <Link href="/" className="btn btn-primary px-4! py-2.5! text-[12px]">
              退出测试
            </Link>
          </>
        }
      >
        <p className="text-sm leading-6 text-ink-soft">
          当前进度不会保存。你可以随时回来重新开始，题量不多，不会有太大损失。
        </p>
      </Modal>
    </div>
  );
}
