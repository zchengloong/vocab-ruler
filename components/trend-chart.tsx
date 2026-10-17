"use client";

import { useId, useState } from "react";

import { formatDate, formatMonthDay, formatNumber, formatPercent } from "@/lib/format";
import type { HistoryEntry } from "@/lib/types";

const W = 760;
const H = 280;
const PAD = { left: 48, right: 18, top: 22, bottom: 42 };

function niceTicks(min: number, max: number, count = 5): number[] {
  const span = Math.max(1, max - min);
  const step = span / (count - 1);
  return Array.from({ length: count }, (_, index) => min + step * index);
}

export function TrendChart({
  entries,
  mode,
}: {
  entries: HistoryEntry[];
  mode: "coverage" | "score";
}) {
  const gradientId = useId().replaceAll(":", "");
  const [active, setActive] = useState<number | null>(null);

  if (entries.length === 0) {
    return (
      <div className="flex h-[240px] items-center justify-center text-sm text-ink-soft">
        还没有可以绘制的记录
      </div>
    );
  }

  const ordered = [...entries].sort((left, right) =>
    left.createdAt.localeCompare(right.createdAt),
  );
  const values = ordered.map((entry) =>
    mode === "coverage" ? entry.coverage * 100 : entry.score,
  );

  let min: number;
  let max: number;
  if (mode === "coverage") {
    min = 0;
    max = 100;
  } else {
    const low = Math.min(...values);
    const high = Math.max(...values);
    const padding = Math.max(150, (high - low) * 0.3);
    min = Math.max(0, Math.floor((low - padding) / 100) * 100);
    max = Math.ceil((high + padding) / 100) * 100;
    if (max - min < 400) {
      min = Math.max(0, min - 200);
      max = max + 200;
    }
  }

  const innerW = W - PAD.left - PAD.right;
  const innerH = H - PAD.top - PAD.bottom;
  const x = (index: number) =>
    PAD.left + (ordered.length === 1 ? innerW / 2 : (index / (ordered.length - 1)) * innerW);
  const y = (value: number) =>
    PAD.top + (1 - (value - min) / Math.max(1, max - min)) * innerH;

  const points = values.map((value, index) => ({
    x: x(index),
    y: y(value),
    value,
    entry: ordered[index],
  }));

  const line = points
    .map((point, index) => `${index === 0 ? "M" : "L"}${point.x.toFixed(2)},${point.y.toFixed(2)}`)
    .join(" ");
  const area = `${line} L${points[points.length - 1].x.toFixed(2)},${H - PAD.bottom} L${points[0].x.toFixed(2)},${H - PAD.bottom} Z`;

  const ticks = niceTicks(min, max);
  const labelIndexes =
    ordered.length === 1
      ? [0]
      : ordered.length <= 4
        ? ordered.map((_, index) => index)
        : [0, Math.floor((ordered.length - 1) / 2), ordered.length - 1];

  const activePoint = active !== null ? points[active] : null;
  const sameDay =
    new Set(ordered.map((entry) => entry.createdAt.slice(0, 10))).size === 1;

  return (
    <div className="relative">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full"
        role="img"
        aria-label={`${mode === "coverage" ? "词库覆盖率" : "词汇量"}趋势图，共 ${entries.length} 次测试`}
      >
        <defs>
          <linearGradient id={`area-${gradientId}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#0d6b4f" stopOpacity="0.22" />
            <stop offset="100%" stopColor="#0d6b4f" stopOpacity="0" />
          </linearGradient>
        </defs>

        {ticks.map((tick) => (
          <g key={tick}>
            <line
              x1={PAD.left}
              y1={y(tick)}
              x2={W - PAD.right}
              y2={y(tick)}
              stroke="#ded4c1"
              strokeWidth={1}
              strokeDasharray="3 5"
              opacity={0.65}
            />
            <text
              x={PAD.left - 10}
              y={y(tick) + 4}
              textAnchor="end"
              fontSize={10}
              fill="#8b8275"
            >
              {mode === "coverage" ? `${Math.round(tick)}%` : formatNumber(tick)}
            </text>
          </g>
        ))}

        {mode === "score" ? (
          <path
            d={`${points.map((point, index) => `${index === 0 ? "M" : "L"}${point.x},${y(point.entry.ciHigh)}`).join(" ")} ${[...points].reverse().map((point) => `L${point.x},${y(point.entry.ciLow)}`).join(" ")} Z`}
            fill="#0d6b4f"
            opacity={0.08}
          />
        ) : null}

        <path d={area} fill={`url(#area-${gradientId})`} />
        <path
          d={line}
          fill="none"
          stroke="#0d6b4f"
          strokeWidth={2.4}
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {points.map((point, index) => (
          <g key={point.entry.id}>
            <circle
              cx={point.x}
              cy={point.y}
              r={active === index ? 6 : 4}
              fill="#fbf8f1"
              stroke="#0d6b4f"
              strokeWidth={2.5}
            />
            <rect
              x={PAD.left + (index * innerW) / Math.max(1, ordered.length)}
              y={PAD.top}
              width={innerW / Math.max(1, ordered.length)}
              height={innerH}
              fill="transparent"
              onMouseEnter={() => setActive(index)}
              onMouseLeave={() => setActive(null)}
              onClick={() => setActive(index)}
            />
          </g>
        ))}

        {labelIndexes.map((index) => (
          <text
            key={index}
            x={points[index].x}
            y={H - 14}
            textAnchor={
              index === 0 ? "start" : index === ordered.length - 1 ? "end" : "middle"
            }
            fontSize={10}
            fill="#8b8275"
          >
            {sameDay
              ? new Intl.DateTimeFormat("zh-CN", {
                  timeZone: "Asia/Shanghai",
                  hour: "2-digit",
                  minute: "2-digit",
                  hour12: false,
                }).format(new Date(points[index].entry.createdAt))
              : formatMonthDay(points[index].entry.createdAt)}
          </text>
        ))}
      </svg>

      {activePoint ? (
        <div
          className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-full"
          style={{
            left: `${(activePoint.x / W) * 100}%`,
            top: `${(activePoint.y / H) * 100}%`,
          }}
        >
          <div className="mb-2 w-max max-w-[190px] rounded-xl bg-ink px-3 py-2 text-paper-2 shadow-xl">
            <p className="text-[10px] text-paper-2/60">
              {formatDate(activePoint.entry.createdAt)}
            </p>
            <p className="mt-1 text-[12px] font-semibold">
              {activePoint.entry.scopeName} · {formatNumber(activePoint.entry.score)} 词
            </p>
            <p className="mt-0.5 text-[10px] text-paper-2/65">
              覆盖 {formatPercent(activePoint.entry.coverage, 1)}
            </p>
          </div>
        </div>
      ) : null}

      {ordered.length === 1 ? (
        <p className="mt-1 text-center text-[11px] text-ink-soft">
          再测一次，就能看到曲线了。
        </p>
      ) : null}
    </div>
  );
}
