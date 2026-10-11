"use client";

import { create } from "zustand";
import type { Activity, Board, Card, ChecklistItem, Comment, LabelColor, List, MutateOp, TimeLog, User } from "./types";
import type { BootstrapState } from "./server-state";
import { nowIso, uid } from "./utils";

interface Filters {
  search: string;
  labels: LabelColor[];
  memberId: string | null;
  due: "all" | "overdue" | "dueSoon" | "noDate" | "completed";
  showArchived: boolean;
}

type SafeUser = Omit<User, "password">;

interface State {
  users: SafeUser[];
  boards: Board[];
  lists: List[];
  cards: Card[];
  checklist: ChecklistItem[];
  comments: Comment[];
  timeLogs: TimeLog[];
  activities: Activity[];
  currentUserId: string | null;
  activeBoardId: string | null;
  activeCardId: string | null;
  filters: Filters;
  ready: boolean;

  bootstrap: () => Promise<void>;
  login: (email: string, password: string) => Promise<string | null>;
  register: (name: string, email: string, password: string, role?: User["role"]) => Promise<string | null>;
  logout: () => Promise<void>;
  updateUserRole: (userId: string, role: User["role"]) => void;

  setActiveBoard: (id: string | null) => void;
  setActiveCard: (id: string | null) => void;
  setFilters: (f: Partial<Filters>) => void;

  createBoard: (title: string, description: string, background: string) => string;
  updateBoard: (id: string, patch: Partial<Board>) => void;
  deleteBoard: (id: string) => void;

  createList: (boardId: string, title: string) => void;
  updateList: (id: string, title: string) => void;
  deleteList: (id: string) => void;
  moveList: (boardId: string, fromIndex: number, toIndex: number) => void;

  createCard: (boardId: string, listId: string, title: string) => string;
  updateCard: (id: string, patch: Partial<Card>) => void;
  deleteCard: (id: string) => void;
  archiveCard: (id: string, archived: boolean) => void;
  moveCard: (cardId: string, destListId: string, destIndex: number) => void;
  toggleLabel: (cardId: string, label: LabelColor) => void;

  addChecklistItem: (cardId: string, text: string) => void;
  toggleChecklistItem: (id: string) => void;
  deleteChecklistItem: (id: string) => void;

  addComment: (cardId: string, text: string) => void;
  deleteComment: (id: string) => void;

  addTimeLog: (cardId: string, hours: number, note: string, date: string) => void;
  deleteTimeLog: (id: string) => void;

  logActivity: (boardId: string, cardId: string | null, text: string) => void;

  resetDemo: () => Promise<void>;
}

function reorder<T>(arr: T[], from: number, to: number): T[] {
  const next = [...arr];
  const [moved] = next.splice(from, 1);
  next.splice(to, 0, moved);
  return next;
}

const EMPTY = {
  users: [],
  boards: [],
  lists: [],
  cards: [],
  checklist: [],
  comments: [],
  timeLogs: [],
  activities: [],
  currentUserId: null as string | null,
};

/** Fire-and-forget server sync. On rejection, re-bootstrap to repair optimistic state. */
function sync(op: MutateOp) {
  fetch("/api/mutate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(op),
  })
    .then((res) => {
      if (!res.ok) {
        console.error("sync rejected", op.op, res.status);
        void useStore.getState().bootstrap();
      }
    })
    .catch((e) => console.error("sync failed", op.op, e));
}

let bootstrapInflight: Promise<void> | null = null;

