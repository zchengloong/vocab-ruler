import { NextResponse } from "next/server";

import { answerTest } from "@/lib/engine";
import { errorResponse } from "@/lib/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "请求格式不正确" }, { status: 400 });
  }

  const record = (body ?? {}) as Record<string, unknown>;
  const wordId = typeof record.wordId === "number" ? record.wordId : Number.NaN;
  if (!Number.isInteger(wordId) || wordId <= 0) {
    return NextResponse.json({ error: "题目编号不合法" }, { status: 400 });
  }

  if (!("choice" in record)) {
    return NextResponse.json({ error: "缺少作答选项" }, { status: 400 });
  }

  const choice = record.choice;
  if (choice !== null && (typeof choice !== "number" || !Number.isInteger(choice))) {
    return NextResponse.json({ error: "选项不合法" }, { status: 400 });
  }

  try {
    const payload = answerTest(id, wordId, choice as number | null);
    return NextResponse.json(payload);
  } catch (error) {
    return errorResponse(error);
  }
}
