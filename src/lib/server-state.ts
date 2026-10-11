import { eq, inArray } from "drizzle-orm";
import { hashSync } from "bcryptjs";
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
  sessions,
  timeLogs,
  users,
} from "../../db/schema";
import { canAccessBoard } from "./auth-server";
import type { SafeUser } from "./auth-server";
import type { Db } from "./db";
import {
  seedActivity,
  seedBoards,
  seedCards,
  seedChecklist,
  seedComments,
  seedLists,
  seedTimeLogs,
} from "./seed";
import type {
  Activity,
  Board,
  Card,
  CardOrderUpdate,
  ChecklistItem,
  Comment,
  LabelColor,
  List,
  ListOrderUpdate,
  MutateOp,
  TimeLog,
} from "./types";

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

const bit = (v: boolean) => (v ? 1 : 0);

/* ---------- row → client mappers ---------- */

function toBoard(
  b: typeof boards.$inferSelect,
  members: { userId: string; kind: string }[]
): Board {
  return {
    id: b.id,
    title: b.title,
    description: b.description,
    background: b.background,
    memberIds: members.filter((m) => m.kind === "member").map((m) => m.userId),
    clientIds: members.filter((m) => m.kind === "client").map((m) => m.userId),
    favorite: b.favorite === 1,
    archived: b.archived === 1,
    createdAt: b.createdAt,
    updatedAt: b.updatedAt,
  };
}

function toCard(
  c: typeof cards.$inferSelect,
  labels: string[],
  memberIds: string[]
): Card {
  return {
    id: c.id,
    boardId: c.boardId,
    listId: c.listId,
    title: c.title,
    description: c.description,
    order: c.position,
    labelIds: labels as LabelColor[],
    memberIds,
    dueDate: c.dueDate,
    completed: c.completed === 1,
    archived: c.archived === 1,
    createdAt: c.createdAt,
    updatedAt: c.updatedAt,
  };
}

/* ---------- bootstrap ---------- */

export interface BootstrapState {
  user: SafeUser;
  users: SafeUser[];
  boards: Board[];
  lists: List[];
  cards: Card[];
  checklist: ChecklistItem[];
  comments: Comment[];
  timeLogs: TimeLog[];
  activities: Activity[];
}

export async function loadStateForUser(db: Db, user: SafeUser): Promise<BootstrapState> {
  const allUsers = (await db.select().from(users)).map((u) => ({
    id: u.id,
    name: u.name,
    email: u.email,
    role: u.role as SafeUser["role"],
    avatarColor: u.avatarColor,
  }));

  let visibleBoardIds: string[];
  if (user.role === "admin") {
    visibleBoardIds = (await db.select({ id: boards.id }).from(boards)).map((b) => b.id);
  } else {
    visibleBoardIds = (
      await db.select({ boardId: boardMembers.boardId }).from(boardMembers).where(eq(boardMembers.userId, user.id))
    ).map((r) => r.boardId);
  }

  if (visibleBoardIds.length === 0) {
    return { user, users: allUsers, boards: [], lists: [], cards: [], checklist: [], comments: [], timeLogs: [], activities: [] };
  }

  const boardRows = await db.select().from(boards).where(inArray(boards.id, visibleBoardIds));
  const memberRows = await db.select().from(boardMembers).where(inArray(boardMembers.boardId, visibleBoardIds));
  const listRows = (await db.select().from(lists).where(inArray(lists.boardId, visibleBoardIds))).map((l) => ({
    id: l.id,
    boardId: l.boardId,
    title: l.title,
    order: l.position,
  }));
  const cardRows = await db.select().from(cards).where(inArray(cards.boardId, visibleBoardIds));
  const cardIds = cardRows.map((c) => c.id);

  const labelRows = cardIds.length ? await db.select().from(cardLabels).where(inArray(cardLabels.cardId, cardIds)) : [];
  const memberRows2 = cardIds.length ? await db.select().from(cardMembers).where(inArray(cardMembers.cardId, cardIds)) : [];
  const checklistRows: ChecklistItem[] = cardIds.length
    ? (await db.select().from(checklistItems).where(inArray(checklistItems.cardId, cardIds))).map((ch) => ({
        id: ch.id,
        cardId: ch.cardId,
        text: ch.text,
        done: ch.done === 1,
      }))
    : [];
  const commentRows: Comment[] = cardIds.length
    ? (await db.select().from(comments).where(inArray(comments.cardId, cardIds))).map((c) => ({
        id: c.id,
        cardId: c.cardId,
        userId: c.userId,
        text: c.text,
        createdAt: c.createdAt,
      }))
    : [];
  const timeLogRows: TimeLog[] = cardIds.length
    ? (await db.select().from(timeLogs).where(inArray(timeLogs.cardId, cardIds))).map((t) => ({
        id: t.id,
        cardId: t.cardId,
        userId: t.userId,
        hours: t.hours,
        note: t.note,
        date: t.date,
        createdAt: t.createdAt,
      }))
    : [];
  const activityRows: Activity[] = (
    await db.select().from(activities).where(inArray(activities.boardId, visibleBoardIds))
  ).map((a) => ({
    id: a.id,
    boardId: a.boardId,
    cardId: a.cardId,
    userId: a.userId,
    text: a.text,
    createdAt: a.createdAt,
  }));

  return {
    user,
    users: allUsers,
    boards: boardRows.map((b) =>
      toBoard(b, memberRows.filter((m) => m.boardId === b.id).map((m) => ({ userId: m.userId, kind: m.kind })))
    ),
    lists: listRows,
    cards: cardRows.map((c) =>
      toCard(
        c,
        labelRows.filter((l) => l.cardId === c.id).map((l) => l.label),
        memberRows2.filter((m) => m.cardId === c.id).map((m) => m.userId)
      )
    ),
    checklist: checklistRows,
    comments: commentRows,
    timeLogs: timeLogRows,
    activities: activityRows.sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt)).slice(0, 300),
  };
}

