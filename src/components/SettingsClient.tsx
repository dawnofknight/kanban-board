"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { KeyRound, CheckCircle2 } from "lucide-react";
import { useStore, useCurrentUser } from "@/lib/store";
import { initials, cn } from "@/lib/utils";

export function SettingsClient() {
  const user = useCurrentUser();
  const ready = useStore((s) => s.ready);
  const changePassword = useStore((s) => s.changePassword);
  const router = useRouter();

  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [busy, setBusy] = useState(false);

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

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    if (next !== confirm) {
      setError("New passwords do not match");
      return;
    }
    if (next.length < 6) {
      setError("New password must be at least 6 characters");
      return;
    }
    setBusy(true);
    try {
      const err = await changePassword(current, next);
      if (err) {
        setError(err);
      } else {
        setSuccess(true);
        setCurrent("");
        setNext("");
        setConfirm("");
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-6">
      <h1 className="text-2xl font-extrabold">Account settings</h1>
      <p className="mt-1 text-sm text-slate-500">Your profile and password.</p>

      <div className="mt-4 flex items-center gap-3 rounded-2xl bg-white p-5 shadow-sm">
        <span className={cn("grid h-12 w-12 place-items-center rounded-full text-sm font-bold text-white", user.avatarColor)}>
          {initials(user.name)}
        </span>
        <div>
          <div className="font-bold">{user.name}</div>
          <div className="text-sm text-slate-500">{user.email}</div>
        </div>
        <span className="ml-auto rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold capitalize text-slate-600">
          {user.role}
        </span>
      </div>

      <form onSubmit={submit} className="mt-4 rounded-2xl bg-white p-5 shadow-sm">
        <h2 className="flex items-center gap-2 font-bold">
          <KeyRound className="h-4 w-4" /> Change password
        </h2>
        <div className="mt-3 flex flex-col gap-3">
          <input
            type="password"
            value={current}
            onChange={(e) => setCurrent(e.target.value)}
            placeholder="Current password"
            required
            autoComplete="current-password"
            className="rounded-xl bg-slate-100 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-500"
          />
          <input
            type="password"
            value={next}
            onChange={(e) => setNext(e.target.value)}
            placeholder="New password (min 6 characters)"
            required
            autoComplete="new-password"
            className="rounded-xl bg-slate-100 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-500"
          />
          <input
            type="password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            placeholder="Confirm new password"
            required
            autoComplete="new-password"
            className="rounded-xl bg-slate-100 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-500"
          />
          {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}
          {success && (
            <p className="flex items-center gap-1 rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700">
              <CheckCircle2 className="h-4 w-4" /> Password changed successfully
            </p>
          )}
          <button
            disabled={busy}
            className="rounded-xl bg-slate-900 py-3 text-sm font-bold text-white hover:bg-slate-700 disabled:opacity-60"
          >
            {busy ? "Saving..." : "Change password"}
          </button>
        </div>
      </form>
    </div>
  );
}
