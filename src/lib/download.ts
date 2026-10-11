"use client";

export async function downloadJson(url: string, filename: string): Promise<string | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return "Export failed";
    const blob = await res.blob();
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 5000);
    return null;
  } catch {
    return "Export failed";
  }
}

export function slugify(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40) || "board";
}
