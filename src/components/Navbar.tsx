"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { KanbanSquare, LayoutDashboard, Users, LogOut, RotateCcw, Settings } from "lucide-react";
import { useStore, useCurrentUser } from "@/lib/store";
import { initials } from "@/lib/utils";
import { cn } from "@/lib/utils";

export function Navbar() {
  const user = useCurrentUser();
  const logout = useStore((s) => s.logout);
  const resetDemo = useStore((s) => s.resetDemo);
  const router = useRouter();

  if (!user) return null;

  const link = (href: string, label: string, icon: React.ReactNode) => (
    <Link
      href={href}
      className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-slate-300 transition hover:bg-white/10 hover:text-white"
    >
      {icon}
      {label}
    </Link>
  );

  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-slate-900/95 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-3">
        <Link href="/boards" className="flex items-center gap-2 text-white">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br from-blue-500 to-violet-600">
            <KanbanSquare className="h-5 w-5" />
          </span>
          <span className="text-lg font-bold tracking-tight">TaskBoard</span>
          <span className="hidden rounded-full bg-white/10 px-2 py-0.5 text-[11px] text-slate-300 sm:inline">
            Trello clone
          </span>
        </Link>

        <nav className="ml-4 flex items-center gap-1">
          {link("/boards", "Boards", <KanbanSquare className="h-4 w-4" />)}
          {link("/dashboard", "Client Progress", <LayoutDashboard className="h-4 w-4" />)}
          {user.role === "admin" && link("/users", "Team", <Users className="h-4 w-4" />)}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          {user.role === "admin" && (
            <button
              onClick={() => {
                if (confirm("Reset demo data? This clears all workspace data.")) void resetDemo();
              }}
              title="Reset demo data"
              className="hidden rounded-lg p-2 text-slate-400 hover:bg-white/10 hover:text-white sm:block"
            >
              <RotateCcw className="h-4 w-4" />
            </button>
          )}
          <Link
            href="/settings"
            className="rounded-lg p-2 text-slate-400 hover:bg-white/10 hover:text-white"
            title="Account settings"
          >
            <Settings className="h-4 w-4" />
          </Link>
          <div className="flex items-center gap-2 rounded-full bg-white/10 py-1 pl-1 pr-3">
            <span className={cn("grid h-7 w-7 place-items-center rounded-full text-[11px] font-bold text-white", user.avatarColor)}>
              {initials(user.name)}
            </span>
            <div className="leading-tight">
              <div className="text-xs font-semibold text-white">{user.name}</div>
              <div className="text-[11px] capitalize text-slate-400">{user.role}</div>
            </div>
          </div>
          <button
            onClick={() => {
              logout();
              router.push("/login");
            }}
            className="rounded-lg p-2 text-slate-400 hover:bg-white/10 hover:text-white"
            title="Log out"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </header>
  );
}
