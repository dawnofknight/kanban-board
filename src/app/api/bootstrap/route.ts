import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth-server";
import { getDb } from "@/lib/db";
import { loadStateForUser } from "@/lib/server-state";

export async function GET() {
  const db = getDb();
  const user = await getSessionUser(db);
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  const state = await loadStateForUser(db, user);
  return NextResponse.json(state);
}
