import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { ResultView } from "@/components/result-view";
import { getTestResult } from "@/lib/engine";
import { formatNumber } from "@/lib/format";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const result = getTestResult(id);
  if (!result) return { title: "结果未找到" };
  return {
    title: `${formatNumber(result.score)} 词 · ${result.scopeName}`,
    description: `${result.scopeName}词汇量测试结果：约 ${formatNumber(result.score)} 词（90% 置信区间 ${formatNumber(result.ciLow)}–${formatNumber(result.ciHigh)}）。`,
  };
}

export default async function ResultPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const result = getTestResult(id);
  if (!result) notFound();
  return <ResultView result={result} />;
}
