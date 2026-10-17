"use client";

import { useEffect, useRef, useState } from "react";

import { Modal } from "@/components/modal";
import { Check, Download, Share } from "@/components/icons";
import { formatDate, formatDuration, formatNumber } from "@/lib/format";
import type { TestResult } from "@/lib/types";

const W = 1080;
const H = 1350;

function roundRect(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
) {
  const r = Math.min(radius, width / 2, height / 2);
  context.beginPath();
  context.moveTo(x + r, y);
  context.arcTo(x + width, y, x + width, y + height, r);
  context.arcTo(x + width, y + height, x, y + height, r);
  context.arcTo(x, y + height, x, y, r);
  context.arcTo(x, y, x + width, y, r);
  context.closePath();
}

function pill(
  context: CanvasRenderingContext2D,
  text: string,
  centerX: number,
  y: number,
  font: string,
  background: string,
  color: string,
) {
  context.font = font;
  const width = context.measureText(text).width + 56;
  const height = 58;
  roundRect(context, centerX - width / 2, y, width, height, 29);
  context.fillStyle = background;
  context.fill();
  context.fillStyle = color;
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillText(text, centerX, y + height / 2 + 1);
  context.textBaseline = "alphabetic";
}

function drawCard(canvas: HTMLCanvasElement, result: TestResult) {
  const context = canvas.getContext("2d");
  if (!context) return;

  context.clearRect(0, 0, W, H);
  context.fillStyle = "#f3eee3";
  context.fillRect(0, 0, W, H);

  const glow = context.createRadialGradient(950, 90, 30, 950, 90, 780);
  glow.addColorStop(0, "rgba(13, 107, 79, 0.15)");
  glow.addColorStop(1, "rgba(13, 107, 79, 0)");
  context.fillStyle = glow;
  context.fillRect(0, 0, W, H);

  context.strokeStyle = "rgba(13, 107, 79, 0.16)";
  context.lineWidth = 2;
  roundRect(context, 54, 54, W - 108, H - 108, 40);
  context.stroke();

  // Decorative ruler ticks along both edges.
  context.strokeStyle = "rgba(24, 21, 17, 0.14)";
  context.lineWidth = 1;
  for (let i = 0; i < 34; i += 1) {
    const y = 270 + i * 21;
    const length = i % 5 === 0 ? 18 : 9;
    context.beginPath();
    context.moveTo(92, y);
    context.lineTo(92 + length, y);
    context.moveTo(W - 92, y);
    context.lineTo(W - 92 - length, y);
    context.stroke();
  }

  // Brand mark.
  context.fillStyle = "#181511";
  roundRect(context, 96, 98, 68, 68, 19);
  context.fill();
  context.strokeStyle = "#fbf8f1";
  context.lineWidth = 4;
  context.lineCap = "round";
  for (const [offset, height] of [
    [18, 18],
    [29, 26],
    [40, 15],
    [51, 21],
  ] as const) {
    context.beginPath();
    context.moveTo(96 + offset, 114);
    context.lineTo(96 + offset, 114 + height);
    context.stroke();
  }
  context.beginPath();
  context.moveTo(112, 146);
  context.lineTo(146, 146);
  context.stroke();
  context.fillStyle = "#e7a58f";
  context.beginPath();
  context.arc(148, 146, 4, 0, Math.PI * 2);
  context.fill();

  context.textAlign = "left";
  context.fillStyle = "#181511";
  context.font =
    '600 31px "PingFang SC", "Microsoft YaHei", "Noto Sans CJK SC", sans-serif';
  context.fillText("词尺", 184, 132);
  context.fillStyle = "#6d6559";
  context.font =
    '600 12px "Inter", "PingFang SC", "Microsoft YaHei", sans-serif';
  context.fillText("V O C A B   R U L E R", 184, 156);

  context.textAlign = "right";
  context.fillStyle = "#6d6559";
  context.font = '600 14px "Inter", sans-serif';
  context.fillText("VOCABULARY REPORT", 982, 122);
  context.font = '400 19px "Inter", sans-serif';
  context.fillText(formatDate(result.createdAt), 982, 153);

  context.strokeStyle = "rgba(222, 212, 193, 0.9)";
  context.lineWidth = 1.5;
  context.beginPath();
  context.moveTo(96, 204);
  context.lineTo(984, 204);
  context.stroke();

  // Heading.
  context.textAlign = "center";
  context.fillStyle = "#0d6b4f";
  context.font =
    '700 17px "Inter", "PingFang SC", "Microsoft YaHei", sans-serif';
  context.fillText(
    result.mode === "all" ? "Y O U R   V O C A B U L A R Y" : "B O O K   M A S T E R Y",
    540,
    286,
  );

  context.fillStyle = "#6d6559";
  context.font =
    '500 30px "PingFang SC", "Microsoft YaHei", "Noto Sans CJK SC", sans-serif';
  context.fillText(
    result.mode === "all" ? "综合词汇量" : `${result.scopeName} 掌握量`,
    540,
    338,
  );

  const scoreText = formatNumber(result.score);
  context.fillStyle = "#181511";
  context.font = `500 ${scoreText.length >= 6 ? 186 : 214}px Georgia, "Times New Roman", serif`;
  context.fillText(scoreText, 540, 548);

  const numberWidth = context.measureText(scoreText).width;
  context.strokeStyle = "rgba(181, 74, 49, 0.65)";
  context.lineWidth = 3;
  context.lineCap = "round";
  context.beginPath();
  context.moveTo(540 - numberWidth / 2 + 16, 584);
  context.quadraticCurveTo(540, 594, 540 + numberWidth / 2 - 16, 586);
  context.stroke();

  context.fillStyle = "#6d6559";
  context.font =
    '400 25px "PingFang SC", "Microsoft YaHei", "Noto Sans CJK SC", sans-serif';
  context.fillText(
    result.mode === "all"
      ? `词 · 90% 置信区间 ${formatNumber(result.ciLow)} – ${formatNumber(result.ciHigh)}`
      : `词 · ${formatNumber(result.poolSize)} 词中掌握 ${(result.coverage * 100).toFixed(0)}%`,
    540,
    632,
  );

  pill(
    context,
    result.level,
    540,
    672,
    '600 22px "PingFang SC", "Microsoft YaHei", sans-serif',
    "#181511",
    "#fbf8f1",
  );

  // Main ruler / coverage bar.
  const left = 120;
  const right = 960;
  const barY = 862;
  const ratio =
    result.mode === "all"
      ? Math.min(1, result.score / 12000)
      : Math.min(1, result.coverage);
  const markerX = left + ratio * (right - left);

  context.fillStyle = "rgba(13, 107, 79, 0.1)";
  roundRect(context, left, barY, right - left, 16, 8);
  context.fill();
  context.fillStyle = "#0d6b4f";
  roundRect(context, left, barY, Math.max(14, markerX - left), 16, 8);
  context.fill();
  context.beginPath();
  context.arc(markerX, barY + 8, 9, 0, Math.PI * 2);
  context.fillStyle = "#0d6b4f";
  context.fill();
  context.strokeStyle = "#fbf8f1";
  context.lineWidth = 4;
  context.stroke();

  context.fillStyle = "#8b8275";
  context.font = '400 18px "Inter", sans-serif';
  context.textAlign = "left";
  context.fillText("0", left, barY + 52);
  context.textAlign = "right";
  context.fillText(result.mode === "all" ? "12,000 词" : "100%", right, barY + 52);

  if (result.mode === "all") {
    context.textAlign = "center";
    for (const [value, label] of [
      [3000, "高考"],
      [4500, "四级"],
      [6000, "六级"],
      [8500, "托福"],
      [11000, "GRE"],
    ] as const) {
      const x = left + (value / 12000) * (right - left);
      context.strokeStyle = "rgba(24, 21, 17, 0.24)";
      context.lineWidth = 1.5;
      context.beginPath();
      context.moveTo(x, barY - 9);
      context.lineTo(x, barY - 1);
      context.stroke();
      context.fillStyle = "#8b8275";
      context.font = '400 15px "PingFang SC", "Microsoft YaHei", sans-serif';
      context.fillText(label, x, barY - 20);
    }
  }

  // Stats.
  context.strokeStyle = "rgba(222, 212, 193, 0.9)";
  context.beginPath();
  context.moveTo(96, 1018);
  context.lineTo(984, 1018);
  context.stroke();

  const accuracy = result.answered
    ? `${result.correctCount}/${result.answered}`
    : "—";
  const stats = [
    ["正确率", accuracy],
    ["用时", formatDuration(result.durationSec)],
    ["测试范围", result.scopeShort],
  ] as const;

  stats.forEach(([label, value], index) => {
    const centerX = 240 + index * 300;
    context.textAlign = "center";
    context.fillStyle = "#181511";
    context.font =
      '500 38px "PingFang SC", "Microsoft YaHei", "Noto Sans CJK SC", sans-serif';
    context.fillText(value, centerX, 1088);
    context.fillStyle = "#8b8275";
    context.font = '400 18px "PingFang SC", "Microsoft YaHei", sans-serif';
    context.fillText(label, centerX, 1122);
  });

  context.strokeStyle = "rgba(222, 212, 193, 0.9)";
  context.beginPath();
  context.moveTo(96, 1180);
  context.lineTo(984, 1180);
  context.stroke();

  context.textAlign = "center";
  context.fillStyle = "#6d6559";
  context.font =
    '400 17px "PingFang SC", "Microsoft YaHei", "Noto Sans CJK SC", sans-serif';
  context.fillText(
    `${result.length} 道自适应四选一 · 词频 IRT 模型 · 词汇量是统计估计，不是考试分数`,
    540,
    1228,
  );
  context.fillStyle = "#8b8275";
  context.font = '400 15px "Inter", "PingFang SC", "Microsoft YaHei", sans-serif';
  context.fillText("词库来源 ECDICT · MIT License · 词尺 VOCAB RULER", 540, 1262);
}

