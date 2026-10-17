import Link from "next/link";

export function LogoMark({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 44 44"
      className={className}
      aria-hidden="true"
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect x="1.5" y="1.5" width="41" height="41" rx="13" fill="currentColor" />
      <path
        d="M12 13v7M18.5 10v10M25 14v5M31.5 11v8"
        stroke="#fbf8f1"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
      <path
        d="M11 31h22"
        stroke="#fbf8f1"
        strokeWidth="2.2"
        strokeLinecap="round"
        opacity=".7"
      />
      <circle cx="33" cy="31" r="2.4" fill="#e7a58f" />
    </svg>
  );
}

export function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <Link
      href="/"
      className="group inline-flex items-center gap-2.5"
      aria-label="词尺 · 返回首页"
    >
      <LogoMark className="h-9 w-9 shrink-0 text-ink transition-colors group-hover:text-green-deep" />
      <span className="flex flex-col leading-none">
        <span className="font-display text-[21px] font-semibold tracking-tight text-ink">
          词尺
        </span>
        {!compact ? (
          <span className="mt-1 hidden text-[8.5px] font-semibold tracking-[0.24em] text-ink-soft sm:block">
            VOCAB RULER
          </span>
        ) : null}
      </span>
    </Link>
  );
}
