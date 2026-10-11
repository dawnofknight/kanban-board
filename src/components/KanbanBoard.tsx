"use client";

import { useMemo, useState } from "react";
import { DragDropContext, Droppable, Draggable, type DropResult } from "@hello-pangea/dnd";
import { Plus, Search, Archive, X, CalendarClock, CheckSquare, MessageSquare, Clock, AlertTriangle } from "lucide-react";
import { useStore, useCurrentUser } from "@/lib/store";
import { LABELS, type LabelColor } from "@/lib/types";
import { cn, formatDate, isOverdue, isDueSoon } from "@/lib/utils";
import { Avatar } from "./Avatar";

export function KanbanBoard({ boardId }: { boardId: string }) {
  const listsRaw = useStore((s) => s.lists);
  const allCardsRaw = useStore((s) => s.cards);
  const users = useStore((s) => s.users);
  const checklist = useStore((s) => s.checklist);
  const comments = useStore((s) => s.comments);
  const timeLogs = useStore((s) => s.timeLogs);
  const lists = useMemo(
    () => listsRaw.filter((l) => l.boardId === boardId).sort((a, b) => a.order - b.order),
    [listsRaw, boardId]
  );
  const allCards = useMemo(() => allCardsRaw.filter((c) => c.boardId === boardId), [allCardsRaw, boardId]);
  const moveCard = useStore((s) => s.moveCard);
  const moveList = useStore((s) => s.moveList);
  const createList = useStore((s) => s.createList);
  const updateList = useStore((s) => s.updateList);
  const deleteList = useStore((s) => s.deleteList);
  const createCard = useStore((s) => s.createCard);
  const setActiveCard = useStore((s) => s.setActiveCard);
  const filters = useStore((s) => s.filters);
  const setFilters = useStore((s) => s.setFilters);
  const currentUser = useCurrentUser();

  const [newListTitle, setNewListTitle] = useState("");
  const [addingList, setAddingList] = useState(false);
  const [newCardFor, setNewCardFor] = useState<string | null>(null);
  const [newCardTitle, setNewCardTitle] = useState("");
  const [editingListId, setEditingListId] = useState<string | null>(null);
  const [editingListTitle, setEditingListTitle] = useState("");

  const isClient = currentUser?.role === "client";

  const filteredCards = useMemo(() => {
    return allCards.filter((c) => {
      if (!filters.showArchived && c.archived) return false;
      if (filters.showArchived && !c.archived) return false;
      if (filters.search && !`${c.title} ${c.description}`.toLowerCase().includes(filters.search.toLowerCase()))
        return false;
      if (filters.labels.length && !filters.labels.some((l) => c.labelIds.includes(l))) return false;
      if (filters.memberId && !c.memberIds.includes(filters.memberId)) return false;
      if (filters.due === "overdue" && !isOverdue(c.dueDate, c.completed)) return false;
      if (filters.due === "dueSoon" && !isDueSoon(c.dueDate, c.completed)) return false;
      if (filters.due === "noDate" && c.dueDate) return false;
      if (filters.due === "completed" && !c.completed) return false;
      return true;
    });
  }, [allCards, filters]);

  const cardsByList = useMemo(() => {
    const map: Record<string, typeof filteredCards> = {};
    lists.forEach((l) => {
      map[l.id] = filteredCards.filter((c) => c.listId === l.id).sort((a, b) => a.order - b.order);
    });
    return map;
  }, [filteredCards, lists]);

  function onDragEnd(result: DropResult) {
    if (isClient) return;
    const { source, destination, type } = result;
    if (!destination) return;
    if (type === "LIST") {
      if (source.index !== destination.index) moveList(boardId, source.index, destination.index);
      return;
    }
    const srcListId = source.droppableId;
    const destListId = destination.droppableId;
    // find dragged card id from source list visible order
    const srcVisible = cardsByList[srcListId] ?? [];
    const dragged = srcVisible[source.index];
    if (!dragged) return;
    // Map visible drop index to full-list index when filters are active
    moveCardWithFilter(dragged.id, srcListId, destListId, destination.index);
  }

  function moveCardWithFilter(cardId: string, srcListId: string, destListId: string, visibleDestIndex: number) {
    // Map visible index to full-list index: get full ordered list, find anchor card at visible position
    const fullDest = allCards
      .filter((c) => c.listId === destListId && !c.archived)
      .sort((a, b) => a.order - b.order);
    const visibleDest = cardsByList[destListId] ?? [];
    if (srcListId !== destListId) {
      // if dropping into filtered list, place relative to visible anchor
      if (visibleDest.length === 0) {
        moveCard(cardId, destListId, fullDest.length);
      } else if (visibleDestIndex >= visibleDest.length) {
        const anchor = visibleDest[visibleDest.length - 1];
        const anchorFullIdx = fullDest.findIndex((c) => c.id === anchor.id);
        moveCard(cardId, destListId, anchorFullIdx + 1);
      } else {
        const anchor = visibleDest[visibleDestIndex];
        const anchorFullIdx = fullDest.findIndex((c) => c.id === anchor.id);
        moveCard(cardId, destListId, Math.max(0, anchorFullIdx));
      }
    } else {
      moveCard(cardId, destListId, visibleDestIndex);
    }
  }

  return (
    <div className="flex h-full flex-col gap-3">
      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-2 rounded-xl bg-white p-3 shadow-sm">
        <div className="flex min-w-52 flex-1 items-center gap-2 rounded-lg bg-slate-100 px-3 py-2">
          <Search className="h-4 w-4 text-slate-500" />
          <input
            value={filters.search}
            onChange={(e) => setFilters({ search: e.target.value })}
            placeholder="Search tasks..."
            className="w-full bg-transparent text-sm outline-none"
          />
          {filters.search && (
            <button onClick={() => setFilters({ search: "" })} className="text-slate-400 hover:text-slate-600">
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        <div className="flex items-center gap-1">
          {(Object.keys(LABELS) as LabelColor[]).map((l) => (
            <button
              key={l}
              title={LABELS[l].name}
              onClick={() =>
                setFilters({
                  labels: filters.labels.includes(l) ? filters.labels.filter((x) => x !== l) : [...filters.labels, l],
                })
              }
              className={cn(
                "h-6 w-8 rounded-full transition ring-offset-1",
                LABELS[l].bg,
                filters.labels.includes(l) ? "ring-2 ring-slate-900 scale-105" : "opacity-40 hover:opacity-80"
              )}
            />
          ))}
          {filters.labels.length > 0 && (
            <button onClick={() => setFilters({ labels: [] })} className="ml-1 text-xs text-slate-500 hover:underline">
              clear
            </button>
          )}
        </div>
        <select
          value={filters.memberId ?? ""}
          onChange={(e) => setFilters({ memberId: e.target.value || null })}
          className="rounded-lg bg-slate-100 px-2 py-2 text-sm"
        >
          <option value="">All members</option>
          {users.map((u) => (
            <option key={u.id} value={u.id}>
              {u.name}
            </option>
          ))}
        </select>
        <select
          value={filters.due}
          onChange={(e) => setFilters({ due: e.target.value as typeof filters.due })}
          className="rounded-lg bg-slate-100 px-2 py-2 text-sm"
        >
          <option value="all">All dates</option>
          <option value="overdue">Overdue</option>
          <option value="dueSoon">Due soon</option>
          <option value="noDate">No date</option>
          <option value="completed">Completed</option>
        </select>
        <button
          onClick={() => setFilters({ showArchived: !filters.showArchived })}
          className={cn(
            "flex items-center gap-1 rounded-lg px-3 py-2 text-sm",
            filters.showArchived ? "bg-amber-100 text-amber-800" : "bg-slate-100 text-slate-600"
          )}
        >
          <Archive className="h-4 w-4" />
          {filters.showArchived ? "Archived" : "Active"}
        </button>
      </div>

      {/* Board */}
      <DragDropContext onDragEnd={onDragEnd}>
        <Droppable droppableId="board" type="LIST" direction="horizontal">
          {(provided) => (
            <div
              ref={provided.innerRef}
              {...provided.droppableProps}
              className="flex flex-1 items-start gap-3 overflow-x-auto pb-4"
            >
              {lists.map((list, listIndex) => {
                const cards = cardsByList[list.id] ?? [];
                return (
                  <Draggable key={list.id} draggableId={list.id} index={listIndex} isDragDisabled={isClient}>
                    {(lp) => (
                      <div
                        ref={lp.innerRef}
                        {...lp.draggableProps}
                        className="flex w-72 shrink-0 flex-col rounded-xl bg-slate-100/95 shadow-sm"
                      >
                        <div
                          {...lp.dragHandleProps}
                          className="flex items-center justify-between px-3 pt-3"
                        >
                          {editingListId === list.id ? (
                            <input
                              autoFocus
                              value={editingListTitle}
                              onChange={(e) => setEditingListTitle(e.target.value)}
                              onBlur={() => {
                                if (editingListTitle.trim()) updateList(list.id, editingListTitle.trim());
                                setEditingListId(null);
                              }}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  if (editingListTitle.trim()) updateList(list.id, editingListTitle.trim());
                                  setEditingListId(null);
                                }
                                if (e.key === "Escape") setEditingListId(null);
                              }}
                              className="w-full rounded bg-white px-2 py-1 text-sm font-semibold outline-none ring-2 ring-blue-500"
                            />
                          ) : (
                            <button
                              onClick={() => {
                                if (isClient) return;
                                setEditingListId(list.id);
                                setEditingListTitle(list.title);
                              }}
                              className="flex items-center gap-2 text-sm font-bold text-slate-700"
                            >
                              {list.title}
                              <span className="rounded-full bg-slate-200 px-2 py-0.5 text-xs font-medium text-slate-600">
                                {cards.length}
                              </span>
                            </button>
                          )}
                          {!isClient && (
                            <button
                              onClick={() => {
                                if (confirm(`Delete list "${list.title}" and all its cards?`)) deleteList(list.id);
                              }}
                              className="rounded p-1 text-slate-400 hover:bg-slate-200 hover:text-red-600"
                              title="Delete list"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          )}
                        </div>

                        <Droppable droppableId={list.id} type="CARD">
                          {(cp) => (
                            <div ref={cp.innerRef} {...cp.droppableProps} className="flex min-h-10 flex-col gap-2 p-2">
                              {cards.map((card, idx) => {
                                const done = checklist.filter((ch) => ch.cardId === card.id && ch.done).length;
                                const total = checklist.filter((ch) => ch.cardId === card.id).length;
                                const cmCount = comments.filter((cm) => cm.cardId === card.id).length;
                                const hours = timeLogs.filter((t) => t.cardId === card.id).reduce((s, t) => s + t.hours, 0);
                                const overdue = isOverdue(card.dueDate, card.completed);
                                return (
                                  <Draggable key={card.id} draggableId={card.id} index={idx} isDragDisabled={isClient}>
                                    {(dp) => (
                                      <div
                                        ref={dp.innerRef}
                                        {...dp.draggableProps}
                                        {...dp.dragHandleProps}
                                        onClick={() => setActiveCard(card.id)}
                                        className={cn(
                                          "group cursor-pointer rounded-lg bg-white p-3 shadow-sm ring-1 ring-slate-200 hover:ring-blue-400",
                                          card.completed && "opacity-80"
                                        )}
                                      >
                                        {card.labelIds.length > 0 && (
                                          <div className="mb-2 flex flex-wrap gap-1">
                                            {card.labelIds.map((l) => (
                                              <span key={l} title={LABELS[l].name} className={cn("h-2 w-10 rounded-full", LABELS[l].bg)} />
                                            ))}
                                          </div>
                                        )}
                                        <div className={cn("text-sm font-medium text-slate-800", card.completed && "line-through")}>
                                          {card.title}
                                        </div>
                                        <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-slate-500">
                                          {card.dueDate && (
                                            <span
                                              className={cn(
                                                "flex items-center gap-1 rounded px-1.5 py-0.5",
                                                overdue
                                                  ? "bg-red-100 text-red-700"
                                                  : card.completed
                                                    ? "bg-green-100 text-green-700"
                                                    : "bg-slate-100"
                                              )}
                                            >
                                              {overdue ? <AlertTriangle className="h-3 w-3" /> : <CalendarClock className="h-3 w-3" />}
                                              {formatDate(card.dueDate)}
                                            </span>
                                          )}
                                          {total > 0 && (
                                            <span className="flex items-center gap-1">
                                              <CheckSquare className="h-3 w-3" />
                                              {done}/{total}
                                            </span>
                                          )}
                                          {cmCount > 0 && (
                                            <span className="flex items-center gap-1">
                                              <MessageSquare className="h-3 w-3" />
                                              {cmCount}
                                            </span>
                                          )}
                                          {hours > 0 && (
                                            <span className="flex items-center gap-1">
                                              <Clock className="h-3 w-3" />
                                              {hours}h
                                            </span>
                                          )}
                                        </div>
                                        {card.memberIds.length > 0 && (
                                          <div className="mt-2 flex justify-end">
                                            <div className="flex -space-x-1.5">
                                              {card.memberIds.map((m) => (
                                                <Avatar key={m} userId={m} size="xs" />
                                              ))}
                                            </div>
                                          </div>
                                        )}
                                      </div>
                                    )}
                                  </Draggable>
                                );
                              })}
                              {cp.placeholder}
                              {!isClient && (
                                <>
                                  {newCardFor === list.id ? (
                                    <div className="rounded-lg bg-white p-2 shadow-sm">
                                      <textarea
                                        autoFocus
                                        value={newCardTitle}
                                        onChange={(e) => setNewCardTitle(e.target.value)}
                                        onKeyDown={(e) => {
                                          if (e.key === "Enter" && !e.shiftKey) {
                                            e.preventDefault();
                                            if (newCardTitle.trim()) {
                                              createCard(boardId, list.id, newCardTitle.trim());
                                              setNewCardTitle("");
                                            }
                                          }
                                          if (e.key === "Escape") {
                                            setNewCardFor(null);
                                            setNewCardTitle("");
                                          }
                                        }}
                                        placeholder="Task title... (Enter to add)"
                                        rows={2}
                                        className="w-full resize-none rounded bg-transparent text-sm outline-none"
                                      />
                                      <div className="mt-1 flex gap-1">
                                        <button
                                          onClick={() => {
                                            if (newCardTitle.trim()) createCard(boardId, list.id, newCardTitle.trim());
                                            setNewCardTitle("");
                                            setNewCardFor(null);
                                          }}
                                          className="rounded bg-blue-600 px-3 py-1 text-xs font-semibold text-white hover:bg-blue-700"
                                        >
                                          Add
                                        </button>
                                        <button
                                          onClick={() => {
                                            setNewCardFor(null);
                                            setNewCardTitle("");
                                          }}
                                          className="rounded px-2 py-1 text-xs text-slate-500 hover:bg-slate-100"
                                        >
                                          Cancel
                                        </button>
                                      </div>
                                    </div>
                                  ) : (
                                    <button
                                      onClick={() => setNewCardFor(list.id)}
                                      className="flex items-center gap-1 rounded-lg px-2 py-2 text-sm text-slate-500 hover:bg-slate-200"
                                    >
                                      <Plus className="h-4 w-4" /> Add a card
                                    </button>
                                  )}
                                </>
                              )}
                            </div>
                          )}
                        </Droppable>
                      </div>
                    )}
                  </Draggable>
                );
              })}
              {provided.placeholder}

              {!isClient && (
                <div className="w-72 shrink-0">
                  {addingList ? (
                    <div className="rounded-xl bg-slate-100 p-3 shadow-sm">
                      <input
                        autoFocus
                        value={newListTitle}
                        onChange={(e) => setNewListTitle(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && newListTitle.trim()) {
                            createList(boardId, newListTitle.trim());
                            setNewListTitle("");
                          }
                          if (e.key === "Escape") {
                            setAddingList(false);
                            setNewListTitle("");
                          }
                        }}
                        placeholder="List title..."
                        className="w-full rounded-lg bg-white px-3 py-2 text-sm outline-none ring-2 ring-blue-500"
                      />
                      <div className="mt-2 flex gap-2">
                        <button
                          onClick={() => {
                            if (newListTitle.trim()) createList(boardId, newListTitle.trim());
                            setNewListTitle("");
                            setAddingList(false);
                          }}
                          className="rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-blue-700"
                        >
                          Add list
                        </button>
                        <button
                          onClick={() => {
                            setAddingList(false);
                            setNewListTitle("");
                          }}
                          className="rounded-lg px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-200"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => setAddingList(true)}
                      className="flex w-full items-center gap-2 rounded-xl bg-white/20 px-4 py-3 text-sm font-medium text-white backdrop-blur hover:bg-white/30"
                    >
                      <Plus className="h-4 w-4" /> Add another list
                    </button>
                  )}
                </div>
              )}
            </div>
          )}
        </Droppable>
      </DragDropContext>
    </div>
  );
}
