import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth-server";
import { getDb } from "@/lib/db";
import { ApiError, applyOp } from "@/lib/server-state";
import type { MutateOp } from "@/lib/types";

export async function POST(req: NextRequest) {
  const db = getDb();
  const user = await getSessionUser(db);
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  let op: MutateOp;
  try {
    op = (await req.json()) as MutateOp;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  if (!op || typeof op.op !== "string") return NextResponse.json({ error: "Invalid op" }, { status: 400 });
  try {
    await applyOp(db, user, op);
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof ApiError) return NextResponse.json({ error: e.message }, { status: e.status });
    console.error("mutate failed", op.op, e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
