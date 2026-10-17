"use client";

import { useEffect, useState } from "react";

import { formatPercent } from "@/lib/format";

export function CoverageRing({ value }: { value: number }) {
  const [progress, setProgress] = useState(0);
  const size = 196;
  const radius = 74;
  const stroke = 13;
  const circumference = 2 * Math.PI * radius;
  const ratio = Math.min(1, Math.max(0, value));

  useEffect(() => {
    const frame = requestAnimationFrame(() => setProgress(ratio));
    return () => cancelAnimationFrame(frame);
  }, [ratio]);

  return (
    <div className="relative mx-auto w-[196px]">
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        role="img"
        aria-label={`词库覆盖率 ${formatPercent(value, 1)}`}
      >
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#0d6b4f"
          strokeOpacity={0.1}
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#0d6b4f"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - progress)}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          style={{ transition: "stroke-dashoffset 900ms cubic-bezier(.22,.7,.25,1)" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="display-number text-[2.9rem] leading-none">
          {formatPercent(value)}
        </span>
        <span className="mt-2 text-[10px] font-semibold tracking-[0.16em] text-ink-soft">
          词库覆盖率
        </span>
      </div>
    </div>
  );
}
