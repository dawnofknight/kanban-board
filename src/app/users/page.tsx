import { Suspense } from "react";
import { UsersClient } from "@/components/UsersClient";

export const dynamic = "force-dynamic";

export default function Page() {
  return (
    <Suspense fallback={<div className="grid min-h-[50vh] place-items-center text-sm text-slate-500">Loading...</div>}>
      <UsersClient />
    </Suspense>
  );
}
