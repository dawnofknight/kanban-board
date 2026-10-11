import { NextRequest, NextResponse } from "next/server";
import { compareSync } from "bcryptjs";
import { users } from "../../../../../db/schema";
import { createSession, setSessionCookie } from "@/lib/auth-server";
import { getDb } from "@/lib/db";
import type { Role } from "@/lib/types";

export async function POST(req: NextRequest) {
  const { email, password } = (await req.json()) as { email?: string; password?: string };
  if (!email || !password) return NextResponse.json({ error: "Email and password required" }, { status: 400 });

  const db = getDb();
  const all = await db.select().from(users);
  const found = all.find((u) => u.email.toLowerCase() === email.toLowerCase());
  if (!found || !compareSync(password, found.passwordHash)) {
    return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
  }

  const token = await createSession(db, found.id);
  await setSessionCookie(token, new URL(req.url).protocol === "https:");
  return NextResponse.json({
    user: { id: found.id, name: found.name, email: found.email, role: found.role as Role, avatarColor: found.avatarColor },
  });
}
