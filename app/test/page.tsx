import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { TestRunner } from "@/components/test-runner";
import { getScope, normalizeLength } from "@/lib/books";
import type { ScopeSlug } from "@/lib/books";

export const metadata: Metadata = {
  title: "词汇量测试",
  description: "自适应英语词汇量测试，四选一作答，实时调整难度。",
};

export const dynamic = "force-dynamic";

export default async function TestPage({
  searchParams,
}: {
  searchParams: Promise<{ scope?: string; length?: string }>;
}) {
  const params = await searchParams;
  const scope = getScope(params.scope ?? "all");
  const length = normalizeLength(params.length ?? 30);

  if (!scope || !length) notFound();

  return (
    <TestRunner scope={scope.slug as ScopeSlug} length={length} />
  );
}
