import { Suspense } from "react";
import { BoardDetailClient } from "@/components/BoardDetailClient";

export const dynamic = "force-dynamic";

export default async function BoardDetailPage({
  params,
}: {
  params: Promise<{ boardId: string }>;
}) {
  const { boardId } = await params;
  return (
    <Suspense fallback={<div className="grid min-h-[50vh] place-items-center text-sm text-slate-500">Loading board...</div>}>
      <BoardDetailClient boardId={boardId} />
    </Suspense>
  );
}
