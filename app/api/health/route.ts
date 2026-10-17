import { NextResponse } from "next/server";

import { getBooksWithSizes } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const books = getBooksWithSizes();
    return NextResponse.json({
      ok: true,
      books,
      totalWords: books[0]?.size ?? 0,
    });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "unknown" },
      { status: 500 },
    );
  }
}
