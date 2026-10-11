"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Pencil, Trash2, X, Check } from "lucide-react";
import { useStore, useCurrentUser } from "@/lib/store";
import { initials, cn } from "@/lib/utils";
import type { Role } from "@/lib/types";

export function UsersClient() {
  const user = useCurrentUser();
  const ready = useStore((s) => s.ready);
  const users = useStore((s) => s.users);
  const boards = useStore((s) => s.boards);
  const updateUserRole = useStore((s) => s.updateUserRole);
  const updateBoard = useStore((s) => s.updateBoard);
  const createUser = useStore((s) => s.createUser);
  const updateUser = useStore((s) => s.updateUser);
  const deleteUser = useStore((s) => s.deleteUser);
  const router = useRouter();
  const [shareBoardId, setShareBoardId] = useState<string>("");

  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<Role>("member");
  const [formError, setFormError] = useState<string | null>(null);
  const [formBusy, setFormBusy] = useState(false);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [rowError, setRowError] = useState<string | null>(null);
  const [rowInfo, setRowInfo] = useState<string | null>(null);

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

  async function submitNew(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    if (!name.trim() || !email.trim() || !password) {
      setFormError("Name, email and password are required");
      return;
    }
    setFormBusy(true);
    try {
      const err = await createUser(name.trim(), email.trim(), password, role);
      if (err) setFormError(err);
      else {
        setName("");
        setEmail("");
        setPassword("");
        setRole("member");
        setShowForm(false);
      }
    } finally {
      setFormBusy(false);
    }
  }

  function saveEdit(id: string) {
    if (!editName.trim() || !editEmail.trim()) {
      setRowError("Name and email cannot be empty");
      return;
    }
    setRowError(null);
    setRowInfo(null);
    const selfEmailChange =
      id === user?.id && editEmail.trim().toLowerCase() !== user?.email.toLowerCase();
    updateUser(id, { name: editName.trim(), email: editEmail.trim() });
    setEditingId(null);
    if (selfEmailChange) {
      setRowInfo(`Your login email is now ${editEmail.trim()} — use the new address next time you log in.`);
    }
  }

  async function remove(id: string, displayName: string) {
    if (!confirm(`Remove ${displayName}? Their board memberships are revoked; past comments and time logs keep their history.`))
      return;
    const err = await deleteUser(id);
    if (err) alert(err);
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-6">
      <div className="flex items-center gap-3">
        <div>
          <h1 className="text-2xl font-extrabold">Team & clients</h1>
          <p className="mt-1 text-sm text-slate-500">Add, edit, remove. Clients get read-only board access + progress dashboard.</p>
        </div>
        <button
          onClick={() => {
            setShowForm(!showForm);
            setFormError(null);
          }}
          className="ml-auto flex items-center gap-1 rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700"
        >
          {showForm ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
          {showForm ? "Cancel" : "Add user"}
        </button>
      </div>

      {showForm && (
        <form onSubmit={submitNew} className="mt-4 grid gap-2 rounded-2xl bg-white p-5 shadow-sm md:grid-cols-[1fr_1fr_1fr_140px_auto]">
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Full name" className="rounded-xl bg-slate-100 px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500" />
          <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" type="email" className="rounded-xl bg-slate-100 px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500" />
          <input value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password (min 6)" type="password" className="rounded-xl bg-slate-100 px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500" />
          <select value={role} onChange={(e) => setRole(e.target.value as Role)} className="rounded-xl bg-slate-100 px-3 py-2.5 text-sm outline-none">
            <option value="member">member</option>
            <option value="admin">admin</option>
            <option value="client">client</option>
          </select>
          <button disabled={formBusy} className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60">
            {formBusy ? "Adding..." : "Create"}
          </button>
          {formError && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600 md:col-span-5">{formError}</p>}
        </form>
      )}

      <div className="mt-4 rounded-2xl bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-2">
          {users.map((u) => {
            const isSelf = u.id === user.id;
            const editing = editingId === u.id;
            return (
              <div key={u.id} className="flex items-center gap-3 rounded-xl bg-slate-50 p-3">
                <span className={cn("grid h-9 w-9 shrink-0 place-items-center rounded-full text-xs font-bold text-white", u.avatarColor)}>
                  {initials(editing ? editName || u.name : u.name)}
                </span>
                <div className="min-w-0 flex-1">
                  {editing ? (
                    <div className="flex flex-col gap-1 sm:flex-row sm:gap-2">
                      <input value={editName} onChange={(e) => setEditName(e.target.value)} className="w-full rounded-lg bg-white px-2 py-1 text-sm shadow-sm outline-none focus:ring-2 focus:ring-blue-500" />
                      <input value={editEmail} onChange={(e) => setEditEmail(e.target.value)} className="w-full rounded-lg bg-white px-2 py-1 text-sm shadow-sm outline-none focus:ring-2 focus:ring-blue-500" />
                    </div>
                  ) : (
                    <>
                      <div className="truncate text-sm font-bold">{u.name}{isSelf && <span className="ml-2 text-[11px] font-medium text-slate-400">(you)</span>}</div>
                      <div className="truncate text-xs text-slate-500">{u.email}</div>
                    </>
                  )}
                </div>
                {editing ? (
                  <>
                    <button onClick={() => saveEdit(u.id)} className="rounded-lg bg-green-600 p-2 text-white hover:bg-green-700" title="Save">
                      <Check className="h-4 w-4" />
                    </button>
                    <button onClick={() => { setEditingId(null); setRowError(null); }} className="rounded-lg bg-slate-200 p-2 text-slate-600 hover:bg-slate-300" title="Cancel">
                      <X className="h-4 w-4" />
                    </button>
                  </>
                ) : (
                  <>
                    <select
                      value={u.role}
                      onChange={(e) => updateUserRole(u.id, e.target.value as typeof u.role)}
                      disabled={isSelf}
                      title={isSelf ? "You cannot change your own role" : "Change role"}
                      className="rounded-lg bg-white px-2 py-1.5 text-sm shadow-sm"
                    >
                      <option value="admin">admin</option>
                      <option value="member">member</option>
                      <option value="client">client</option>
                    </select>
                    <button
                      onClick={() => {
                        setEditName(u.name);
                        setEditEmail(u.email);
                        setEditingId(u.id);
                        setRowError(null);
                        setRowInfo(null);
                      }}
                      className="rounded-lg bg-white p-2 text-slate-500 shadow-sm hover:text-blue-600"
                      title="Edit name/email"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => void remove(u.id, u.name)}
                      disabled={isSelf}
                      className="rounded-lg bg-white p-2 text-slate-500 shadow-sm hover:text-red-600 disabled:opacity-40"
                      title={isSelf ? "You cannot delete your own account" : "Remove user"}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </>
                )}
              </div>
            );
          })}
          {rowError && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{rowError}</p>}
          {rowInfo && <p className="rounded-lg bg-blue-50 px-3 py-2 text-sm text-blue-700">{rowInfo}</p>}
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
