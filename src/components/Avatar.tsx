"use client";

import { useStore } from "@/lib/store";
import { initials, cn } from "@/lib/utils";

export function Avatar({ userId, size = "sm" }: { userId: string; size?: "xs" | "sm" | "md" }) {
  const user = useStore((s) => s.users.find((u) => u.id === userId));
  if (!user) return null;
  const cls = size === "xs" ? "h-5 w-5 text-[9px]" : size === "md" ? "h-9 w-9 text-xs" : "h-6 w-6 text-[10px]";
  return (
    <span
      title={`${user.name} (${user.role})`}
      className={cn("grid shrink-0 place-items-center rounded-full font-bold text-white ring-2 ring-white", user.avatarColor, cls)}
    >
      {initials(user.name)}
    </span>
  );
}
