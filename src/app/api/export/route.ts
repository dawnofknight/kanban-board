import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth-server";
import { getDb } from "@/lib/db";
import { loadStateForUser } from "@/lib/server-state";
import type { ExportBundle } from "@/lib/types";

/** GET /api/export?boardId=... → one board bundle (must be visible to you)
 *  GET /api/export?scope=all → every board you can see */
export async function GET(req: NextRequest) {
  const db = getDb();
  const user = await getSessionUser(db);
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const state = await loadStateForUser(db, user);
  const boardId = new URL(req.url).searchParams.get("boardId");

  let boards = state.boards;
  if (boardId) {
    boards = boards.filter((b) => b.id === boardId);
    if (boards.length === 0) return NextResponse.json({ error: "Board not found" }, { status: 404 });
  }
  const ids = new Set(boards.map((b) => b.id));
  const lists = state.lists.filter((l) => ids.has(l.boardId));
  const listIds = new Set(lists.map((l) => l.id));
  const cards = state.cards.filter((c) => ids.has(c.boardId));
  const cardIds = new Set(cards.map((c) => c.id));

  const bundle: ExportBundle = {
    kind: "taskboard-export",
    version: 1,
    exportedAt: new Date().toISOString(),
    exportedBy: user.email,
    users: state.users,
    boards,
    lists: lists.filter((l) => listIds.has(l.id)),
    cards,
    checklist: state.checklist.filter((ch) => cardIds.has(ch.cardId)),
    comments: state.comments.filter((c) => cardIds.has(c.cardId)),
    timeLogs: state.timeLogs.filter((t) => cardIds.has(t.cardId)),
    activities: state.activities.filter((a) => ids.has(a.boardId)),
  };
  return NextResponse.json(bundle);
}
