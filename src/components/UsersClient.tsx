"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useStore, useCurrentUser } from "@/lib/store";
import { initials, cn } from "@/lib/utils";

export function UsersClient() {
  const user = useCurrentUser();
  const ready = useStore((s) => s.ready);
  const users = useStore((s) => s.users);
  const boards = useStore((s) => s.boards);
  const updateUserRole = useStore((s) => s.updateUserRole);
  const updateBoard = useStore((s) => s.updateBoard);
  const router = useRouter();
  const [shareBoardId, setShareBoardId] = useState<string>("");

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
  if (user.role !== "admin") {
    return <div className="mx-auto max-w-3xl px-4 py-10">Admins only. <button className="underline" onClick={() => router.push("/boards")}>Back</button></div>;
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-6">
      <h1 className="text-2xl font-extrabold">Team & clients</h1>
      <p className="mt-1 text-sm text-slate-500">Manage roles. Clients get read-only board access + progress dashboard.</p>

      <div className="mt-4 rounded-2xl bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-2">
          {users.map((u) => (
            <div key={u.id} className="flex items-center gap-3 rounded-xl bg-slate-50 p-3">
              <span className={cn("grid h-9 w-9 place-items-center rounded-full text-xs font-bold text-white", u.avatarColor)}>
                {initials(u.name)}
              </span>
              <div className="flex-1">
                <div className="text-sm font-bold">{u.name}</div>
                <div className="text-xs text-slate-500">{u.email}</div>
              </div>
              <select
                value={u.role}
                onChange={(e) => updateUserRole(u.id, e.target.value as typeof u.role)}
                disabled={u.id === user.id}
                className="rounded-lg bg-white px-2 py-1.5 text-sm shadow-sm"
              >
                <option value="admin">admin</option>
                <option value="member">member</option>
                <option value="client">client</option>
              </select>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-4 rounded-2xl bg-white p-5 shadow-sm">
        <h2 className="font-bold">Share a board with a client</h2>
        <div className="mt-2 flex flex-wrap gap-2">
          <select value={shareBoardId} onChange={(e) => setShareBoardId(e.target.value)} className="rounded-lg bg-slate-100 px-3 py-2 text-sm">
            <option value="">Select board...</option>
            {boards.map((b) => (
              <option key={b.id} value={b.id}>{b.title}</option>
            ))}
          </select>
        </div>
        {shareBoardId && (
          <div className="mt-3 flex flex-col gap-1">
            {users.filter((u) => u.role === "client").map((c) => {
              const b = boards.find((x) => x.id === shareBoardId)!;
              const shared = b.clientIds.includes(c.id);
              return (
                <label key={c.id} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={shared}
                    onChange={() =>
                      updateBoard(b.id, {
                        clientIds: shared ? b.clientIds.filter((id) => id !== c.id) : [...b.clientIds, c.id],
                      })
                    }
                  />
                  {c.name} ({c.email}) {shared ? "✓ shared" : ""}
                </label>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