export const useStore = create<State>()((set, get) => ({
  ...EMPTY,
  activeBoardId: null,
  activeCardId: null,
  filters: { search: "", labels: [], memberId: null, due: "all", showArchived: false },
  ready: false,

  bootstrap: () => {
    if (bootstrapInflight) return bootstrapInflight;
    bootstrapInflight = (async () => {
      try {
        const res = await fetch("/api/bootstrap", { cache: "no-store" });
        if (!res.ok) {
          set({ ...EMPTY, ready: true });
          return;
        }
        const data = (await res.json()) as BootstrapState;
        set({
          users: data.users,
          boards: data.boards,
          lists: data.lists,
          cards: data.cards,
          checklist: data.checklist,
          comments: data.comments,
          timeLogs: data.timeLogs,
          activities: data.activities,
          currentUserId: data.user.id,
          ready: true,
        });
      } catch (e) {
        console.error("bootstrap failed", e);
        set({ ...EMPTY, ready: true });
      } finally {
        bootstrapInflight = null;
      }
    })();
    return bootstrapInflight;
  },

  login: async (email, password) => {
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    if (!res.ok) {
      const data = (await res.json().catch(() => null)) as { error?: string } | null;
      return data?.error ?? "Login failed";
    }
    await get().bootstrap();
    return null;
  },
  register: async (name, email, password, role = "member") => {
    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password, role }),
    });
    if (!res.ok) {
      const data = (await res.json().catch(() => null)) as { error?: string } | null;
      return data?.error ?? "Registration failed";
    }
    await get().bootstrap();
    return null;
  },
  logout: async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch {
      // ignore — local state is cleared regardless
    }
    set({ ...EMPTY, activeBoardId: null, activeCardId: null, ready: true });
  },
  updateUserRole: (userId, role) => {
    set({ users: get().users.map((u) => (u.id === userId ? { ...u, role } : u)) });
    sync({ op: "updateUserRole", userId, role });
  },

  setActiveBoard: (id) => set({ activeBoardId: id }),
  setActiveCard: (id) => set({ activeCardId: id }),
  setFilters: (f) => set({ filters: { ...get().filters, ...f } }),

  createBoard: (title, description, background) => {
    const me = get().currentUserId;
    const id = uid("b");
    const b: Board = {
      id,
      title: title.trim() || "Untitled board",
      description,
      background,
      memberIds: me ? [me] : [],
      clientIds: [],
      favorite: false,
      archived: false,
      createdAt: nowIso(),
      updatedAt: nowIso(),
    };
    set({ boards: [b, ...get().boards] });
    const newLists: List[] = ["Backlog", "In Progress", "In Review", "Done"].map((t, i) => ({
      id: uid("l"),
      boardId: id,
      title: t,
      order: i,
    }));
    set({ lists: [...get().lists, ...newLists] });
    const activity: Activity = {
      id: uid("a"),
      boardId: id,
      cardId: null,
      userId: me ?? "unknown",
      text: `created board ${b.title}`,
      createdAt: nowIso(),
    };
    set({ activities: [activity, ...get().activities].slice(0, 300) });
    sync({ op: "createBoard", board: b, lists: newLists, activity });
    return id;
  },
  updateBoard: (id, patch) => {
    set({
      boards: get().boards.map((b) =>
        b.id === id ? { ...b, ...patch, updatedAt: nowIso() } : b
      ),
    });
    sync({
      op: "updateBoard",
      id,
      patch: {
        title: patch.title,
        description: patch.description,
        background: patch.background,
        favorite: patch.favorite,
        archived: patch.archived,
      },
      memberIds: patch.memberIds,
      clientIds: patch.clientIds,
    });
  },
  deleteBoard: (id) => {
    set({
      boards: get().boards.filter((b) => b.id !== id),
      lists: get().lists.filter((l) => l.boardId !== id),
      cards: get().cards.filter((c) => c.boardId !== id),
      activities: get().activities.filter((a) => a.boardId !== id),
    });
    sync({ op: "deleteBoard", id });
  },

  createList: (boardId, title) => {
    const order = get().lists.filter((l) => l.boardId === boardId).length;
    const l: List = { id: uid("l"), boardId, title: title.trim() || "New list", order };
    set({ lists: [...get().lists, l] });
    sync({ op: "createList", list: l });
  },
  updateList: (id, title) => {
    set({ lists: get().lists.map((l) => (l.id === id ? { ...l, title } : l)) });
    sync({ op: "updateList", id, title });
  },
  deleteList: (id) => {
    const cardIds = get().cards.filter((c) => c.listId === id).map((c) => c.id);
    set({
      lists: get().lists.filter((l) => l.id !== id),
      cards: get().cards.filter((c) => c.listId !== id),
      checklist: get().checklist.filter((ch) => !cardIds.includes(ch.cardId)),
      comments: get().comments.filter((cm) => !cardIds.includes(cm.cardId)),
      timeLogs: get().timeLogs.filter((tl) => !cardIds.includes(tl.cardId)),
    });
    sync({ op: "deleteList", id, cardIds });
  },
  moveList: (boardId, fromIndex, toIndex) => {
    const ordered = get().lists.filter((l) => l.boardId === boardId).sort((a, b) => a.order - b.order);
    const next = reorder(ordered, fromIndex, toIndex).map((l, i) => ({ ...l, order: i }));
    const others = get().lists.filter((l) => l.boardId !== boardId);
    set({ lists: [...others, ...next] });
    sync({ op: "moveList", boardId, updates: next.map((l) => ({ id: l.id, order: l.order })) });
  },

  createCard: (boardId, listId, title) => {
    const order = get().cards.filter((c) => c.listId === listId && !c.archived).length;
    const id = uid("c");
    const card: Card = {
      id, boardId, listId,
      title: title.trim() || "New task",
      description: "",
      order,
      labelIds: [],
      memberIds: [],
      dueDate: null,
      completed: false,
      archived: false,
      createdAt: nowIso(),
      updatedAt: nowIso(),
    };
    set({ cards: [...get().cards, card] });
    const activity: Activity = {
      id: uid("a"),
      boardId,
      cardId: id,
      userId: get().currentUserId ?? "unknown",
      text: `created card ${card.title}`,
      createdAt: nowIso(),
    };
    set({ activities: [activity, ...get().activities].slice(0, 300) });
    sync({ op: "createCard", card, activity });
    return id;
  },
  updateCard: (id, patch) => {
    set({
      cards: get().cards.map((c) => (c.id === id ? { ...c, ...patch, updatedAt: nowIso() } : c)),
    });
    sync({
      op: "updateCard",
      id,
      patch: {
        title: patch.title,
        description: patch.description,
        dueDate: patch.dueDate,
        completed: patch.completed,
        archived: patch.archived,
      },
      labelIds: patch.labelIds,
      memberIds: patch.memberIds,
    });
  },
  deleteCard: (id) => {
    set({
      cards: get().cards.filter((c) => c.id !== id),
      checklist: get().checklist.filter((ch) => ch.cardId !== id),
      comments: get().comments.filter((cm) => cm.cardId !== id),
      timeLogs: get().timeLogs.filter((tl) => tl.cardId !== id),
      activeCardId: get().activeCardId === id ? null : get().activeCardId,
    });
    sync({ op: "deleteCard", id });
  },
  archiveCard: (id, archived) => {
    const card = get().cards.find((c) => c.id === id);
    set({
      cards: get().cards.map((c) => (c.id === id ? { ...c, archived, updatedAt: nowIso() } : c)),
    });
    if (card) {
      const activity: Activity = {
        id: uid("a"),
        boardId: card.boardId,
        cardId: id,
        userId: get().currentUserId ?? "unknown",
        text: `${archived ? "archived" : "restored"} card ${card.title}`,
        createdAt: nowIso(),
      };
      set({ activities: [activity, ...get().activities].slice(0, 300) });
      sync({ op: "archiveCard", id, archived, activity });
    }
  },
  moveCard: (cardId, destListId, destIndex) => {
    const s = get();
    const card = s.cards.find((c) => c.id === cardId);
    if (!card) return;
    const srcListId = card.listId;
    const srcCards = s.cards
      .filter((c) => c.listId === srcListId && c.id !== cardId && !c.archived)
      .sort((a, b) => a.order - b.order);
    const destCards = (srcListId === destListId ? srcCards : s.cards
      .filter((c) => c.listId === destListId && !c.archived)
      .sort((a, b) => a.order - b.order)
    ).slice();
    destCards.splice(Math.max(0, Math.min(destIndex, destCards.length)), 0, { ...card, listId: destListId });
    const reorderedDest = destCards.map((c, i) => ({ ...c, order: i, listId: destListId }));
    const reorderedSrc = srcListId === destListId ? [] : srcCards.map((c, i) => ({ ...c, order: i }));
    const untouched = s.cards.filter(
      (c) => c.archived || (c.listId !== srcListId && c.listId !== destListId) || c.id === cardId
    ).filter((c) => c.id !== cardId);
    const byId = new Map<string, Card>();
    [...untouched, ...reorderedSrc, ...reorderedDest].forEach((c) => byId.set(c.id, c));
    s.cards.forEach((c) => {
      if (c.archived && (c.listId === srcListId || c.listId === destListId) && !byId.has(c.id)) {
        byId.set(c.id, c);
      }
    });
    // auto-complete when moved to last list ("Done")
    const boardLists = s.lists.filter((l) => l.boardId === card.boardId).sort((a, b) => a.order - b.order);
    const last = boardLists[boardLists.length - 1];
    const autoComplete = !!last && destListId === last.id;
    if (autoComplete) {
      const moved = byId.get(cardId);
      if (moved) byId.set(cardId, { ...moved, completed: true });
    }
    set({ cards: Array.from(byId.values()) });
    if (srcListId !== destListId) {
      const destList = s.lists.find((l) => l.id === destListId);
      const activity: Activity = {
        id: uid("a"),
        boardId: card.boardId,
        cardId,
        userId: s.currentUserId ?? "unknown",
        text: `moved ${card.title} to ${destList?.title ?? "another list"}`,
        createdAt: nowIso(),
      };
      set({ activities: [activity, ...get().activities].slice(0, 300) });
      const updates = [...reorderedSrc, ...reorderedDest].map((c) => ({
        id: c.id,
        listId: c.listId,
        order: c.order,
        completed: c.id === cardId && autoComplete ? true : undefined,
      }));
      sync({ op: "moveCard", boardId: card.boardId, updates, activity });
    }
  },
  toggleLabel: (cardId, label) => {
    const card = get().cards.find((c) => c.id === cardId);
    if (!card) return;
    const labelIds = card.labelIds.includes(label)
      ? card.labelIds.filter((l) => l !== label)
      : [...card.labelIds, label];
    set({
      cards: get().cards.map((c) =>
        c.id === cardId ? { ...c, labelIds, updatedAt: nowIso() } : c
      ),
    });
    sync({ op: "toggleLabel", cardId, labelIds });
  },

  addChecklistItem: (cardId, text) => {
    const item: ChecklistItem = { id: uid("ch"), cardId, text, done: false };
    set({ checklist: [...get().checklist, item] });
    sync({ op: "addChecklistItem", item });
  },
  toggleChecklistItem: (id) => {
    const item = get().checklist.find((ch) => ch.id === id);
    set({ checklist: get().checklist.map((ch) => (ch.id === id ? { ...ch, done: !ch.done } : ch)) });
    if (item) sync({ op: "toggleChecklistItem", id, done: !item.done });
  },
  deleteChecklistItem: (id) => {
    set({ checklist: get().checklist.filter((ch) => ch.id !== id) });
    sync({ op: "deleteChecklistItem", id });
  },

  addComment: (cardId, text) => {
    const card = get().cards.find((c) => c.id === cardId);
    if (!card) return;
    const comment: Comment = {
      id: uid("cm"),
      cardId,
      userId: get().currentUserId ?? "unknown",
      text,
      createdAt: nowIso(),
    };
    set({ comments: [...get().comments, comment] });
    const activity: Activity = {
      id: uid("a"),
      boardId: card.boardId,
      cardId,
      userId: get().currentUserId ?? "unknown",
      text: `commented on ${card.title}`,
      createdAt: nowIso(),
    };
    set({ activities: [activity, ...get().activities].slice(0, 300) });
    sync({ op: "addComment", comment, activity });
  },
  deleteComment: (id) => {
    set({ comments: get().comments.filter((c) => c.id !== id) });
    sync({ op: "deleteComment", id });
  },

  addTimeLog: (cardId, hours, note, date) => {
    const card = get().cards.find((c) => c.id === cardId);
    if (!card) return;
    const log: TimeLog = {
      id: uid("tl"),
      cardId,
      userId: get().currentUserId ?? "unknown",
      hours,
      note,
      date,
      createdAt: nowIso(),
    };
    set({ timeLogs: [...get().timeLogs, log] });
    const activity: Activity = {
      id: uid("a"),
      boardId: card.boardId,
      cardId,
      userId: get().currentUserId ?? "unknown",
      text: `logged ${hours}h — ${note || card.title}`,
      createdAt: nowIso(),
    };
    set({ activities: [activity, ...get().activities].slice(0, 300) });
    sync({ op: "addTimeLog", log, activity });
  },
  deleteTimeLog: (id) => {
    set({ timeLogs: get().timeLogs.filter((t) => t.id !== id) });
    sync({ op: "deleteTimeLog", id });
  },

  logActivity: (boardId, cardId, text) =>
    set({
      activities: [
        { id: uid("a"), boardId, cardId, userId: get().currentUserId ?? "unknown", text, createdAt: nowIso() },
        ...get().activities,
      ].slice(0, 300),
    }),

  resetDemo: async () => {
    try {
      await fetch("/api/mutate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ op: "resetDemo" }),
      });
    } catch (e) {
      console.error("reset failed", e);
    }
    await get().logout();
  },
}));

export const useCurrentUser = () => useStore((s) => s.users.find((u) => u.id === s.currentUserId) ?? null);
