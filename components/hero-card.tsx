import { Check, Speaker, Sparkles } from "@/components/icons";

const options = [
  { text: "意外发现珍奇事物的能力", state: "correct" },
  { text: "固执己见；教条", state: "idle" },
  { text: "短暂停留；逗留", state: "idle" },
  { text: "含糊其辞；搪塞", state: "idle" },
];

export function HeroCard() {
  return (
    <div className="relative mx-auto w-full max-w-[430px]">
      <div
        className="absolute -inset-8 -z-10 rounded-full bg-green/10 blur-3xl"
        aria-hidden="true"
      />
      <div
        className="absolute -left-10 bottom-10 top-24 hidden w-9 sm:block"
        aria-hidden="true"
      >
        <div className="relative h-full w-px bg-line">
          {[0, 1, 2, 3, 4].map((index) => (
            <span
              key={index}
              className="absolute -left-2 h-px w-5 bg-line"
              style={{ top: `${index * 24}%` }}
            />
          ))}
        </div>
        <span className="absolute -left-3 top-1/2 -translate-y-1/2 -rotate-90 text-[9px] font-semibold tracking-[0.22em] text-ink-soft/70">
          12,000 WORDS
        </span>
      </div>

      <div className="animate-float rounded-[30px] border border-line/90 bg-paper-2 p-6 shadow-[0_40px_90px_-50px_rgba(24,21,17,.75)] sm:p-7">
        <div className="flex items-center justify-between border-b border-line/60 pb-4">
          <span className="text-[9px] font-bold tracking-[0.18em] text-ink-soft">
            VOCABULARY · ADAPTIVE
          </span>
          <span className="text-[9px] font-semibold tracking-[0.12em] text-ink-soft/80">
            NO. 024
          </span>
        </div>

        <div className="mt-6 flex items-start justify-between gap-3">
          <div>
            <p className="font-display text-[clamp(2.3rem,6vw,3rem)] leading-none tracking-tight">
              serendipity
            </p>
            <p className="mt-2 text-[13px] tracking-wide text-ink-soft">
              /ˌserənˈdɪpəti/
            </p>
          </div>
          <span className="mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-line/80 bg-white/50 text-ink-soft">
            <Speaker className="h-4 w-4" />
          </span>
        </div>

        <p className="mt-5 text-[10px] font-semibold tracking-[0.12em] text-ink-soft">
          选出最接近的中文释义
        </p>
        <div className="mt-3 space-y-2">
          {options.map((option, index) => {
            const active = option.state === "correct";
            return (
              <div
                key={option.text}
                className={`flex items-center gap-3 rounded-xl border px-3.5 py-2.5 text-[13px] ${
                  active
                    ? "border-green/45 bg-green-soft/80 text-green-deep"
                    : "border-line/70 bg-white/35 text-ink-soft"
                }`}
              >
                <span
                  className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-[9px] font-semibold ${
                    active
                      ? "border-green bg-green text-paper-2"
                      : "border-line text-ink-soft/70"
                  }`}
                >
                  {active ? <Check className="h-3 w-3" /> : String.fromCharCode(65 + index)}
                </span>
                <span className="truncate">{option.text}</span>
              </div>
            );
          })}
        </div>

        <div className="mt-5 flex items-center justify-between border-t border-line/60 pt-4">
          <div className="flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-green" />
            <span className="text-[10px] font-medium text-ink-soft">12 / 30 · 自适应中</span>
          </div>
          <span className="inline-flex items-center gap-1 rounded-full bg-ink px-3 py-1.5 text-[10px] font-semibold text-paper-2">
            <Sparkles className="h-3 w-3 text-[#e7a58f]" />
            估算 8,240 ± 320
          </span>
        </div>
      </div>

      <div className="absolute -right-3 -top-3 rotate-3 rounded-full border border-line/80 bg-paper-2 px-3.5 py-1.5 text-[10px] font-semibold text-ink-soft shadow-sm sm:-right-5">
        90% 置信区间
      </div>
      <p className="mt-5 text-center text-[10px] tracking-wide text-ink-soft/75">
        界面示意图 · 实际题目与结果由你的作答生成
      </p>
    </div>
  );
}