function cardText(result: TestResult): string {
  return [
    `我的英语词汇量约 ${formatNumber(result.score)} 词（90% 置信区间 ${formatNumber(result.ciLow)}–${formatNumber(result.ciHigh)}）。`,
    `用的是「词尺」：${result.length} 道自适应四选一，词库 ${formatNumber(result.poolSize)} 词。`,
    `等级参考：${result.level}。`,
  ].join("\n");
}

export function ShareCardDialog({
  open,
  onClose,
  result,
}: {
  open: boolean;
  onClose: () => void;
  result: TestResult;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!open) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    let cancelled = false;
    const draw = () => {
      if (!cancelled) drawCard(canvas, result);
    };
    draw();
    if (document.fonts?.ready) {
      void document.fonts.ready.then(draw);
    }
    return () => {
      cancelled = true;
    };
  }, [open, result]);

  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(false), 1800);
    return () => clearTimeout(timer);
  }, [copied]);

  function download() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `词尺-${result.scopeShort}-${result.score}.png`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 2000);
    }, "image/png");
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(cardText(result));
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="分享这次测量" wide>
      <div className="grid gap-6 sm:grid-cols-[minmax(0,1fr)_216px]">
        <div>
          <canvas
            ref={canvasRef}
            width={W}
            height={H}
            className="h-auto w-full rounded-2xl border border-line/80 shadow-sm"
            aria-label="词汇量测试成绩分享卡片预览"
          />
          <p className="mt-3 text-[11px] leading-5 text-ink-soft">
            1080 × 1350 PNG，适合发在朋友圈或聊天里。卡片只包含分数与范围，不含你的作答明细。
          </p>
        </div>
        <div className="flex flex-col gap-3">
          <button type="button" onClick={download} className="btn btn-primary w-full">
            <Download className="h-4 w-4" />
            下载 PNG
          </button>
          <button type="button" onClick={() => void copy()} className="btn btn-outline w-full">
            {copied ? <Check className="h-4 w-4 text-green" /> : <Share className="h-4 w-4" />}
            {copied ? "已复制文案" : "复制分享文案"}
          </button>
          <div className="mt-2 rounded-xl border border-line/70 bg-white/30 p-3 text-[11px] leading-5 text-ink-soft">
            <p className="font-semibold text-ink">这次测试</p>
            <p className="mt-1">{result.scopeName}</p>
            <p>{result.length} 题 · {formatDuration(result.durationSec)}</p>
            <p>正确 {result.correctCount} / {result.answered}</p>
          </div>
          <p className="mt-auto text-[10px] leading-4 text-ink-soft/75">
            词汇量是统计估计，置信区间表示 90% 概率真实值落在其中。
          </p>
        </div>
      </div>
    </Modal>
  );
}
