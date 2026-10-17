import Link from "next/link";

import { HeroCard } from "@/components/hero-card";
import {
  ArrowRight,
  Chart,
  Info,
  Sparkles,
  Target,
} from "@/components/icons";
import { RecentResults } from "@/components/recent-results";
import { TestLauncher } from "@/components/test-launcher";
import { getBooksWithSizes } from "@/lib/db";
import { formatNumber } from "@/lib/format";

const steps = [
  {
    number: "01",
    icon: Target,
    title: "按词频出题",
    body: "近 14,000 个考试词汇按真实使用频率排成一把尺子。系统先问一道中等难度的词，再根据你的对错往上下移动。",
  },
  {
    number: "02",
    icon: Chart,
    title: "四选一，校正蒙对",
    body: "每题四个中文释义。IRT 模型把 25% 的猜对概率计算在内，答对难题比答对简单题提供更多信息。",
  },
  {
    number: "03",
    icon: Sparkles,
    title: "给出区间，而非幻觉",
    body: "30 题后，模型给出词汇量与 90% 置信区间。它诚实地告诉你：这个数字可能的误差有多大。",
  },
];

export default function HomePage() {
  const books = getBooksWithSizes();
  const totalWords = books[0]?.size ?? 0;

  return (
    <main>
        <section className="container-page relative overflow-hidden pb-16 pt-12 sm:pb-24 sm:pt-20">
          <div className="grid items-center gap-14 lg:grid-cols-[1.08fr_0.92fr] lg:gap-10">
            <div className="animate-rise">
              <p className="eyebrow">ADAPTIVE VOCABULARY TEST</p>
              <h1 className="mt-5 font-display text-[clamp(2.8rem,6.4vw,5.1rem)] font-medium leading-[1.04] tracking-[-0.045em]">
                量一量，
                <br />
                你的词汇量
                <br />
                <span className="relative inline-block text-green-deep">
                  到底有多少。
                  <svg
                    className="absolute -bottom-2 left-0 h-3 w-full text-coral/70"
                    viewBox="0 0 300 12"
                    fill="none"
                    preserveAspectRatio="none"
                    aria-hidden="true"
                  >
                    <path
                      d="M2 8.5C58 3 137 2.5 298 6.5"
                      stroke="currentColor"
                      strokeWidth="2.2"
                      strokeLinecap="round"
                    />
                    <path
                      d="M12 11C80 7 190 6.5 284 9"
                      stroke="currentColor"
                      strokeWidth="1"
                      strokeLinecap="round"
                      opacity=".45"
                    />
                  </svg>
                </span>
              </h1>

              <p className="mt-8 max-w-lg text-[15px] leading-7 text-ink-soft sm:text-base">
                30 道四选一，按你的作答实时调整难度。三分钟后，得到一个带
                90% 置信区间的词汇量，以及它对应的四级、六级、考研、托福与
                GRE 位置。
              </p>

              <div className="mt-8 flex flex-wrap items-center gap-3">
                <Link href="#test" className="btn btn-primary group px-6 py-3.5">
                  开始免费测试
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </Link>
                <Link href="/method" className="btn btn-outline px-5 py-3.5">
                  <Info className="h-4 w-4" />
                  先看测算原理
                </Link>
              </div>

              <dl className="mt-10 flex flex-wrap items-center gap-x-8 gap-y-4 border-t border-line/70 pt-6">
                <div>
                  <dt className="text-[10px] font-semibold tracking-[0.14em] text-ink-soft">
                    测试词库
                  </dt>
                  <dd className="mt-1 font-display text-xl tracking-tight">
                    {formatNumber(totalWords)}{" "}
                    <span className="text-xs text-ink-soft">词</span>
                  </dd>
                </div>
                <div>
                  <dt className="text-[10px] font-semibold tracking-[0.14em] text-ink-soft">
                    覆盖词书
                  </dt>
                  <dd className="mt-1 font-display text-xl tracking-tight">
                    {books.length}{" "}
                    <span className="text-xs text-ink-soft">本</span>
                  </dd>
                </div>
                <div>
                  <dt className="text-[10px] font-semibold tracking-[0.14em] text-ink-soft">
                    标准用时
                  </dt>
                  <dd className="mt-1 font-display text-xl tracking-tight">
                    3 <span className="text-xs text-ink-soft">分钟</span>
                  </dd>
                </div>
              </dl>
            </div>

            <div className="animate-rise stagger-2 lg:justify-self-end">
              <HeroCard />
            </div>
          </div>
        </section>

        <section id="test" className="container-page scroll-mt-24 pb-16">
          <div className="card p-5 sm:p-9 lg:p-10">
            <TestLauncher books={books} />
          </div>
        </section>

        <section className="container-page pb-16">
          <div className="relative overflow-hidden rounded-[2rem] bg-ink px-6 py-10 text-paper-2 sm:px-10 sm:py-12">
            <div
              className="pointer-events-none absolute -right-20 -top-24 h-72 w-72 rounded-full bg-green/25 blur-3xl"
              aria-hidden="true"
            />
            <div
              className="pointer-events-none absolute -bottom-28 left-1/3 h-64 w-64 rounded-full bg-coral/15 blur-3xl"
              aria-hidden="true"
            />
            <div className="relative">
              <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
                <div>
                  <p className="text-[10px] font-bold tracking-[0.2em] text-[#e7a58f]">
                    HOW IT WORKS
                  </p>
                  <h2 className="mt-3 font-display text-3xl tracking-tight sm:text-[2.4rem]">
                    不是背得多，而是测得准。
                  </h2>
                </div>
                <Link
                  href="/method"
                  className="inline-flex items-center gap-2 text-xs font-semibold text-paper-2/70 transition-colors hover:text-paper-2"
                >
                  完整方法说明
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>

              <div className="mt-9 grid gap-7 md:grid-cols-3">
                {steps.map((step) => {
                  const Icon = step.icon;
                  return (
                    <div key={step.number} className="border-t border-white/15 pt-5">
                      <div className="flex items-center justify-between">
                        <span className="font-display text-sm text-paper-2/45">
                          {step.number}
                        </span>
                        <Icon className="h-5 w-5 text-[#8fd3b6]" />
                      </div>
                      <h3 className="mt-4 text-[15px] font-semibold tracking-tight">
                        {step.title}
                      </h3>
                      <p className="mt-2 text-[12.5px] leading-6 text-paper-2/60">
                        {step.body}
                      </p>
                    </div>
                  );
                })}
              </div>

              <div className="mt-9 flex flex-wrap items-center gap-3 border-t border-white/10 pt-6 text-[11px] text-paper-2/45">
                <span className="rounded-full border border-white/15 px-3 py-1 font-mono">
                  P(答对) = 0.25 + 0.75 / (1 + e<sup>−1.1(θ−b)</sup>)
                </span>
                <span>θ 为能力，b 为词频难度</span>
              </div>
            </div>
          </div>
        </section>

        <RecentResults />

        <section className="container-page pt-14">
          <div className="flex flex-col items-center justify-between gap-6 rounded-[1.75rem] border border-dashed border-line bg-white/20 px-6 py-8 text-center sm:flex-row sm:text-left">
            <div>
              <h2 className="font-display text-2xl tracking-tight">
                数字只是一个起点。
              </h2>
              <p className="mt-2 max-w-xl text-sm leading-6 text-ink-soft">
                测完可以逐题回顾、把不认识的词加入生词本，或隔一段时间再测一次，看曲线有没有真的往上走。
              </p>
            </div>
            <Link href="#test" className="btn btn-primary shrink-0 px-5 py-3">
              现在就测
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </section>
    </main>
  );
}
