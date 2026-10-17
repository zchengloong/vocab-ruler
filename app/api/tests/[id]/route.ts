import { NextResponse } from "next/server";

import { getTestResult, removeTest } from "@/lib/engine";
import { errorResponse } from "@/lib/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const result = getTestResult(id);
  if (!result) {
    return NextResponse.json({ error: "结果不存在或已过期" }, { status: 404 });
  }
  return NextResponse.json(result, {
    headers: { "cache-control": "no-store" },
  });
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  try {
    removeTest(id);
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return errorResponse(error);
  }
}
