"use client";

import { useEffect } from "react";
import { useStore } from "@/lib/store";

/** Loads the workspace from D1 once per page load. */
export function Bootstrap() {
  const bootstrap = useStore((s) => s.bootstrap);
  useEffect(() => {
    void bootstrap();
  }, [bootstrap]);
  return null;
}
