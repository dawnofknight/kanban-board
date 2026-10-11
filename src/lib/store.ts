"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Activity, Board, Card, ChecklistItem, Comment, LabelColor, List, TimeLog, User } from "./types";
import { seedActivity, seedBoards, seedCards, seedChecklist, seedComments, seedLists, seedTimeLogs, seedUsers } from "./seed";
import { nowIso, uid } from "./utils";

interface Filters {
  search: string;
  labels: LabelColor[];
  memberId: string | null;
  due: "all" | "overdue" | "dueSoon" | "noDate" | "completed";
  showArchived: boolean;
}

interface State {
  users: User[];
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
  seeded: boolean;

  login: (email: string, password: string) => string | null;
  register: (name: string, email: string, password: string, role?: User["role"]) => string | null;
  logout: () => void;
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

  resetDemo: () => void;
}

function reorder<T>(arr: T[], from: number, to: number): T[] {
  const next = [...arr];
  const [moved] = next.splice(from, 1);
  next.splice(to, 0, moved);
  return next;
}

export const useStore = create<State>()(
  persist(
    (set, get) => ({
      users: seedUsers,
      boards: seedBoards,
      lists: seedLists,
      cards: seedCards,
      checklist: seedChecklist,
      comments: seedComments,
      timeLogs: seedTimeLogs,
      activities: seedActivity,
      currentUserId: null,
      activeBoardId: null,
      activeCardId: null,
      filters: { search: "", labels: [], memberId: null, due: "all", showArchived: false },
      seeded: true,

      login: (email, password) => {
        const u = get().users.find(
          (x) => x.email.toLowerCase() === email.toLowerCase() && x.password === password
        );
        if (!u) return "Invalid email or password. Try admin@example.com / password";
        set({ currentUserId: u.id });
        return null;
      },
      register: (name, email, password, role = "member") => {
        if (get().users.some((x) => x.email.toLowerCase() === email.toLowerCase()))
          return "Email already registered";
        const colors = ["bg-blue-600", "bg-rose-600", "bg-amber-600", "bg-teal-600", "bg-indigo-600"];
        const u: User = {
          id: uid("u"),
          name,
          email,
          password,
          role,
          avatarColor: colors[get().users.length % colors.length],
        };
        set({ users: [...get().users, u], currentUserId: u.id });
        return null;
      },
      logout: () => set({ currentUserId: null, activeBoardId: null, activeCardId: null }),
      updateUserRole: (userId, role) =>
        set({ users: get().users.map((u) => (u.id === userId ? { ...u, role } : u)) }),

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
        const defaults = ["Backlog", "In Progress", "In Review", "Done"];
        const newLists: List[] = defaults.map((t, i) => ({
          id: uid("l"),
          boardId: id,
          title: t,
          order: i,
        }));
        set({ lists: [...get().lists, ...newLists] });
        get().logActivity(id, null, `created board ${b.title}`);
        return id;
      },
      updateBoard: (id, patch) =>
        set({
          boards: get().boards.map((b) =>
            b.id === id ? { ...b, ...patch, updatedAt: nowIso() } : b
          ),
        }),
      deleteBoard: (id) =>
        set({
          boards: get().boards.filter((b) => b.id !== id),
          lists: get().lists.filter((l) => l.boardId !== id),
          cards: get().cards.filter((c) => c.boardId !== id),
          activities: get().activities.filter((a) => a.boardId !== id),
        }),

      createList: (boardId, title) => {
        const order = get().lists.filter((l) => l.boardId === boardId).length;
        const l: List = { id: uid("l"), boardId, title: title.trim() || "New list", order };
        set({ lists: [...get().lists, l] });
      },
      updateList: (id, title) =>
        set({ lists: get().lists.map((l) => (l.id === id ? { ...l, title } : l)) }),
      deleteList: (id) => {
        const listCards = get().cards.filter((c) => c.listId === id).map((c) => c.id);
        set({
          lists: get().lists.filter((l) => l.id !== id),
          cards: get().cards.filter((c) => c.listId !== id),
          checklist: get().checklist.filter((ch) => !listCards.includes(ch.cardId)),
          comments: get().comments.filter((cm) => !listCards.includes(cm.cardId)),
          timeLogs: get().timeLogs.filter((tl) => !listCards.includes(tl.cardId)),
        });
      },
      moveList: (boardId, fromIndex, toIndex) => {
        const ordered = get().lists.filter((l) => l.boardId === boardId).sort((a, b) => a.order - b.order);
        const next = reorder(ordered, fromIndex, toIndex).map((l, i) => ({ ...l, order: i }));
        const others = get().lists.filter((l) => l.boardId !== boardId);
        set({ lists: [...others, ...next] });
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
        get().logActivity(boardId, id, `created card ${card.title}`);
        return id;
      },
      updateCard: (id, patch) =>
        set({
          cards: get().cards.map((c) => (c.id === id ? { ...c, ...patch, updatedAt: nowIso() } : c)),
        }),
      deleteCard: (id) =>
        set({
          cards: get().cards.filter((c) => c.id !== id),
          checklist: get().checklist.filter((ch) => ch.cardId !== id),
          comments: get().comments.filter((cm) => cm.cardId !== id),
          timeLogs: get().timeLogs.filter((tl) => tl.cardId !== id),
          activeCardId: get().activeCardId === id ? null : get().activeCardId,
        }),
      archiveCard: (id, archived) => {
        set({
          cards: get().cards.map((c) => (c.id === id ? { ...c, archived, updatedAt: nowIso() } : c)),
        });
        const card = get().cards.find((c) => c.id === id);
        if (card) get().logActivity(card.boardId, id, `${archived ? "archived" : "restored"} card ${card.title}`);
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
        // rebuild
        const byId = new Map<string, Card>();
        [...untouched, ...reorderedSrc, ...reorderedDest].forEach((c) => byId.set(c.id, c));
        // keep archived cards of src/dest lists
        s.cards.forEach((c) => {
          if (c.archived && (c.listId === srcListId || c.listId === destListId) && !byId.has(c.id)) {
            byId.set(c.id, c);
          }
        });
        set({ cards: Array.from(byId.values()) });
        if (srcListId !== destListId) {
          const destList = s.lists.find((l) => l.id === destListId);
          s.logActivity(card.boardId, cardId, `moved ${card.title} to ${destList?.title ?? "another list"}`);
          // auto-complete when moved to last list ("Done")
          const boardLists = s.lists.filter((l) => l.boardId === card.boardId).sort((a, b) => a.order - b.order);
          const last = boardLists[boardLists.length - 1];
          if (last && destListId === last.id) {
            get().updateCard(cardId, { completed: true });
          }
        }
      },
      toggleLabel: (cardId, label) =>
        set({
          cards: get().cards.map((c) =>
            c.id === cardId
              ? {
                  ...c,
                  labelIds: c.labelIds.includes(label)
                    ? c.labelIds.filter((l) => l !== label)
                    : [...c.labelIds, label],
                  updatedAt: nowIso(),
                }
              : c
          ),
        }),

      addChecklistItem: (cardId, text) =>
        set({ checklist: [...get().checklist, { id: uid("ch"), cardId, text, done: false }] }),
      toggleChecklistItem: (id) =>
        set({ checklist: get().checklist.map((ch) => (ch.id === id ? { ...ch, done: !ch.done } : ch)) }),
      deleteChecklistItem: (id) => set({ checklist: get().checklist.filter((ch) => ch.id !== id) }),

      addComment: (cardId, text) => {
        const card = get().cards.find((c) => c.id === cardId);
        if (!card) return;
        set({
          comments: [...get().comments, { id: uid("cm"), cardId, userId: get().currentUserId ?? "u_admin", text, createdAt: nowIso() }],
        });
        get().logActivity(card.boardId, cardId, `commented on ${card.title}`);
      },
      deleteComment: (id) => set({ comments: get().comments.filter((c) => c.id !== id) }),

      addTimeLog: (cardId, hours, note, date) => {
        const card = get().cards.find((c) => c.id === cardId);
        if (!card) return;
        set({
          timeLogs: [...get().timeLogs, { id: uid("tl"), cardId, userId: get().currentUserId ?? "u_admin", hours, note, date, createdAt: nowIso() }],
        });
        get().logActivity(card.boardId, cardId, `logged ${hours}h — ${note || card.title}`);
      },
      deleteTimeLog: (id) => set({ timeLogs: get().timeLogs.filter((t) => t.id !== id) }),

      logActivity: (boardId, cardId, text) =>
        set({
          activities: [
            { id: uid("a"), boardId, cardId, userId: get().currentUserId ?? "u_admin", text, createdAt: nowIso() },
            ...get().activities,
          ].slice(0, 300),
        }),

      resetDemo: () =>
        set({
          users: seedUsers,
          boards: seedBoards,
          lists: seedLists,
          cards: seedCards,
          checklist: seedChecklist,
          comments: seedComments,
          timeLogs: seedTimeLogs,
          activities: seedActivity,
          currentUserId: null,
          activeBoardId: null,
          activeCardId: null,
        }),
    }),
    { name: "kanban-storage-v1" }
  )
);

export const useCurrentUser = () => useStore((s) => s.users.find((u) => u.id === s.currentUserId) ?? null);
