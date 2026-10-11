import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import {
  activities,
  boardMembers,
  boards,
  cardLabels,
  cardMembers,
  cards,
  checklistItems,
  comments,
  lists,
  timeLogs,
  users,
} from "../../../../db/schema";
import { getSessionUser } from "@/lib/auth-server";
import { getDb } from "@/lib/db";
import type { ExportBundle, LabelColor } from "@/lib/types";

const MAX_BOARDS = 50;
const MAX_CARDS = 5000;
const LABELS = new Set(["red", "orange", "yellow", "green", "blue", "purple"]);

const str = (v: unknown, fallback = ""): string => (typeof v === "string" ? v : fallback);
const bit = (v: unknown): number => (v ? 1 : 0);
const iso = (v: unknown): string => {
  if (typeof v === "string" && !Number.isNaN(Date.parse(v))) return v;
  return new Date().toISOString();
};

/** POST /api/import {bundle} → inserts everything under fresh IDs. Members-only. */
export async function POST(req: NextRequest) {
  const db = getDb();
  const user = await getSessionUser(db);
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  if (user.role === "client") return NextResponse.json({ error: "Clients cannot import" }, { status: 403 });

  let body: Partial<ExportBundle>;
  try {
    body = (await req.json()) as Partial<ExportBundle>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  if (body?.kind !== "taskboard-export" || body?.version !== 1 || !Array.isArray(body.boards)) {
    return NextResponse.json({ error: "Not a TaskBoard export file" }, { status: 400 });
  }
  const inBoards = body.boards;
  const inCards = Array.isArray(body.cards) ? body.cards : [];
  if (inBoards.length === 0) return NextResponse.json({ error: "Export contains no boards" }, { status: 400 });
  if (inBoards.length > MAX_BOARDS || inCards.length > MAX_CARDS) {
    return NextResponse.json({ error: "Import too large (max 50 boards / 5000 cards)" }, { status: 400 });
  }

  const existingUserIds = new Set((await db.select({ id: users.id }).from(users)).map((u) => u.id));
  const mapUser = (id: unknown): string =>
    typeof id === "string" && existingUserIds.has(id) ? id : user.id;

  const boardId = new Map<string, string>();
  const listId = new Map<string, string>();
  const cardId = new Map<string, string>();
  const rid = () => crypto.randomUUID();

  let cardCount = 0;
  for (const b of inBoards) {
    if (!b || typeof b.id !== "string") return NextResponse.json({ error: "Corrupt board entry" }, { status: 400 });
    const nid = rid();
    boardId.set(b.id, nid);
    const memberIds = [...new Set((b.memberIds ?? []).filter((m) => typeof m === "string" && existingUserIds.has(m as string)) as string[])];
    const clientIds = [...new Set((b.clientIds ?? []).filter((m) => typeof m === "string" && existingUserIds.has(m as string)) as string[])];
    if (user.role !== "admin" && !memberIds.includes(user.id)) memberIds.push(user.id);
    await db.insert(boards).values({
      id: nid,
      title: str(b.title, "Imported board").slice(0, 200),
      description: str(b.description).slice(0, 2000),
      background: str(b.background, "from-blue-600 to-indigo-700").slice(0, 100),
      favorite: 0,
      archived: 0,
      createdAt: iso(b.createdAt),
      updatedAt: new Date().toISOString(),
    });
    for (const m of memberIds) await db.insert(boardMembers).values({ boardId: nid, userId: m, kind: "member" });
    for (const m of clientIds) await db.insert(boardMembers).values({ boardId: nid, userId: m, kind: "client" });
  }

  for (const l of body.lists ?? []) {
    if (!l || typeof l.id !== "string" || typeof l.boardId !== "string" || !boardId.has(l.boardId)) continue;
    const nid = rid();
    listId.set(l.id, nid);
    await db.insert(lists).values({
      id: nid,
      boardId: boardId.get(l.boardId)!,
      title: str(l.title, "New list").slice(0, 200),
      position: Number.isInteger(l.order) ? l.order : 0,
    });
  }

  for (const c of inCards) {
    if (!c || typeof c.id !== "string" || typeof c.boardId !== "string" || !boardId.has(c.boardId)) continue;
    const nid = rid();
    cardId.set(c.id, nid);
    cardCount++;
    const targetList = typeof c.listId === "string" && listId.has(c.listId) ? listId.get(c.listId)! : undefined;
    // fall back to first list of the board if the card's list wasn't imported
    let listRowId = targetList;
    if (!listRowId) {
      const first = await db.select({ id: lists.id }).from(lists).where(eq(lists.boardId, boardId.get(c.boardId)!)).limit(1);
      if (!first[0]) continue;
      listRowId = first[0].id;
    }
    await db.insert(cards).values({
      id: nid,
      boardId: boardId.get(c.boardId)!,
      listId: listRowId,
      title: str(c.title, "Imported task").slice(0, 300),
      description: str(c.description).slice(0, 8000),
      position: Number.isInteger(c.order) ? c.order : 0,
      dueDate: typeof c.dueDate === "string" ? c.dueDate : null,
      completed: bit(c.completed),
      archived: 0,
      createdAt: iso(c.createdAt),
      updatedAt: new Date().toISOString(),
    });
    for (const l of c.labelIds ?? []) {
      if (typeof l === "string" && LABELS.has(l)) {
        await db.insert(cardLabels).values({ cardId: nid, label: l as LabelColor });
      }
    }
    for (const m of c.memberIds ?? []) {
      if (typeof m === "string" && existingUserIds.has(m)) {
        await db.insert(cardMembers).values({ cardId: nid, userId: m });
      }
    }
  }

  for (const ch of body.checklist ?? []) {
    if (!ch || typeof ch.id !== "string" || typeof ch.cardId !== "string" || !cardId.has(ch.cardId)) continue;
    await db.insert(checklistItems).values({ id: rid(), cardId: cardId.get(ch.cardId)!, text: str(ch.text).slice(0, 500), done: bit(ch.done) });
  }
  for (const cm of body.comments ?? []) {
    if (!cm || typeof cm.cardId !== "string" || !cardId.has(cm.cardId)) continue;
    await db.insert(comments).values({
      id: rid(),
      cardId: cardId.get(cm.cardId)!,
      userId: mapUser(cm.userId),
      text: str(cm.text).slice(0, 4000),
      createdAt: iso(cm.createdAt),
    });
  }
  for (const t of body.timeLogs ?? []) {
    if (!t || typeof t.cardId !== "string" || !cardId.has(t.cardId)) continue;
    const hours = typeof t.hours === "number" && t.hours > 0 && t.hours < 10000 ? t.hours : 0;
    await db.insert(timeLogs).values({
      id: rid(),
      cardId: cardId.get(t.cardId)!,
      userId: mapUser(t.userId),
      hours,
      note: str(t.note).slice(0, 500),
      date: str(t.date, new Date().toISOString().slice(0, 10)).slice(0, 10),
      createdAt: iso(t.createdAt),
    });
  }
  for (const a of body.activities ?? []) {
    if (!a || typeof a.boardId !== "string" || !boardId.has(a.boardId)) continue;
    await db.insert(activities).values({
      id: rid(),
      boardId: boardId.get(a.boardId)!,
      cardId: typeof a.cardId === "string" && cardId.has(a.cardId) ? cardId.get(a.cardId)! : null,
      userId: mapUser(a.userId),
      text: str(a.text).slice(0, 500),
      createdAt: iso(a.createdAt),
    });
  }

  return NextResponse.json({ ok: true, boards: inBoards.length, cards: cardCount });
}
