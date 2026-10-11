import { NextRequest, NextResponse } from "next/server";
import { hashSync } from "bcryptjs";
import { eq } from "drizzle-orm";
import { users } from "../../../../../db/schema";
import { createSession, setSessionCookie } from "@/lib/auth-server";
import { getDb } from "@/lib/db";
import type { Role } from "@/lib/types";
import { uid } from "@/lib/utils";

const AVATARS = ["bg-blue-600", "bg-rose-600", "bg-amber-600", "bg-teal-600", "bg-indigo-600"];

export async function POST(req: NextRequest) {
  const { name, email, password, role } = (await req.json()) as {
    name?: string;
    email?: string;
    password?: string;
    role?: Role;
  };
  if (!name?.trim() || !email?.trim() || !password) {
    return NextResponse.json({ error: "Name, email and password required" }, { status: 400 });
  }
  // Self-registration is limited to member/client; admins are seeded.
  const safeRole: Role = role === "client" ? "client" : "member";

  const db = getDb();
  const existing = await db.select({ id: users.id }).from(users).where(eq(users.email, email.trim().toLowerCase())).limit(1);
  // emails are stored as-given; also check case-insensitively
  const all = await db.select().from(users);
  if (all.some((u) => u.email.toLowerCase() === email.trim().toLowerCase()) || existing.length > 0) {
    return NextResponse.json({ error: "Email already registered" }, { status: 409 });
  }

  const id = uid("u");
  await db.insert(users).values({
    id,
    name: name.trim(),
    email: email.trim(),
    passwordHash: hashSync(password, 10),
    role: safeRole,
    avatarColor: AVATARS[all.length % AVATARS.length],
  });

  const token = await createSession(db, id);
  await setSessionCookie(token, new URL(req.url).protocol === "https:");
  return NextResponse.json({
    user: { id, name: name.trim(), email: email.trim(), role: safeRole, avatarColor: AVATARS[all.length % AVATARS.length] },
  });
}
