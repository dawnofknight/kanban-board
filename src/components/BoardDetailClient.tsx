"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Star, Users, Settings2, Download } from "lucide-react";
import { useStore, useCurrentUser } from "@/lib/store";
import { KanbanBoard } from "@/components/KanbanBoard";
import { CardModal } from "@/components/CardModal";
import { cn } from "@/lib/utils";
import { downloadJson, slugify } from "@/lib/download";
import { Avatar } from "@/components/Avatar";

export function BoardDetailClient({ boardId }: { boardId: string }) {
  const board = useStore((s) => s.boards.find((b) => b.id === boardId));
  const users = useStore((s) => s.users);
  const allCards = useStore((s) => s.cards);
  const allActivities = useStore((s) => s.activities);
  const cards = useMemo(
    () => allCards.filter((c) => c.boardId === boardId && !c.archived),
    [allCards, boardId]
  );
  const activities = useMemo(
    () => allActivities.filter((a) => a.boardId === boardId).slice(0, 8),
    [allActivities, boardId]
  );
  const updateBoard = useStore((s) => s.updateBoard);
  const currentUser = useCurrentUser();
  const ready = useStore((s) => s.ready);
  const router = useRouter();

  const [showSettings, setShowSettings] = useState(false);
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");

  useEffect(() => {
    if (ready && !currentUser) router.push("/login");
  }, [ready, currentUser, router]);

  if (!ready) {
    return (
      <div className="grid min-h-[50vh] place-items-center text-sm text-slate-500">
        Loading workspace...
      </div>
    );
  }
  if (!currentUser) {
    return (
      <div className="grid min-h-[50vh] place-items-center text-sm text-white/80">
        Redirecting to login...
      </div>
    );
  }
  if (!board) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-10 text-center">
        <p className="font-bold">Board not found</p>
        <Link href="/boards" className="text-blue-600 hover:underline">Back to boards</Link>
      </div>
    );
  }

  const done = cards.filter((c) => c.completed).length;
  const pct = cards.length ? Math.round((done / cards.length) * 100) : 0;
  const isClient = currentUser.role === "client";

  return (
    <div className={cn("flex min-h-[calc(100vh-64px)] flex-col bg-gradient-to-br", board.background)}>
      <div className="mx-auto w-full max-w-7xl px-4 pt-4">
        <div className="flex flex-wrap items-center gap-3 rounded-2xl bg-black/25 p-3 text-white backdrop-blur">
          <Link href="/boards" className="rounded-lg bg-white/15 p-2 hover:bg-white/25">
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h1 className="truncate text-lg font-bold">{board.title}</h1>
              <button onClick={() => updateBoard(board.id, { favorite: !board.favorite })}>
                <Star className={cn("h-4 w-4", board.favorite ? "fill-yellow-300 text-yellow-300" : "text-white/60")} />
              </button>
            </div>
            <p className="truncate text-xs text-white/70">{board.description} · {pct}% done ({done}/{cards.length})</p>
          </div>
          <div className="flex -space-x-1.5">
            {[...board.memberIds, ...board.clientIds].map((m) => (
              <Avatar key={m} userId={m} size="sm" />
            ))}
          </div>
          {!isClient && (
            <button
              onClick={() => {
                setTitle(board.title);
                setDesc(board.description);
                setShowSettings(!showSettings);
              }}
              className="flex items-center gap-1 rounded-lg bg-white/15 px-3 py-2 text-xs font-semibold hover:bg-white/25"
            >
              <Settings2 className="h-4 w-4" /> Board settings
            </button>
          )}
          <button
            onClick={() =>
              downloadJson(
                `/api/export?boardId=${board.id}`,
                `taskboard-${slugify(board.title)}-${new Date().toISOString().slice(0, 10)}.json`
              )
            }
            className="flex items-center gap-1 rounded-lg bg-white/15 px-3 py-2 text-xs font-semibold hover:bg-white/25"
            title="Download this board as JSON"
          >
            <Download className="h-4 w-4" /> Export
          </button>
          {isClient && (
            <span className="rounded-full bg-emerald-400/20 px-3 py-1 text-xs font-semibold text-emerald-100 ring-1 ring-emerald-200/40">
              Client view · read-only
            </span>
          )}
        </div>

        {showSettings && !isClient && (
          <div className="mt-3 grid gap-3 rounded-2xl bg-white p-4 shadow-lg md:grid-cols-[1fr_1fr_220px]">
            <div>
              <label className="text-xs font-bold text-slate-500">TITLE</label>
              <input value={title} onChange={(e) => setTitle(e.target.value)} className="mt-1 w-full rounded-lg bg-slate-100 px-3 py-2 text-sm outline-none" />
              <label className="mt-2 block text-xs font-bold text-slate-500">DESCRIPTION</label>
              <input value={desc} onChange={(e) => setDesc(e.target.value)} className="mt-1 w-full rounded-lg bg-slate-100 px-3 py-2 text-sm outline-none" />
              <button
                onClick={() => {
                  updateBoard(board.id, { title: title || board.title, description: desc });
                  setShowSettings(false);
                }}
                className="mt-2 rounded-lg bg-slate-900 px-4 py-2 text-xs font-bold text-white"
              >
                Save
              </button>
            </div>
            <div>
              <p className="text-xs font-bold text-slate-500">TEAM MEMBERS</p>
              <div className="mt-1 flex max-h-40 flex-col gap-1 overflow-y-auto">
                {users.filter((u) => u.role !== "client").map((u) => (
                  <label key={u.id} className="flex items-center gap-2 rounded px-2 py-1 text-sm hover:bg-slate-100">
                    <input
                      type="checkbox"
                      checked={board.memberIds.includes(u.id)}
                      onChange={() => {
                        const has = board.memberIds.includes(u.id);
                        updateBoard(board.id, {
                          memberIds: has ? board.memberIds.filter((m) => m !== u.id) : [...board.memberIds, u.id],
                        });
                      }}
                    />
                    {u.name} <span className="text-xs text-slate-400">({u.role})</span>
                  </label>
                ))}
              </div>
            </div>
            <div>
              <p className="flex items-center gap-1 text-xs font-bold text-slate-500"><Users className="h-3 w-3" /> SHARE WITH CLIENT</p>
              <div className="mt-1 flex max-h-40 flex-col gap-1 overflow-y-auto">
                {users.filter((u) => u.role === "client").map((u) => (
                  <label key={u.id} className="flex items-center gap-2 rounded px-2 py-1 text-sm hover:bg-slate-100">
                    <input
                      type="checkbox"
                      checked={board.clientIds.includes(u.id)}
                      onChange={() => {
                        const has = board.clientIds.includes(u.id);
                        updateBoard(board.id, {
                          clientIds: has ? board.clientIds.filter((m) => m !== u.id) : [...board.clientIds, u.id],
                        });
                      }}
                    />
                    {u.name}
                  </label>
                ))}
                {users.filter((u) => u.role === "client").length === 0 && (
                  <p className="text-xs text-slate-400">No client accounts yet. Create one in Team page.</p>
                )}
              </div>
            </div>
          </div>
        )}

        <div className="mt-3 pb-6">
          <KanbanBoard boardId={board.id} />
          {activities.length > 0 && (
            <div className="mt-3 rounded-2xl bg-black/25 p-4 text-white backdrop-blur">
              <h3 className="text-xs font-bold uppercase text-white/70">Recent activity · progress record</h3>
              <ul className="mt-2 space-y-1 text-xs text-white/90">
                {activities.map((a) => {
                  const u = users.find((x) => x.id === a.userId);
                  return (
                    <li key={a.id}>
                      <span className="font-semibold">{u?.name}</span> {a.text} ·{" "}
                      <span className="text-white/60">{new Date(a.createdAt).toLocaleString()}</span>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </div>
      </div>
      <CardModal />
    </div>
  );
}
