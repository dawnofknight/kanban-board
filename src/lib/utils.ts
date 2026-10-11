import { clsx, type ClassValue } from "clsx";

export function cn(...inputs: ClassValue[]) {
  return clsx(...inputs);
}

export function uid(prefix = "id"): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random()
    .toString(36)
    .slice(2, 8)}`;
}

export function nowIso(): string {
  return new Date().toISOString();
}

export function initials(name: string): string {
  return name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function formatDateTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function isOverdue(dueDate: string | null | undefined, completed?: boolean): boolean {
  if (!dueDate || completed) return false;
  return new Date(dueDate).getTime() < Date.now() - 24 * 60 * 60 * 1000;
}

export function isDueSoon(dueDate: string | null | undefined, completed?: boolean): boolean {
  if (!dueDate || completed) return false;
  const diff = new Date(dueDate).getTime() - Date.now();
  return diff > 0 && diff < 3 * 24 * 60 * 60 * 1000;
}

export const BOARD_GRADIENTS = [
  "from-blue-600 to-indigo-700",
  "from-emerald-500 to-teal-700",
  "from-orange-500 to-rose-600",
  "from-violet-600 to-purple-800",
  "from-slate-700 to-slate-900",
  "from-cyan-500 to-blue-700",
];