/* ---------- mutations ---------- */

async function insertActivity(db: Db, a: Activity) {
  await db.insert(activities).values({
    id: a.id,
    boardId: a.boardId,
    cardId: a.cardId,
    userId: a.userId,
    text: a.text,
    createdAt: a.createdAt,
  });
}

async function deleteCardTree(db: Db, cardIds: string[]) {
  if (cardIds.length === 0) return;
  await db.delete(checklistItems).where(inArray(checklistItems.cardId, cardIds));
  await db.delete(comments).where(inArray(comments.cardId, cardIds));
  await db.delete(timeLogs).where(inArray(timeLogs.cardId, cardIds));
  await db.delete(cardLabels).where(inArray(cardLabels.cardId, cardIds));
  await db.delete(cardMembers).where(inArray(cardMembers.cardId, cardIds));
  await db.delete(cards).where(inArray(cards.id, cardIds));
}

async function requireBoard(db: Db, user: SafeUser, boardId: string) {
  if (!(await canAccessBoard(db, user, boardId))) throw new ApiError(403, "No access to this board");
}

async function requireCardBoard(db: Db, user: SafeUser, cardId: string): Promise<string> {
  const rows = await db.select({ boardId: cards.boardId }).from(cards).where(eq(cards.id, cardId)).limit(1);
  if (!rows[0]) throw new ApiError(404, "Card not found");
  await requireBoard(db, user, rows[0].boardId);
  return rows[0].boardId;
}

