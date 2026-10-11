"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { KanbanSquare } from "lucide-react";
import { useStore, useCurrentUser } from "@/lib/store";

export function LoginClient() {
  const login = useStore((s) => s.login);
  const register = useStore((s) => s.register);
  const users = useStore((s) => s.users);
  const ready = useStore((s) => s.ready);
  const currentUser = useCurrentUser();
  const router = useRouter();

  useEffect(() => {
    if (ready && currentUser) router.replace("/boards");
  }, [ready, currentUser, router]);

  const [mode, setMode] = useState<"login" | "register">("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("admin@example.com");
  const [password, setPassword] = useState("password");
  const [role, setRole] = useState<"admin" | "member" | "client">("member");
  const [error, setError] = useState<string | null>(null);

  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      if (mode === "login") {
        const err = await login(email, password);
        if (err) setError(err);
        else router.push("/boards");
      } else {
        if (!name.trim()) {
          setError("Enter your name");
          return;
        }
        const err = await register(name.trim(), email.trim(), password, role);
        if (err) setError(err);
        else router.push("/boards");
      }
    } finally {
      setBusy(false);
    }
  }

  async function quickLogin(email: string) {
    setError(null);
    const err = await login(email, "password");
    if (err) setError(err);
    else router.push("/boards");
  }

  return (
    <div className="mx-auto flex min-h-[calc(100vh-64px)] max-w-6xl items-center gap-10 px-4 py-10">
      <div className="hidden flex-1 lg:block">
        <div className="rounded-3xl bg-gradient-to-br from-slate-900 via-blue-900 to-violet-900 p-10 text-white shadow-2xl">
          <div className="flex items-center gap-2">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-white/15">
              <KanbanSquare className="h-6 w-6" />
            </span>
            <span className="text-2xl font-bold">TaskBoard</span>
          </div>
          <h1 className="mt-8 text-4xl font-extrabold leading-tight">
            Kanban project management your clients can actually follow.
          </h1>
          <ul className="mt-6 space-y-3 text-sm text-blue-100">
            <li>✓ Boards, lists & cards with drag-and-drop</li>
            <li>✓ Labels, checklists, due dates, members</li>
            <li>✓ Time logging + activity feed per task</li>
            <li>✓ Client progress dashboard (% complete, hours, overdue)</li>
            <li>✓ Local-first — deploys to Vercel with zero config</li>
          </ul>
          <div className="mt-8 rounded-2xl bg-white/10 p-4 text-xs">
            Demo accounts (password: <code className="font-bold">password</code>):
            <div className="mt-2 flex flex-wrap gap-2">
              {users.map((u) => (
                <button
                  key={u.id}
                  onClick={() => quickLogin(u.email)}
                  className="rounded-full bg-white px-3 py-1 font-semibold text-slate-900 hover:bg-blue-100"
                >
                  {u.role} · {u.email}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="w-full max-w-md rounded-3xl bg-white p-8 shadow-xl">
        <h2 className="text-2xl font-bold">{mode === "login" ? "Welcome back" : "Create account"}</h2>
        <p className="mt-1 text-sm text-slate-500">
          {mode === "login" ? "Log in to manage your client boards." : "Join your team workspace."}
        </p>
        <form onSubmit={submit} className="mt-6 flex flex-col gap-3">
          {mode === "register" && (
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Full name"
              className="rounded-xl bg-slate-100 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-500"
            />
          )}
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email"
            type="email"
            required
            className="rounded-xl bg-slate-100 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-500"
          />
          <input
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            type="password"
            required
            className="rounded-xl bg-slate-100 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-500"
          />
          {mode === "register" && (
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as typeof role)}
              className="rounded-xl bg-slate-100 px-4 py-3 text-sm outline-none"
            >
              <option value="member">Member (team)</option>
              <option value="admin">Admin (full access)</option>
              <option value="client">Client (read-only + comment)</option>
            </select>
          )}
          {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}
          <button disabled={busy} className="rounded-xl bg-slate-900 py-3 text-sm font-bold text-white hover:bg-slate-700 disabled:opacity-60">
            {busy ? "Please wait..." : mode === "login" ? "Log in" : "Sign up"}
          </button>
        </form>
        <button
          onClick={() => {
            setMode(mode === "login" ? "register" : "login");
            setError(null);
          }}
          className="mt-4 w-full text-center text-sm text-slate-500 hover:underline"
        >
          {mode === "login" ? "No account? Create one" : "Have an account? Log in"}
        </button>
        <div className="mt-6 border-t pt-4 lg:hidden">
          <p className="mb-2 text-xs text-slate-500">Quick demo login (password: password):</p>
          <div className="flex flex-wrap gap-2">
            {users.map((u) => (
              <button
                key={u.id}
                onClick={() => quickLogin(u.email)}
                className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold hover:bg-slate-200"
              >
                {u.role}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
