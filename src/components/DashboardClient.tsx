"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Clock, AlertTriangle, CheckCircle2, TrendingUp } from "lucide-react";
import { useStore, useCurrentUser } from "@/lib/store";
import { isOverdue, cn } from "@/lib/utils";

export function DashboardClient() {
  const user = useCurrentUser();
  const ready = useStore((s) => s.ready);
  const boards = useStore((s) => s.boards);
  const cards = useStore((s) => s.cards);
  const lists = useStore((s) => s.lists);
  const timeLogs = useStore((s) => s.timeLogs);
  const activities = useStore((s) => s.activities);
  const users = useStore((s) => s.users);
  const router = useRouter();

  useEffect(() => {
    if (ready && !user) router.push("/login");
  }, [ready, user, router]);

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

  const visibleBoards = boards.filter((b) => {
    if (user.role === "admin") return !b.archived;
    return b.memberIds.includes(user.id) || b.clientIds.includes(user.id);
  });

  function stats(boardId: string) {
    const cs = cards.filter((c) => c.boardId === boardId && !c.archived);
    const boardLists = lists.filter((l) => l.boardId === boardId).sort((a, b) => a.order - b.order);
    const last = boardLists[boardLists.length - 1];
    const done = cs.filter((c) => c.completed || (last && c.listId === last.id)).length;
    const overdue = cs.filter((c) => isOverdue(c.dueDate, c.completed)).length;
    const hours = timeLogs.filter((t) => cs.some((c) => c.id === t.cardId)).reduce((s, t) => s + t.hours, 0);
    return { total: cs.length, done, pct: cs.length ? Math.round((done / cs.length) * 100) : 0, overdue, hours };
  }

  const totals = visibleBoards.reduce(
    (acc, b) => {
      const s = stats(b.id);
      return { total: acc.total + s.total, done: acc.done + s.done, overdue: acc.overdue + s.overdue, hours: acc.hours + s.hours };
    },
    { total: 0, done: 0, overdue: 0, hours: 0 }
  );
  const overallPct = totals.total ? Math.round((totals.done / totals.total) * 100) : 0;

  const recent = activities
    .filter((a) => visibleBoards.some((b) => b.id === a.boardId))
    .slice(0, 20);

  return (
    <div className="mx-auto max-w-7xl px-4 py-6">
      <div className="flex items-center gap-3">
        <h1 className="text-2xl font-extrabold">Client Progress</h1>
        {user.role === "client" && (
          <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-800">
            Shared with you · read-only
          </span>
        )}
      </div>
      <p className="mt-1 text-sm text-slate-500">
        Progress record across all {visibleBoards.length} boards — completion %, hours logged, overdue tasks.
      </p>

      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Overall completion", value: `${overallPct}%`, sub: `${totals.done}/${totals.total} tasks done`, icon: <TrendingUp className="h-5 w-5" />, bg: "bg-blue-600" },
          { label: "Hours logged", value: `${totals.hours}h`, sub: "billable work record", icon: <Clock className="h-5 w-5" />, bg: "bg-violet-600" },
          { label: "Overdue", value: `${totals.overdue}`, sub: "needs attention", icon: <AlertTriangle className="h-5 w-5" />, bg: "bg-red-500" },
          { label: "Tasks done", value: `${totals.done}`, sub: `of ${totals.total} total`, icon: <CheckCircle2 className="h-5 w-5" />, bg: "bg-emerald-600" },
        ].map((k) => (
          <div key={k.label} className="rounded-2xl bg-white p-4 shadow-sm">
            <div className={cn("grid h-10 w-10 place-items-center rounded-xl text-white", k.bg)}>{k.icon}</div>
            <div className="mt-2 text-2xl font-extrabold">{k.value}</div>
            <div className="text-xs font-semibold text-slate-500">{k.label}</div>
            <div className="text-xs text-slate-400">{k.sub}</div>
          </div>
        ))}
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-[1fr_340px]">
        <div className="flex flex-col gap-3">
          {visibleBoards.map((b) => {
            const s = stats(b.id);
            return (
              <Link key={b.id} href={`/boards/${b.id}`} className={cn("rounded-2xl bg-gradient-to-br p-5 text-white shadow-md hover:shadow-lg", b.background)}>
                <div className="flex items-center justify-between">
                  <h3 className="font-bold">{b.title}</h3>
                  <span className="text-2xl font-extrabold">{s.pct}%</span>
                </div>
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/25">
                  <div className="h-full bg-white" style={{ width: `${s.pct}%` }} />
                </div>
                <div className="mt-2 flex flex-wrap gap-3 text-xs text-white/85">
                  <span>{s.done}/{s.total} tasks</span>
                  <span>{s.hours}h logged</span>
                  <span className={s.overdue ? "font-bold text-yellow-200" : ""}>{s.overdue} overdue</span>
                </div>
              </Link>
            );
          })}
          {visibleBoards.length === 0 && (
            <div className="rounded-2xl bg-white p-8 text-center text-sm text-slate-500">No boards shared yet.</div>
          )}
        </div>

        <div className="rounded-2xl bg-white p-5 shadow-sm">
          <h3 className="font-bold">Activity · progress record</h3>
          <ul className="mt-3 flex max-h-[520px] flex-col gap-3 overflow-y-auto">
            {recent.map((a) => {
              const u = users.find((x) => x.id === a.userId);
              const b = boards.find((x) => x.id === a.boardId);
              return (
                <li key={a.id} className="rounded-xl bg-slate-50 p-3 text-xs">
                  <span className="font-semibold">{u?.name}</span> {a.text}
                  <div className="mt-1 text-[11px] text-slate-400">
                    {b?.title} · {new Date(a.createdAt).toLocaleString()}
                  </div>
                </li>
              );
            })}
            {recent.length === 0 && <li className="text-xs text-slate-400">No activity yet.</li>}
          </ul>
          <button
            onClick={() => window.print()}
            className="mt-4 w-full rounded-xl bg-slate-900 py-2 text-sm font-semibold text-white hover:bg-slate-700"
          >
            Print / Export progress report
          </button>
        </div>
      </div>
    </div>
  );
}