export async function applyOp(db: Db, user: SafeUser, op: MutateOp): Promise<void> {
  // Clients can only read + comment. Everything else needs member/admin.
  const clientOnlyComment =
    user.role === "client" && op.op !== "addComment";
  if (clientOnlyComment) throw new ApiError(403, "Clients can only comment");
  if (op.op === "updateUserRole" && user.role !== "admin") throw new ApiError(403, "Admins only");
  if (
    (op.op === "createUser" || op.op === "updateUser" || op.op === "deleteUser") &&
    user.role !== "admin"
  )
    throw new ApiError(403, "Admins only");
  if (op.op === "resetDemo" && user.role !== "admin") throw new ApiError(403, "Admins only");

  switch (op.op) {
    case "createBoard": {
      if (user.role !== "admin" && !op.board.memberIds.includes(user.id))
        throw new ApiError(403, "Cannot create board for other members");
      await db.insert(boards).values({
        id: op.board.id,
        title: op.board.title,
        description: op.board.description,
        background: op.board.background,
        favorite: bit(op.board.favorite),
        archived: 0,
        createdAt: op.board.createdAt,
        updatedAt: op.board.updatedAt,
      });
      for (const m of op.board.memberIds)
        await db.insert(boardMembers).values({ boardId: op.board.id, userId: m, kind: "member" });
      for (const m of op.board.clientIds)
        await db.insert(boardMembers).values({ boardId: op.board.id, userId: m, kind: "client" });
      for (const l of op.lists)
        await db.insert(lists).values({ id: l.id, boardId: l.boardId, title: l.title, position: l.order });
      await insertActivity(db, op.activity);
      break;
    }
    case "updateBoard": {
      await requireBoard(db, user, op.id);
      const patch: Partial<typeof boards.$inferInsert> = {};
      if (op.patch.title !== undefined) patch.title = op.patch.title;
      if (op.patch.description !== undefined) patch.description = op.patch.description;
      if (op.patch.background !== undefined) patch.background = op.patch.background;
      if (op.patch.favorite !== undefined) patch.favorite = bit(op.patch.favorite);
      if (op.patch.archived !== undefined) patch.archived = bit(op.patch.archived);
      patch.updatedAt = new Date().toISOString();
      await db.update(boards).set(patch).where(eq(boards.id, op.id));
      if (op.memberIds !== undefined || op.clientIds !== undefined) {
        await db.delete(boardMembers).where(eq(boardMembers.boardId, op.id));
        for (const m of op.memberIds ?? [])
          await db.insert(boardMembers).values({ boardId: op.id, userId: m, kind: "member" });
        for (const m of op.clientIds ?? [])
          await db.insert(boardMembers).values({ boardId: op.id, userId: m, kind: "client" });
      }
      break;
    }
    case "deleteBoard": {
      await requireBoard(db, user, op.id);
      const cardIds = (await db.select({ id: cards.id }).from(cards).where(eq(cards.boardId, op.id))).map((c) => c.id);
      await deleteCardTree(db, cardIds);
      const listIds = (await db.select({ id: lists.id }).from(lists).where(eq(lists.boardId, op.id))).map((l) => l.id);
      if (listIds.length) await db.delete(lists).where(inArray(lists.id, listIds));
      await db.delete(activities).where(eq(activities.boardId, op.id));
      await db.delete(boardMembers).where(eq(boardMembers.boardId, op.id));
      await db.delete(boards).where(eq(boards.id, op.id));
      break;
    }
    case "createList": {
      await requireBoard(db, user, op.list.boardId);
      await db.insert(lists).values({ id: op.list.id, boardId: op.list.boardId, title: op.list.title, position: op.list.order });
      break;
    }
    case "updateList": {
      const rows = await db.select({ boardId: lists.boardId }).from(lists).where(eq(lists.id, op.id)).limit(1);
      if (!rows[0]) throw new ApiError(404, "List not found");
      await requireBoard(db, user, rows[0].boardId);
      await db.update(lists).set({ title: op.title }).where(eq(lists.id, op.id));
      break;
    }
    case "deleteList": {
      const rows = await db.select({ boardId: lists.boardId }).from(lists).where(eq(lists.id, op.id)).limit(1);
      if (!rows[0]) throw new ApiError(404, "List not found");
      await requireBoard(db, user, rows[0].boardId);
      await deleteCardTree(db, op.cardIds);
      await db.delete(lists).where(eq(lists.id, op.id));
      // renumbering of remaining lists happens client-side; positions resync on next moves
      break;
    }
    case "moveList": {
      await requireBoard(db, user, op.boardId);
      for (const u of op.updates as ListOrderUpdate[])
        await db.update(lists).set({ position: u.order }).where(eq(lists.id, u.id));
      break;
    }
    case "createCard": {
      await requireBoard(db, user, op.card.boardId);
      await db.insert(cards).values({
        id: op.card.id,
        boardId: op.card.boardId,
        listId: op.card.listId,
        title: op.card.title,
        description: op.card.description,
        position: op.card.order,
        dueDate: op.card.dueDate,
        completed: 0,
        archived: 0,
        createdAt: op.card.createdAt,
        updatedAt: op.card.updatedAt,
      });
      await insertActivity(db, op.activity);
      break;
    }
    case "updateCard": {
      await requireCardBoard(db, user, op.id);
      const patch: Partial<typeof cards.$inferInsert> = { updatedAt: new Date().toISOString() };
      if (op.patch.title !== undefined) patch.title = op.patch.title;
      if (op.patch.description !== undefined) patch.description = op.patch.description;
      if (op.patch.dueDate !== undefined) patch.dueDate = op.patch.dueDate;
      if (op.patch.completed !== undefined) patch.completed = bit(op.patch.completed);
      if (op.patch.archived !== undefined) patch.archived = bit(op.patch.archived);
      await db.update(cards).set(patch).where(eq(cards.id, op.id));
      if (op.labelIds !== undefined) {
        await db.delete(cardLabels).where(eq(cardLabels.cardId, op.id));
        for (const l of op.labelIds) await db.insert(cardLabels).values({ cardId: op.id, label: l });
      }
      if (op.memberIds !== undefined) {
        await db.delete(cardMembers).where(eq(cardMembers.cardId, op.id));
        for (const m of op.memberIds) await db.insert(cardMembers).values({ cardId: op.id, userId: m });
      }
      break;
    }
    case "deleteCard": {
      await requireCardBoard(db, user, op.id);
      await deleteCardTree(db, [op.id]);
      break;
    }
    case "archiveCard": {
      await requireCardBoard(db, user, op.id);
      await db.update(cards).set({ archived: bit(op.archived), updatedAt: new Date().toISOString() }).where(eq(cards.id, op.id));
      await insertActivity(db, op.activity);
      break;
    }
    case "moveCard": {
      await requireBoard(db, user, op.boardId);
      for (const u of op.updates as CardOrderUpdate[]) {
        const patch: Partial<typeof cards.$inferInsert> = {
          listId: u.listId,
          position: u.order,
          updatedAt: new Date().toISOString(),
        };
        if (u.completed !== undefined) patch.completed = bit(u.completed);
        await db.update(cards).set(patch).where(eq(cards.id, u.id));
      }
      await insertActivity(db, op.activity);
      break;
    }
    case "toggleLabel": {
      await requireCardBoard(db, user, op.cardId);
      await db.delete(cardLabels).where(eq(cardLabels.cardId, op.cardId));
      for (const l of op.labelIds) await db.insert(cardLabels).values({ cardId: op.cardId, label: l });
      break;
    }
    case "addChecklistItem": {
      await requireCardBoard(db, user, op.item.cardId);
      await db.insert(checklistItems).values({ id: op.item.id, cardId: op.item.cardId, text: op.item.text, done: 0 });
      break;
    }
    case "toggleChecklistItem": {
      const rows = await db.select({ cardId: checklistItems.cardId }).from(checklistItems).where(eq(checklistItems.id, op.id)).limit(1);
      if (!rows[0]) throw new ApiError(404, "Item not found");
      await requireCardBoard(db, user, rows[0].cardId);
      await db.update(checklistItems).set({ done: bit(op.done) }).where(eq(checklistItems.id, op.id));
      break;
    }
    case "deleteChecklistItem": {
      const rows = await db.select({ cardId: checklistItems.cardId }).from(checklistItems).where(eq(checklistItems.id, op.id)).limit(1);
      if (rows[0]) await requireCardBoard(db, user, rows[0].cardId);
      await db.delete(checklistItems).where(eq(checklistItems.id, op.id));
      break;
    }
    case "addComment": {
      await requireCardBoard(db, user, op.comment.cardId);
      await db.insert(comments).values({
        id: op.comment.id,
        cardId: op.comment.cardId,
        userId: op.comment.userId,
        text: op.comment.text,
        createdAt: op.comment.createdAt,
      });
      await insertActivity(db, op.activity);
      break;
    }
    case "deleteComment": {
      const rows = await db.select({ cardId: comments.cardId }).from(comments).where(eq(comments.id, op.id)).limit(1);
      if (rows[0]) await requireCardBoard(db, user, rows[0].cardId);
      await db.delete(comments).where(eq(comments.id, op.id));
      break;
    }
    case "addTimeLog": {
      await requireCardBoard(db, user, op.log.cardId);
      await db.insert(timeLogs).values({
        id: op.log.id,
        cardId: op.log.cardId,
        userId: op.log.userId,
        hours: op.log.hours,
        note: op.log.note,
        date: op.log.date,
        createdAt: op.log.createdAt,
      });
      await insertActivity(db, op.activity);
      break;
    }
    case "deleteTimeLog": {
      const rows = await db.select({ cardId: timeLogs.cardId }).from(timeLogs).where(eq(timeLogs.id, op.id)).limit(1);
      if (rows[0]) await requireCardBoard(db, user, rows[0].cardId);
      await db.delete(timeLogs).where(eq(timeLogs.id, op.id));
      break;
    }
    case "updateUserRole": {
      await db.update(users).set({ role: op.role }).where(eq(users.id, op.userId));
      break;
    }
    case "createUser": {
      const name = op.name.trim();
      const email = op.email.trim();
      if (!name || !email || !op.password || op.password.length < 6)
        throw new ApiError(400, "Name, email and a 6+ character password are required");
      if (op.role !== "admin" && op.role !== "member" && op.role !== "client")
        throw new ApiError(400, "Invalid role");
      const all = await db.select().from(users);
      if (all.some((u) => u.email.toLowerCase() === email.toLowerCase()))
        throw new ApiError(409, "Email already registered");
      const colors = ["bg-blue-600", "bg-rose-600", "bg-amber-600", "bg-teal-600", "bg-indigo-600"];
      await db.insert(users).values({
        id: crypto.randomUUID(),
        name,
        email,
        passwordHash: hashSync(op.password, 10),
        role: op.role,
        avatarColor: colors[all.length % colors.length],
      });
      break;
    }
    case "updateUser": {
      const rows = await db.select().from(users).where(eq(users.id, op.userId)).limit(1);
      if (!rows[0]) throw new ApiError(404, "User not found");
      const patch: Partial<typeof users.$inferInsert> = {};
      if (op.name !== undefined) {
        if (!op.name.trim()) throw new ApiError(400, "Name cannot be empty");
        patch.name = op.name.trim();
      }
      if (op.email !== undefined) {
        const email = op.email.trim();
        if (!email) throw new ApiError(400, "Email cannot be empty");
        const all = await db.select().from(users);
        if (all.some((u) => u.id !== op.userId && u.email.toLowerCase() === email.toLowerCase()))
          throw new ApiError(409, "Email already registered");
        patch.email = email;
      }
      if (Object.keys(patch).length) await db.update(users).set(patch).where(eq(users.id, op.userId));
      break;
    }
    case "deleteUser": {
      if (op.userId === user.id) throw new ApiError(400, "You cannot delete your own account");
      await db.delete(sessions).where(eq(sessions.userId, op.userId));
      await db.delete(boardMembers).where(eq(boardMembers.userId, op.userId));
      await db.delete(cardMembers).where(eq(cardMembers.userId, op.userId));
      await db.delete(users).where(eq(users.id, op.userId));
      break;
    }
    case "resetDemo": {
      await db.delete(activities);
      await db.delete(timeLogs);
      await db.delete(comments);
      await db.delete(checklistItems);
      await db.delete(cardLabels);
      await db.delete(cardMembers);
      await db.delete(cards);
      await db.delete(lists);
      await db.delete(boardMembers);
      await db.delete(boards);
      for (const b of seedBoards)
        await db.insert(boards).values({
          id: b.id, title: b.title, description: b.description, background: b.background,
          favorite: bit(b.favorite), archived: 0, createdAt: b.createdAt, updatedAt: b.updatedAt,
        });
      const seedMembers: [string, string, string][] = [
        ["b_website", "u_admin", "member"], ["b_website", "u_member", "member"], ["b_website", "u_client", "client"],
        ["b_mobile", "u_admin", "member"], ["b_mobile", "u_member", "member"],
      ];
      for (const [boardId, userId, kind] of seedMembers)
        await db.insert(boardMembers).values({ boardId, userId, kind });
      for (const l of seedLists)
        await db.insert(lists).values({ id: l.id, boardId: l.boardId, title: l.title, position: l.order });
      for (const c of seedCards)
        await db.insert(cards).values({
          id: c.id, boardId: c.boardId, listId: c.listId, title: c.title, description: c.description,
          position: c.order, dueDate: c.dueDate, completed: bit(c.completed), archived: 0,
          createdAt: c.createdAt, updatedAt: c.updatedAt,
        });
      const seedLabels: [string, string][] = [
        ["c_hero", "blue"], ["c_hero", "purple"], ["c_pricing", "blue"], ["c_blog", "yellow"],
        ["c_launch", "green"], ["c_auth", "red"], ["c_auth", "blue"], ["c_push", "orange"],
      ];
      for (const [cardId, label] of seedLabels) await db.insert(cardLabels).values({ cardId, label });
      const seedCardMembers: [string, string][] = [
        ["c_hero", "u_member"], ["c_pricing", "u_admin"], ["c_blog", "u_member"],
        ["c_blog", "u_admin"], ["c_launch", "u_admin"], ["c_auth", "u_member"],
      ];
      for (const [cardId, userId] of seedCardMembers) await db.insert(cardMembers).values({ cardId, userId });
      for (const ch of seedChecklist)
        await db.insert(checklistItems).values({ id: ch.id, cardId: ch.cardId, text: ch.text, done: bit(ch.done) });
      for (const c of seedComments)
        await db.insert(comments).values({ id: c.id, cardId: c.cardId, userId: c.userId, text: c.text, createdAt: c.createdAt });
      for (const t of seedTimeLogs)
        await db.insert(timeLogs).values({
          id: t.id, cardId: t.cardId, userId: t.userId, hours: t.hours, note: t.note, date: t.date, createdAt: t.createdAt,
        });
      for (const a of seedActivity) await insertActivity(db, a);
      break;
    }
  }
}
