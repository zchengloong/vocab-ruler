import type { Metadata } from "next";
import Link from "next/link";

import { ArrowRight, Info, Lock, Sparkles } from "@/components/icons";

export const metadata: Metadata = {
  title: "测试原理",
  description:
    "词尺如何用词频难度、3PL 项目反应模型与贝叶斯后验估计，从 30 道四选一推算词汇量和 90% 置信区间。",
};

const toc = [
  ["wordbank", "词库与难度"],
  ["model", "作答模型"],
  ["adaptive", "自适应抽题"],
  ["estimate", "词汇量估计"],
  ["books", "词书模式"],
  ["privacy", "数据与隐私"],
  ["limits", "已知局限"],
];

export default function MethodPage() {
  return (
    <div className="container-page py-10 sm:py-14">
      <div className="max-w-3xl">
        <p className="eyebrow">METHODOLOGY</p>
        <h1 className="mt-4 font-display text-4xl leading-[1.1] tracking-tight sm:text-5xl">
          一个数字，
          <br />
          和它背后的误差。
        </h1>
        <p className="mt-6 max-w-2xl text-[14px] leading-7 text-ink-soft">
          词汇量测试很容易变成一个娱乐产品：题目随机、结果取整、没有误差。词尺想做得诚实一点——用项目反应模型估计能力，用后验分布给出区间，并把每一步都摊开给你看。
        </p>
        <div className="mt-7 flex flex-wrap gap-2">
          <span className="chip">ECDICT · MIT</span>
          <span className="chip">3PL / IRT</span>
          <span className="chip">贝叶斯后验</span>
          <span className="chip">90% 置信区间</span>
        </div>
      </div>

      <div className="mt-12 grid min-w-0 gap-10 lg:grid-cols-[210px_minmax(0,1fr)]">
        <aside>
          <nav
            aria-label="目录"
            className="sticky top-24 hidden rounded-2xl border border-line/70 bg-white/20 p-4 lg:block"
          >
            <p className="text-[9.5px] font-bold tracking-[0.18em] text-ink-soft">
              目录
            </p>
            <ol className="mt-4 space-y-2.5">
              {toc.map(([id, label], index) => (
                <li key={id}>
                  <a
                    href={`#${id}`}
                    className="group flex items-center gap-2.5 text-[12px] text-ink-soft transition-colors hover:text-ink"
                  >
                    <span className="w-4 font-mono text-[9px] text-ink-soft/50">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <span className="border-b border-transparent transition-colors group-hover:border-ink/25">
                      {label}
                    </span>
                  </a>
                </li>
              ))}
            </ol>
            <div className="mt-6 border-t border-line/60 pt-4">
              <p className="text-[10px] leading-5 text-ink-soft/75">
                不想读公式？直接测一次也能看懂结果页的区间。
              </p>
              <Link
                href="/#test"
                className="mt-3 inline-flex items-center gap-1 text-[11px] font-semibold text-green"
              >
                开始测试
                <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
          </nav>
        </aside>

        <article className="min-w-0 max-w-2xl">
          <section id="wordbank" className="scroll-mt-24">
            <h2 className="font-display text-2xl tracking-tight">
              <span className="mr-3 font-mono text-xs text-green">01</span>
              词库与难度
            </h2>
            <p className="mt-4 text-[13.5px] leading-7 text-ink-soft">
              词库来自开源词典项目{" "}
              <a
                href="https://github.com/skywind3000/ECDICT"
                target="_blank"
                rel="noreferrer"
                className="font-medium text-green underline decoration-green/30 underline-offset-4"
              >
                ECDICT
              </a>
              （MIT License）。原始数据约 77 万行，我们只保留带考试标签、有中文释义、且具备词频信息的单词，清洗并去重后得到{" "}
              <strong className="font-semibold text-ink">14,088 个单词</strong>，其中综合词库取最高频的 12,000 个。
            </p>
            <p className="mt-3 text-[13.5px] leading-7 text-ink-soft">
              每个单词都在词书内部按词频排序。第 <code className="rounded bg-ink/5 px-1 py-0.5 text-[12px]">i</code>{" "}
              个词的难度由它的词频百分位 <code className="rounded bg-ink/5 px-1 py-0.5 text-[12px]">p = (i - 0.5) / N</code>{" "}
              经正态分位变换得到：
            </p>
            <div className="mt-4 overflow-x-auto rounded-2xl border border-line/75 bg-ink px-5 py-4 text-paper-2">
              <code className="whitespace-nowrap font-mono text-[12.5px]">
                b = 1.55 × Φ⁻¹(p)，并截断在 [−3.4, 3.4]
              </code>
            </div>
            <p className="mt-3 text-[12.5px] leading-6 text-ink-soft">
              越罕见的词 b 越高；位于词书中位数的词 b = 0。这样，不同词书都有一把相对自己词库的尺子。
            </p>
          </section>

          <div className="my-10 h-px bg-line/70" />

          <section id="model" className="scroll-mt-24">
            <h2 className="font-display text-2xl tracking-tight">
              <span className="mr-3 font-mono text-xs text-green">02</span>
              作答模型
            </h2>
            <p className="mt-4 text-[13.5px] leading-7 text-ink-soft">
              每道题是四选一，所以即使完全不会，也有 25% 的概率蒙对。我们用带猜测下限的三参数逻辑斯蒂模型（3PL）描述一次作答：
            </p>
            <div className="mt-4 rounded-2xl border border-line/75 bg-paper-2 px-5 py-5">
              <code className="block overflow-x-auto whitespace-nowrap font-mono text-[13px]">
                P(答对 | θ) = c + (1 − c) / (1 + e^(−a(θ − b)))
              </code>
              <div className="mt-4 grid gap-2 text-[12px] text-ink-soft sm:grid-cols-2">
                <p><span className="font-mono text-green">θ</span> 潜在词汇能力</p>
                <p><span className="font-mono text-green">b</span> 单词难度（词频）</p>
                <p><span className="font-mono text-green">a = 1.1</span> 区分度</p>
                <p><span className="font-mono text-green">c = 0.25</span> 猜测下限</p>
              </div>
            </div>
            <p className="mt-3 text-[12.5px] leading-6 text-ink-soft">
              「不认识」按未答对处理；它不会像随机点选项那样带来蒙对收益。模型会综合整场作答，而不是简单数正确题数。
            </p>
            <div className="mt-5 rounded-2xl border-l-2 border-green/40 bg-green-soft/35 px-4 py-3 text-[12px] leading-6 text-ink-soft">
              <span className="font-semibold text-green-deep">为什么不是正确率？</span>{" "}
              自适应题目会集中在你的水平附近，所以正确率天然接近 50%–70%。答对一道低频难词，比答对一道高频词提供更多信息。
            </div>
          </section>

          <div className="my-10 h-px bg-line/70" />

          <section id="adaptive" className="scroll-mt-24">
            <h2 className="font-display text-2xl tracking-tight">
              <span className="mr-3 font-mono text-xs text-green">03</span>
              自适应抽题
            </h2>
            <p className="mt-4 text-[13.5px] leading-7 text-ink-soft">
              每答完一题，模型先更新对 θ 的估计，再从尚未出现的词里挑难度接近当前能力的题：
            </p>
            <ol className="mt-4 space-y-3 text-[13px] leading-6 text-ink-soft">
              <li className="flex gap-3">
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-green-soft text-[9px] font-bold text-green">1</span>
                在 θ 附近加入一点随机扰动，避免每次都抽到完全相同的难度；
              </li>
              <li className="flex gap-3">
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-green-soft text-[9px] font-bold text-green">2</span>
                取难度相差不超过 0.45 的候选词；候选不足时逐步放宽到 0.9；
              </li>
              <li className="flex gap-3">
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-green-soft text-[9px] font-bold text-green">3</span>
                从最接近的 12 个词里随机选一个，已经问过的词不会重复。
              </li>
            </ol>
            <p className="mt-3 text-[12.5px] leading-6 text-ink-soft">
              第一题故意从略低于中位数的位置开始，作为热身。20 / 30 / 50 题三种长度使用同一套规则，题量越多，区间通常越窄。
            </p>
          </section>

          <div className="my-10 h-px bg-line/70" />

          <section id="estimate" className="scroll-mt-24">
            <h2 className="font-display text-2xl tracking-tight">
              <span className="mr-3 font-mono text-xs text-green">04</span>
              词汇量估计
            </h2>
            <p className="mt-4 text-[13.5px] leading-7 text-ink-soft">
              我们不在 30 题上直接乘一个系数，而是在 θ 的后验分布上积分。对词库里的每个词，计算「以当前能力，认识它的概率」，再全部相加：
            </p>
            <div className="mt-4 rounded-2xl border border-line/75 bg-ink px-5 py-4 text-paper-2">
              <code className="block overflow-x-auto whitespace-nowrap font-mono text-[12.5px]">
                V̂ = Σ_i ∫ P(掌握_i | θ) · p(θ | 作答) dθ
              </code>
            </div>
            <p className="mt-3 text-[12.5px] leading-6 text-ink-soft">
              具体实现里，θ 在 [−4.5, 4.5] 上以 0.05 为步长离散化，先验为 N(0, 1.35²)。后验的 5% 与 95% 分位点构成 90% 置信区间，并换算成词数。最终展示的数字四舍五入到 10 词，区间也做同样处理。
            </p>
            <p className="mt-3 text-[12.5px] leading-6 text-ink-soft">
              因此，置信区间不是装饰：它反映「这次作答之后，模型仍不确定的那部分」。如果答得很快、题量较少，区间会更宽。
            </p>
          </section>

          <div className="my-10 h-px bg-line/70" />

          <section id="books" className="scroll-mt-24">
            <h2 className="font-display text-2xl tracking-tight">
              <span className="mr-3 font-mono text-xs text-green">05</span>
              词书模式
            </h2>
            <p className="mt-4 text-[13.5px] leading-7 text-ink-soft">
              选择四级、六级、考研、托福、雅思或 GRE 时，能力 θ 与难度 b 都以该词书内部为参照，最终数字表示「在这本书的收录范围内，估计掌握了多少词」。分母是 ECDICT 实际收录量，而不是官方大纲数字；结果页会同时给出常见大纲的参考值。
            </p>
            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              {[
                ["综合词汇", "12,000 词", "估算整体词汇量"],
                ["四级 / 六级", "3,830 / 5,382 词", "只评估对应词书"],
                ["考研 / 托福", "4,799 / 6,843 词", "只评估对应词书"],
                ["雅思 / GRE", "4,721 / 7,122 词", "只评估对应词书"],
              ].map(([name, size, note]) => (
                <div key={name} className="rounded-xl border border-line/65 bg-white/25 p-3">
                  <p className="text-[12px] font-semibold">{name}</p>
                  <p className="mt-1 font-mono text-[11px] text-green">{size}</p>
                  <p className="mt-1 text-[10px] text-ink-soft">{note}</p>
                </div>
              ))}
            </div>
            <p className="mt-3 text-[12.5px] leading-6 text-ink-soft">
              不同词书的分数不能直接比较：一个「四级 3,500 词」和一个「综合 8,000 词」不是同一把尺子上的两个刻度。
            </p>
          </section>

          <div className="my-10 h-px bg-line/70" />

          <section id="privacy" className="scroll-mt-24">
            <h2 className="font-display text-2xl tracking-tight">
              <span className="mr-3 font-mono text-xs text-green">06</span>
              数据与隐私
            </h2>
            <div className="mt-4 space-y-4">
              <div className="flex gap-3">
                <Lock className="mt-0.5 h-4 w-4 shrink-0 text-green" />
                <p className="text-[13px] leading-6 text-ink-soft">
                  不需要账号。历史记录和生词本只写进浏览器 localStorage。
                </p>
              </div>
              <div className="flex gap-3">
                <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-green" />
                <p className="text-[13px] leading-6 text-ink-soft">
                  为了刷新后仍能查看、并支持分享链接，服务端会保存匿名的结果与作答明细，30 天后自动清理。它不包含姓名、邮箱或设备标识。
                </p>
              </div>
              <div className="flex gap-3">
                <Info className="mt-0.5 h-4 w-4 shrink-0 text-green" />
                <p className="text-[13px] leading-6 text-ink-soft">
                  在历史页删除一条记录时，浏览器会同时请求服务端删除对应结果。清空历史会逐条删除，不会动生词本。
                </p>
              </div>
            </div>
          </section>

          <div className="my-10 h-px bg-line/70" />

          <section id="limits" className="scroll-mt-24">
            <h2 className="font-display text-2xl tracking-tight">
              <span className="mr-3 font-mono text-xs text-green">07</span>
              已知局限
            </h2>
            <ul className="mt-4 space-y-3 text-[13px] leading-6 text-ink-soft">
              <li>· 词频只是难度的近似，不是唯一因素；抽象词、熟词僻义可能被低估或高估。</li>
              <li>· 中文释义来自 ECDICT，少量释义可能不够准确或过于生僻，干扰项也由程序生成。</li>
              <li>· 四选一允许蒙对，模型只能从统计上校正，不能完全消除。</li>
              <li>· 自适应抽题会让各频段题量不均，词书覆盖率是模型估计值，不是逐词普查。</li>
              <li>· 词汇量不等于阅读、听力、写作能力，更不等同于四六级或托福雅思分数。</li>
            </ul>
          </section>

          <div className="mt-10 flex flex-col justify-between gap-5 rounded-2xl border border-line/75 bg-white/25 p-6 sm:flex-row sm:items-center">
            <div>
              <p className="font-display text-lg tracking-tight">读完了，量一下？</p>
              <p className="mt-1 text-[12px] text-ink-soft">
                30 道题，约 3 分钟，带置信区间。
              </p>
            </div>
            <Link href="/#test" className="btn btn-primary shrink-0">
              开始测试
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </article>
      </div>
    </div>
  );
}
