import { formatNumber } from "@/lib/format";

const WIDTH = 800;
const HEIGHT = 150;
const PAD = 36;
const MAX = 12000;

function position(value: number, max = MAX): number {
  const ratio = Math.min(1, Math.max(0, value / max));
  return PAD + ratio * (WIDTH - PAD * 2);
}

export function ScoreRuler({
  score,
  ciLow,
  ciHigh,
  max = MAX,
}: {
  score: number;
  ciLow: number;
  ciHigh: number;
  max?: number;
}) {
  const xScore = position(score, max);
  const xLow = position(ciLow, max);
  const xHigh = position(ciHigh, max);
  const bubbleWidth = 112;
  const bubbleX = Math.min(
    Math.max(xScore - bubbleWidth / 2, PAD - 8),
    WIDTH - PAD - bubbleWidth + 8,
  );
  const ticks = [0, 2000, 4000, 6000, 8000, 10000, 12000].filter(
    (tick) => tick <= max,
  );

  return (
    <svg
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      className="w-full"
      role="img"
      aria-label={`词汇量约 ${formatNumber(score)} 词，90% 置信区间 ${formatNumber(ciLow)} 到 ${formatNumber(ciHigh)} 词`}
    >
      <defs>
        <linearGradient id="ruler-progress" gradientUnits="userSpaceOnUse" x1={PAD} y1="0" x2={WIDTH - PAD} y2="0">
          <stop offset="0%" stopColor="#0d6b4f" stopOpacity="0.55" />
          <stop offset="100%" stopColor="#0d6b4f" />
        </linearGradient>
      </defs>

      <rect
        x={xLow}
        y={76}
        width={Math.max(3, xHigh - xLow)}
        height={18}
        rx={9}
        fill="#0d6b4f"
        opacity={0.13}
      />

      <line
        x1={PAD}
        y1={85}
        x2={WIDTH - PAD}
        y2={85}
        stroke="#ded4c1"
        strokeWidth={2}
        strokeLinecap="round"
      />
      <line
        x1={PAD}
        y1={85}
        x2={xScore}
        y2={85}
        stroke="url(#ruler-progress)"
        strokeWidth={3}
        strokeLinecap="round"
      />

      {ticks.map((tick) => (
        <g key={tick}>
          <line
            x1={position(tick, max)}
            y1={78}
            x2={position(tick, max)}
            y2={92}
            stroke="#c9bea9"
            strokeWidth={1.2}
          />
          <text
            x={position(tick, max)}
            y={116}
            textAnchor="middle"
            fontSize={11}
            fill="#8b8275"
          >
            {tick === 0 ? "0" : `${tick / 1000}k`}
          </text>
        </g>
      ))}

      <circle cx={xScore} cy={85} r={7} fill="#0d6b4f" stroke="#fbf8f1" strokeWidth={3} />

      <rect
        x={bubbleX}
        y={18}
        width={bubbleWidth}
        height={36}
        rx={18}
        fill="#181511"
      />
      <path
        d={`M${bubbleX + bubbleWidth / 2 - 5} 53 L${bubbleX + bubbleWidth / 2} 60 L${bubbleX + bubbleWidth / 2 + 5} 53 Z`}
        fill="#181511"
      />
      <text
        x={bubbleX + bubbleWidth / 2}
        y={41.5}
        textAnchor="middle"
        fontSize={15}
        fontWeight={700}
        fill="#fbf8f1"
      >
        {formatNumber(score)}
      </text>
      <text x={WIDTH - PAD} y={48} textAnchor="end" fontSize={11} fill="#8b8275">
        词
      </text>
    </svg>
  );
}
