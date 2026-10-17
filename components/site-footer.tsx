import Link from "next/link";

import { LogoMark } from "@/components/logo";

export function SiteFooter() {
  return (
    <footer className="mt-20 border-t border-line/70 bg-paper/40">
      <div className="container-page grid gap-10 py-12 md:grid-cols-[1.3fr_1fr_1fr]">
        <div>
          <div className="flex items-center gap-2.5">
            <LogoMark className="h-8 w-8 text-ink" />
            <div>
              <p className="font-display text-lg font-semibold leading-none">词尺</p>
              <p className="mt-1 text-[9px] font-semibold tracking-[0.2em] text-ink-soft">
                VOCAB RULER
              </p>
            </div>
          </div>
          <p className="mt-5 max-w-xs text-sm leading-6 text-ink-soft">
            用自适应测试和统计模型，量一量你真正认识的英语单词。不打卡，不制造焦虑，只给一个诚实的数字。
          </p>
        </div>

        <div>
          <p className="text-xs font-semibold tracking-[0.16em] text-ink-soft">探索</p>
          <ul className="mt-4 space-y-2.5 text-sm">
            <li>
              <Link className="transition-colors hover:text-green" href="/#test">
                开始一次测试
              </Link>
            </li>
            <li>
              <Link className="transition-colors hover:text-green" href="/method">
                测试原理与误差
              </Link>
            </li>
            <li>
              <Link className="transition-colors hover:text-green" href="/history">
                历史测量记录
              </Link>
            </li>
            <li>
              <Link className="transition-colors hover:text-green" href="/wordbook">
                我的生词本
              </Link>
            </li>
          </ul>
        </div>

        <div>
          <p className="text-xs font-semibold tracking-[0.16em] text-ink-soft">数据与隐私</p>
          <p className="mt-4 text-sm leading-6 text-ink-soft">
            词库来自开源项目 ECDICT（MIT License）。测试记录默认只存在你的浏览器；为了分享与刷新后仍可查看，服务端会匿名保存本次结果 30 天。
          </p>
          <p className="mt-4 text-xs text-ink-soft/80">
            © 2026 词尺 · 估算结果为统计推断，不等同于任何考试成绩。
          </p>
        </div>
      </div>
    </footer>
  );
}
