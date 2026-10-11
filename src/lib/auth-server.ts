import { cookies } from "next/headers";
import { and, eq } from "drizzle-orm";
import { boardMembers, sessions, users } from "../../db/schema";
import type { Db } from "./db";
import type { Role } from "./types";

export const SESSION_COOKIE = "kb_session";
export const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;

export interface SafeUser {
  id: string;
  name: string;
  email: string;
  role: Role;
  avatarColor: string;
}

function toSafe(u: typeof users.$inferSelect): SafeUser {
  return { id: u.id, name: u.name, email: u.email, role: u.role as Role, avatarColor: u.avatarColor };
}

export async function getSessionUser(db: Db): Promise<SafeUser | null> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const rows = await db
    .select({ session: sessions, user: users })
    .from(sessions)
    .innerJoin(users, eq(sessions.userId, users.id))
    .where(eq(sessions.id, token))
    .limit(1);
  if (rows.length === 0) return null;
  const { session, user } = rows[0];
  if (session.expiresAt < Date.now()) {
    await db.delete(sessions).where(eq(sessions.id, token));
    return null;
  }
  return toSafe(user);
}

export async function createSession(db: Db, userId: string): Promise<string> {
  const id = crypto.randomUUID();
  await db.insert(sessions).values({ id, userId, expiresAt: Date.now() + SESSION_TTL_MS });
  return id;
}

export async function destroySession(db: Db, token: string): Promise<void> {
  await db.delete(sessions).where(eq(sessions.id, token));
}

export async function setSessionCookie(token: string, secure: boolean): Promise<void> {
  const store = await cookies();
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    secure,
    maxAge: SESSION_TTL_MS / 1000,
  });
}

export async function clearSessionCookie(): Promise<void> {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
}

/** Non-admins must be a member or client of the board. */
export async function canAccessBoard(db: Db, user: SafeUser, boardId: string): Promise<boolean> {
  if (user.role === "admin") return true;
  const rows = await db
    .select()
    .from(boardMembers)
    .where(and(eq(boardMembers.boardId, boardId), eq(boardMembers.userId, user.id)))
    .limit(1);
  return rows.length > 0;
}

/** Look up which board a card belongs to (for access checks). */
export async function boardIdForCard(db: Db, cardId: string): Promise<string | null> {
  const { cards } = await import("../../db/schema");
  const rows = await db.select({ boardId: cards.boardId }).from(cards).where(eq(cards.id, cardId)).limit(1);
  return rows[0]?.boardId ?? null;
}

/** Look up which board a list belongs to (for access checks). */
export async function boardIdForList(db: Db, listId: string): Promise<string | null> {
  const { lists } = await import("../../db/schema");
  const rows = await db.select({ boardId: lists.boardId }).from(lists).where(eq(lists.id, listId)).limit(1);
  return rows[0]?.boardId ?? null;
}
