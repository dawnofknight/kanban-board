"use client";

import { useMemo, useState } from "react";
import { X, Tag, Users, Calendar, CheckSquare, MessageSquare, Clock, Trash2, Archive, Copy, Plus } from "lucide-react";
import { useStore, useCurrentUser } from "@/lib/store";
import { LABELS, type LabelColor } from "@/lib/types";
import { cn, formatDateTime, formatDate } from "@/lib/utils";
import { Avatar } from "./Avatar";

export function CardModal() {
  const activeCardId = useStore((s) => s.activeCardId);
  const allCards = useStore((s) => s.cards);
  const allBoards = useStore((s) => s.boards);
  const allLists = useStore((s) => s.lists);
  const users = useStore((s) => s.users);
  const allChecklist = useStore((s) => s.checklist);
  const allComments = useStore((s) => s.comments);
  const allTimeLogs = useStore((s) => s.timeLogs);
  const card = useMemo(
    () => allCards.find((c) => c.id === activeCardId) ?? null,
    [allCards, activeCardId]
  );
  const cardBoardId = card?.boardId;
  const cardListId = card?.listId;
  const board = useMemo(
    () => allBoards.find((b) => b.id === cardBoardId) ?? null,
    [allBoards, cardBoardId]
  );
  const list = useMemo(
    () => allLists.find((l) => l.id === cardListId) ?? null,
    [allLists, cardListId]
  );
  const checklist = useMemo(
    () => allChecklist.filter((ch) => ch.cardId === activeCardId),
    [allChecklist, activeCardId]
  );
  const comments = useMemo(
    () =>
      allComments
        .filter((c) => c.cardId === activeCardId)
        .sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt)),
    [allComments, activeCardId]
  );
  const timeLogs = useMemo(
    () =>
      allTimeLogs
        .filter((t) => t.cardId === activeCardId)
        .sort((a, b) => +new Date(b.date) - +new Date(a.date)),
    [allTimeLogs, activeCardId]
  );

  const setActiveCard = useStore((s) => s.setActiveCard);
  const updateCard = useStore((s) => s.updateCard);
  const deleteCard = useStore((s) => s.deleteCard);
  const archiveCard = useStore((s) => s.archiveCard);
  const toggleLabel = useStore((s) => s.toggleLabel);
  const addChecklistItem = useStore((s) => s.addChecklistItem);
  const toggleChecklistItem = useStore((s) => s.toggleChecklistItem);
  const deleteChecklistItem = useStore((s) => s.deleteChecklistItem);
  const addComment = useStore((s) => s.addComment);
  const deleteComment = useStore((s) => s.deleteComment);
  const addTimeLog = useStore((s) => s.addTimeLog);
  const deleteTimeLog = useStore((s) => s.deleteTimeLog);
  const createCard = useStore((s) => s.createCard);

  const currentUser = useCurrentUser();
  const isClient = currentUser?.role === "client";

  const [editingTitle, setEditingTitle] = useState(false);
  const [desc, setDesc] = useState("");
  const [editingDesc, setEditingDesc] = useState(false);
  const [newCheck, setNewCheck] = useState("");
  const [newComment, setNewComment] = useState("");
  const [hours, setHours] = useState("");
  const [timeNote, setTimeNote] = useState("");
  const [timeDate, setTimeDate] = useState(new Date().toISOString().slice(0, 10));

  if (!card || !activeCardId) return null;

  const doneCount = checklist.filter((c) => c.done).length;
  const pct = checklist.length ? Math.round((doneCount / checklist.length) * 100) : 0;
  const totalHours = timeLogs.reduce((s, t) => s + t.hours, 0);

  const close = () => {
    setEditingTitle(false);
    setEditingDesc(false);
    setActiveCard(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-4" onClick={close}>
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-3xl rounded-2xl bg-slate-100 shadow-2xl"
      >
        {/* header */}
        <div className="flex items-start gap-3 rounded-t-2xl bg-white p-5">
          <div className="flex-1">
            {editingTitle && !isClient ? (
              <input
                autoFocus
                defaultValue={card.title}
                onBlur={(e) => {
                  if (e.target.value.trim()) updateCard(card.id, { title: e.target.value.trim() });
                  setEditingTitle(false);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") (e.target as HTMLInputElement).blur();
                  if (e.key === "Escape") setEditingTitle(false);
                }}
                className="w-full rounded-lg border px-3 py-2 text-lg font-bold outline-none ring-2 ring-blue-500"
              />
            ) : (
              <h2
                onClick={() => !isClient && setEditingTitle(true)}
                className={cn("text-lg font-bold text-slate-900", !isClient && "cursor-pointer hover:underline")}
              >
                {card.title}
              </h2>
            )}
            <p className="mt-1 text-xs text-slate-500">
              in list <span className="font-semibold">{list?.title}</span>
              {board && <> · board <span className="font-semibold">{board.title}</span></>}
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              {card.labelIds.map((l) => (
                <span key={l} className={cn("rounded px-2 py-0.5 text-[11px] font-semibold text-white", LABELS[l].bg)}>
                  {LABELS[l].name}
                </span>
              ))}
              {card.dueDate && (
                <span className="rounded bg-slate-100 px-2 py-0.5 text-[11px] text-slate-600">
                  Due {formatDate(card.dueDate)} {card.completed ? "· Done ✓" : ""}
                </span>
              )}
            </div>
          </div>
          <button onClick={close} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="grid gap-4 p-5 md:grid-cols-[1fr_240px]">
          {/* main */}
          <div className="flex flex-col gap-5">
            {/* members + due + complete */}
            <div className="flex flex-wrap items-center gap-4">
              {card.memberIds.length > 0 && (
                <div>
                  <div className="mb-1 text-[11px] font-bold uppercase text-slate-500">Members</div>
                  <div className="flex -space-x-1">
                    {card.memberIds.map((m) => (
                      <Avatar key={m} userId={m} size="md" />
                    ))}
                  </div>
                </div>
              )}
              {!isClient && (
                <label className="flex items-center gap-2 rounded-lg bg-white px-3 py-2 text-sm shadow-sm">
                  <input
                    type="checkbox"
                    checked={card.completed}
                    onChange={(e) => updateCard(card.id, { completed: e.target.checked })}
                    className="h-4 w-4 accent-green-600"
                  />
                  <span className="font-medium">Completed</span>
                </label>
              )}
              <div className="ml-auto text-sm font-semibold text-slate-600">{totalHours}h logged</div>
            </div>

            {/* description */}
            <section>
              <h3 className="mb-2 text-sm font-bold text-slate-700">Description</h3>
              {editingDesc && !isClient ? (
                <div>
                  <textarea
                    autoFocus
                    defaultValue={card.description}
                    onChange={(e) => setDesc(e.target.value)}
                    rows={4}
                    placeholder="Add a more detailed description..."
                    className="w-full rounded-lg bg-white p-3 text-sm shadow-sm outline-none ring-2 ring-blue-500"
                  />
                  <div className="mt-2 flex gap-2">
                    <button
                      onClick={() => {
                        updateCard(card.id, { description: desc });
                        setEditingDesc(false);
                      }}
                      className="rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-semibold text-white"
                    >
                      Save
                    </button>
                    <button onClick={() => setEditingDesc(false)} className="text-sm text-slate-500 hover:underline">
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => {
                    if (isClient) return;
                    setDesc(card.description);
                    setEditingDesc(true);
                  }}
                  className="w-full rounded-lg bg-white p-3 text-left text-sm text-slate-700 shadow-sm hover:bg-slate-50"
                >
                  {card.description || <span className="text-slate-400">Add a description...</span>}
                </button>
              )}
            </section>

            {/* checklist */}
            <section>
              <div className="mb-2 flex items-center justify-between">
                <h3 className="flex items-center gap-1 text-sm font-bold text-slate-700">
                  <CheckSquare className="h-4 w-4" /> Checklist {checklist.length > 0 && `${doneCount}/${checklist.length} · ${pct}%`}
                </h3>
              </div>
              {checklist.length > 0 && (
                <div className="mb-2 h-2 overflow-hidden rounded-full bg-slate-200">
                  <div className="h-full bg-green-500 transition-all" style={{ width: `${pct}%` }} />
                </div>
              )}
              <div className="flex flex-col gap-1">
                {checklist.map((ch) => (
                  <div key={ch.id} className="group flex items-center gap-2 rounded-lg bg-white px-3 py-2 text-sm shadow-sm">
                    <input
                      type="checkbox"
                      checked={ch.done}
                      disabled={isClient}
                      onChange={() => toggleChecklistItem(ch.id)}
                      className="h-4 w-4 accent-blue-600"
                    />
                    <span className={cn("flex-1", ch.done && "text-slate-400 line-through")}>{ch.text}</span>
                    {!isClient && (
                      <button onClick={() => deleteChecklistItem(ch.id)} className="hidden text-slate-300 hover:text-red-500 group-hover:block">
                        <X className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
              {!isClient && (
                <div className="mt-2 flex gap-2">
                  <input
                    value={newCheck}
                    onChange={(e) => setNewCheck(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && newCheck.trim()) {
                        addChecklistItem(card.id, newCheck.trim());
                        setNewCheck("");
                      }
                    }}
                    placeholder="Add checklist item..."
                    className="flex-1 rounded-lg bg-white px-3 py-2 text-sm shadow-sm outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <button
                    onClick={() => {
                      if (newCheck.trim()) {
                        addChecklistItem(card.id, newCheck.trim());
                        setNewCheck("");
                      }
                    }}
                    className="rounded-lg bg-slate-200 px-3 py-2 text-sm font-semibold hover:bg-slate-300"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </div>
              )}
            </section>

            {/* time logs */}
            <section>
              <h3 className="mb-2 flex items-center gap-1 text-sm font-bold text-slate-700">
                <Clock className="h-4 w-4" /> Time log · {totalHours}h total
              </h3>
              <div className="flex flex-col gap-1">
                {timeLogs.map((t) => {
                  const u = users.find((x) => x.id === t.userId);
                  return (
                    <div key={t.id} className="flex items-center gap-2 rounded-lg bg-white px-3 py-2 text-sm shadow-sm">
                      <span className="rounded bg-blue-100 px-2 py-0.5 text-xs font-bold text-blue-800">{t.hours}h</span>
                      <span className="flex-1">
                        {t.note} <span className="text-xs text-slate-400">· {u?.name ?? "Removed user"} · {t.date}</span>
                      </span>
                      {!isClient && (
                        <button onClick={() => deleteTimeLog(t.id)} className="text-slate-300 hover:text-red-500">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  );
                })}
                {timeLogs.length === 0 && <p className="text-xs text-slate-400">No time logged yet.</p>}
              </div>
              {!isClient && (
                <div className="mt-2 grid grid-cols-[80px_1fr_130px_auto] gap-2">
                  <input
                    value={hours}
                    onChange={(e) => setHours(e.target.value)}
                    type="number"
                    min="0"
                    step="0.5"
                    placeholder="Hours"
                    className="rounded-lg bg-white px-2 py-2 text-sm shadow-sm outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <input
                    value={timeNote}
                    onChange={(e) => setTimeNote(e.target.value)}
                    placeholder="What did you work on?"
                    className="rounded-lg bg-white px-3 py-2 text-sm shadow-sm outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <input
                    value={timeDate}
                    onChange={(e) => setTimeDate(e.target.value)}
                    type="date"
                    className="rounded-lg bg-white px-2 py-2 text-sm shadow-sm outline-none"
                  />
                  <button
                    onClick={() => {
                      const h = parseFloat(hours);
                      if (!h || h <= 0) return alert("Enter hours > 0");
                      addTimeLog(card.id, h, timeNote || "Worked on task", timeDate);
                      setHours("");
                      setTimeNote("");
                    }}
                    className="rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-700"
                  >
                    Log
                  </button>
                </div>
              )}
            </section>

            {/* comments */}
            <section>
              <h3 className="mb-2 flex items-center gap-1 text-sm font-bold text-slate-700">
                <MessageSquare className="h-4 w-4" /> Comments · client-visible
              </h3>
              <div className="mb-2 flex gap-2">
                <input
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && newComment.trim()) {
                      addComment(card.id, newComment.trim());
                      setNewComment("");
                    }
                  }}
                  placeholder={isClient ? "Leave feedback for the team..." : "Write a comment..."}
                  className="flex-1 rounded-lg bg-white px-3 py-2 text-sm shadow-sm outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  onClick={() => {
                    if (newComment.trim()) {
                      addComment(card.id, newComment.trim());
                      setNewComment("");
                    }
                  }}
                  className="rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white"
                >
                  Send
                </button>
              </div>
              <div className="flex flex-col gap-2">
                {comments.map((c) => {
                  const u = users.find((x) => x.id === c.userId);
                  return (
                    <div key={c.id} className="rounded-lg bg-white p-3 text-sm shadow-sm">
                      <div className="mb-1 flex items-center gap-2">
                        <span className="font-semibold">{u?.name ?? "Removed user"}</span>
                        {u && (
                          <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] uppercase text-slate-500">{u.role}</span>
                        )}
                        <span className="ml-auto text-[11px] text-slate-400">{formatDateTime(c.createdAt)}</span>
                        {currentUser?.id === c.userId && (
                          <button onClick={() => deleteComment(c.id)} className="text-slate-300 hover:text-red-500">
                            <Trash2 className="h-3 w-3" />
                          </button>
                        )}
                      </div>
                      <p className="text-slate-700">{c.text}</p>
                    </div>
                  );
                })}
                {comments.length === 0 && <p className="text-xs text-slate-400">No comments yet.</p>}
              </div>
            </section>
          </div>

          {/* sidebar */}
          {!isClient && (
            <aside className="flex flex-col gap-2">
              <p className="text-[11px] font-bold uppercase text-slate-500">Add to card</p>
              <div className="rounded-xl bg-white p-3 shadow-sm">
                <p className="mb-2 flex items-center gap-1 text-xs font-semibold"><Tag className="h-3 w-3" /> Labels</p>
                <div className="flex flex-col gap-1">
                  {(Object.keys(LABELS) as LabelColor[]).map((l) => (
                    <button
                      key={l}
                      onClick={() => toggleLabel(card.id, l)}
                      className={cn(
                        "rounded px-2 py-1.5 text-left text-[11px] font-semibold text-white",
                        LABELS[l].bg,
                        !card.labelIds.includes(l) && "opacity-40 hover:opacity-70"
                      )}
                    >
                      {LABELS[l].name} {card.labelIds.includes(l) ? "✓" : ""}
                    </button>
                  ))}
                </div>
              </div>

              <div className="rounded-xl bg-white p-3 shadow-sm">
                <p className="mb-2 flex items-center gap-1 text-xs font-semibold"><Users className="h-3 w-3" /> Members</p>
                <div className="flex flex-col gap-1">
                  {users.filter((u) => u.role !== "client").map((u) => (
                    <label key={u.id} className="flex cursor-pointer items-center gap-2 rounded px-1 py-1 text-xs hover:bg-slate-100">
                      <input
                        type="checkbox"
                        checked={card.memberIds.includes(u.id)}
                        onChange={() => {
                          const has = card.memberIds.includes(u.id);
                          updateCard(card.id, {
                            memberIds: has ? card.memberIds.filter((m) => m !== u.id) : [...card.memberIds, u.id],
                          });
                        }}
                        className="accent-blue-600"
                      />
                      {u.name}
                    </label>
                  ))}
                </div>
              </div>

              <div className="rounded-xl bg-white p-3 shadow-sm">
                <p className="mb-2 flex items-center gap-1 text-xs font-semibold"><Calendar className="h-3 w-3" /> Due date</p>
                <input
                  type="date"
                  value={card.dueDate ? card.dueDate.slice(0, 10) : ""}
                  onChange={(e) => updateCard(card.id, { dueDate: e.target.value ? new Date(e.target.value).toISOString() : null })}
                  className="w-full rounded-lg bg-slate-100 px-2 py-1.5 text-xs outline-none"
                />
                {card.dueDate && (
                  <button onClick={() => updateCard(card.id, { dueDate: null })} className="mt-1 text-[11px] text-slate-500 hover:underline">
                    Remove date
                  </button>
                )}
              </div>

              <p className="mt-2 text-[11px] font-bold uppercase text-slate-500">Actions</p>
              <button
                onClick={() => {
                  const id = createCard(card.boardId, card.listId, `${card.title} (copy)`);
                  updateCard(id, { description: card.description, labelIds: card.labelIds, memberIds: card.memberIds, dueDate: card.dueDate });
                }}
                className="flex items-center gap-2 rounded-lg bg-white px-3 py-2 text-xs font-medium shadow-sm hover:bg-slate-50"
              >
                <Copy className="h-3 w-3" /> Copy card
              </button>
              <button
                onClick={() => {
                  archiveCard(card.id, !card.archived);
                  if (!card.archived) close();
                }}
                className="flex items-center gap-2 rounded-lg bg-white px-3 py-2 text-xs font-medium shadow-sm hover:bg-slate-50"
              >
                <Archive className="h-3 w-3" /> {card.archived ? "Restore" : "Archive"}
              </button>
              <button
                onClick={() => {
                  if (confirm("Delete this card permanently?")) {
                    deleteCard(card.id);
                  }
                }}
                className="flex items-center gap-2 rounded-lg bg-red-50 px-3 py-2 text-xs font-medium text-red-600 hover:bg-red-100"
              >
                <Trash2 className="h-3 w-3" /> Delete
              </button>
            </aside>
          )}
        </div>
      </div>
    </div>
  );
}
