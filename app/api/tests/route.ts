import { NextResponse } from "next/server";

import { getScope, normalizeLength } from "@/lib/books";
import { startTest } from "@/lib/engine";
import { errorResponse } from "@/lib/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "请求格式不正确" }, { status: 400 });
  }

  const record = (body ?? {}) as Record<string, unknown>;
  const scope = typeof record.scope === "string" ? getScope(record.scope) : null;
  const length = normalizeLength(record.length);

  if (!scope) {
    return NextResponse.json({ error: "请选择一个有效的测试范围" }, { status: 400 });
  }
  if (!length) {
    return NextResponse.json({ error: "题量必须是 20、30 或 50" }, { status: 400 });
  }

  try {
    const payload = startTest(scope.slug, length);
    return NextResponse.json(payload, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}
