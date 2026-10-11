"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus, Star, Search, Trash2, Users as UsersIcon } from "lucide-react";
import { useStore, useCurrentUser } from "@/lib/store";
import { BOARD_GRADIENTS, cn } from "@/lib/utils";
import { Avatar } from "@/components/Avatar";

export function BoardsClient() {
  const user = useCurrentUser();
  const ready = useStore((s) => s.ready);
  const boards = useStore((s) => s.boards);
  const cards = useStore((s) => s.cards);
  const lists = useStore((s) => s.lists);
  const createBoard = useStore((s) => s.createBoard);
  const updateBoard = useStore((s) => s.updateBoard);
  const deleteBoard = useStore((s) => s.deleteBoard);
  const router = useRouter();

  const [q, setQ] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [bg, setBg] = useState(BOARD_GRADIENTS[0]);
  const [showArchived, setShowArchived] = useState(false);

  useEffect(() => {
    if (ready && !user) router.push("/login");
  }, [ready, user, router]);

  const visible = useMemo(() => {
    return boards.filter((b) => {
      if (!user) return false;
      const isMember = b.memberIds.includes(user.id) || b.clientIds.includes(user.id) || user.role === "admin";
      if (!isMember) return false;
      if (!showArchived && b.archived) return false;
      if (showArchived && !b.archived) return false;
      if (q && !`${b.title} ${b.description}`.toLowerCase().includes(q.toLowerCase())) return false;
      return true;
    });
  }, [boards, user, q, showArchived]);

  if (!ready) {
    return (
      <div className="grid min-h-[50vh] place-items-center text-sm text-slate-500">
        Loading workspace...
      </div>
    );
  }
  if (!user) {
    return (
      <div className="grid min-h-[50vh] place-items-center text-sm text-slate-500">
        Redirecting to login...
      </div>
    );
  }

  function progress(boardId: string) {
    const cs = cards.filter((c) => c.boardId === boardId && !c.archived);
    if (!cs.length) return 0;
    const boardLists = lists.filter((l) => l.boardId === boardId).sort((a, b) => a.order - b.order);
    const last = boardLists[boardLists.length - 1];
    const done = cs.filter((c) => c.completed || (last && c.listId === last.id)).length;
    return Math.round((done / cs.length) * 100);
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-6">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-extrabold text-slate-900">Boards</h1>
        <span className="rounded-full bg-white px-2 py-0.5 text-xs text-slate-500 shadow-sm">{visible.length}</span>
        <div className="ml-auto flex items-center gap-2">
          <div className="flex items-center gap-2 rounded-xl bg-white px-3 py-2 shadow-sm">
            <Search className="h-4 w-4 text-slate-400" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search boards..." className="bg-transparent text-sm outline-none" />
          </div>
          <button onClick={() => setShowArchived(!showArchived)} className="rounded-xl bg-white px-3 py-2 text-sm shadow-sm hover:bg-slate-50">
            {showArchived ? "Archived" : "Active"}
          </button>
          {user.role !== "client" && (
            <button onClick={() => setShowForm(!showForm)} className="flex items-center gap-1 rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700">
              <Plus className="h-4 w-4" /> New board
            </button>
          )}
        </div>
      </div>

      {showForm && (
        <div className="mt-4 rounded-2xl bg-white p-5 shadow-sm">
          <h2 className="font-bold">Create board</h2>
          <div className="mt-3 grid gap-3 md:grid-cols-2">
            <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Board title e.g. Website for Client X" className="rounded-xl bg-slate-100 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-500" />
            <input value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="Short description / client notes" className="rounded-xl bg-slate-100 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div className="mt-3 flex items-center gap-2">
            {BOARD_GRADIENTS.map((g) => (
              <button key={g} onClick={() => setBg(g)} className={cn("h-10 w-16 rounded-lg bg-gradient-to-br", g, bg === g ? "ring-2 ring-slate-900 ring-offset-2" : "opacity-70 hover:opacity-100")} />
            ))}
          </div>
          <div className="mt-3 flex gap-2">
            <button
              onClick={() => {
                if (!title.trim()) return;
                const id = createBoard(title.trim(), desc.trim(), bg);
                setTitle(""); setDesc(""); setShowForm(false);
                router.push(`/boards/${id}`);
              }}
              className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
            >
              Create & open
            </button>
            <button onClick={() => setShowForm(false)} className="text-sm text-slate-500 hover:underline">Cancel</button>
          </div>
        </div>
      )}

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {visible.map((b) => {
          const pct = progress(b.id);
          const count = cards.filter((c) => c.boardId === b.id && !c.archived).length;
          return (
            <div key={b.id} className={cn("group relative overflow-hidden rounded-2xl bg-gradient-to-br p-5 text-white shadow-md hover:shadow-xl", b.background)}>
              <div className="flex items-start justify-between">
                <Link href={`/boards/${b.id}`} className="flex-1">
                  <h3 className="text-lg font-bold leading-snug hover:underline">{b.title}</h3>
                  <p className="mt-1 line-clamp-2 text-xs text-white/80">{b.description || "No description"}</p>
                </Link>
                <button
                  onClick={() => updateBoard(b.id, { favorite: !b.favorite })}
                  className={cn("rounded-lg p-1.5", b.favorite ? "text-yellow-300" : "text-white/40 hover:text-white")}
                  title="Favorite"
                >
                  <Star className={cn("h-4 w-4", b.favorite && "fill-yellow-300")} />
                </button>
              </div>
              <div className="mt-4">
                <div className="flex justify-between text-[11px] text-white/80">
                  <span>{pct}% complete · {count} tasks</span>
                </div>
                <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-white/25">
                  <div className="h-full rounded-full bg-white" style={{ width: `${pct}%` }} />
                </div>
              </div>
              <div className="mt-4 flex items-center">
                <div className="flex -space-x-1.5">
                  {[...b.memberIds, ...b.clientIds].slice(0, 5).map((m) => (
                    <Avatar key={m} userId={m} size="sm" />
                  ))}
                </div>
                {user.role !== "client" && (
                  <div className="ml-auto flex gap-1 opacity-0 transition group-hover:opacity-100">
                    <button
                      onClick={() => {
                        if (confirm(`Archive board "${b.title}"?`)) updateBoard(b.id, { archived: !b.archived });
                      }}
                      className="rounded-lg bg-white/20 px-2 py-1 text-[11px] hover:bg-white/30"
                    >
                      {b.archived ? "Restore" : "Archive"}
                    </button>
                    <button
                      onClick={() => {
                        if (confirm(`Delete board "${b.title}" permanently?`)) deleteBoard(b.id);
                      }}
                      className="rounded-lg bg-white/20 p-1.5 hover:bg-red-500"
                      title="Delete"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                )}
              </div>
              {b.clientIds.length > 0 && (
                <div className="mt-2 flex items-center gap-1 text-[11px] text-white/70">
                  <UsersIcon className="h-3 w-3" /> Shared with client
                </div>
              )}
            </div>
          );
        })}
      </div>

      {visible.length === 0 && (
        <div className="mt-10 rounded-2xl bg-white p-10 text-center shadow-sm">
          <p className="font-semibold">No boards found</p>
          <p className="mt-1 text-sm text-slate-500">Create your first client board to get started.</p>
        </div>
      )}
    </div>
  );
}
