"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useStore } from "@/lib/store";

export default function Home() {
  const ready = useStore((s) => s.ready);
  const currentUserId = useStore((s) => s.currentUserId);
  const router = useRouter();

  useEffect(() => {
    if (!ready) return;
    if (currentUserId) router.replace("/boards");
    else router.replace("/login");
  }, [ready, currentUserId, router]);

  return (
    <div className="grid min-h-[60vh] place-items-center">
      <p className="text-slate-500">Loading TaskBoard...</p>
    </div>
  );
}
