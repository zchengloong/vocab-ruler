import { NextResponse } from "next/server";

import { EngineError } from "@/lib/engine";

export function errorResponse(error: unknown): NextResponse {
  if (error instanceof EngineError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }

  console.error("[api]", error);
  return NextResponse.json(
    { error: "服务器出了点问题，请稍后再试" },
    { status: 500 },
  );
}
