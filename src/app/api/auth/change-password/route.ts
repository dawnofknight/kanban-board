import { NextRequest, NextResponse } from "next/server";
import { compareSync, hashSync } from "bcryptjs";
import { eq } from "drizzle-orm";
import { users } from "../../../../../db/schema";
import { getSessionUser } from "@/lib/auth-server";
import { getDb } from "@/lib/db";

export async function POST(req: NextRequest) {
  const db = getDb();
  const user = await getSessionUser(db);
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const { currentPassword, newPassword } = (await req.json()) as {
    currentPassword?: string;
    newPassword?: string;
  };
  if (!currentPassword || !newPassword) {
    return NextResponse.json({ error: "Current and new password required" }, { status: 400 });
  }
  if (newPassword.length < 6) {
    return NextResponse.json({ error: "New password must be at least 6 characters" }, { status: 400 });
  }

  const rows = await db.select().from(users).where(eq(users.id, user.id)).limit(1);
  const found = rows[0];
  if (!found) return NextResponse.json({ error: "User not found" }, { status: 404 });
  if (!compareSync(currentPassword, found.passwordHash)) {
    return NextResponse.json({ error: "Current password is incorrect" }, { status: 403 });
  }

  await db.update(users).set({ passwordHash: hashSync(newPassword, 10) }).where(eq(users.id, user.id));
  return NextResponse.json({ ok: true });
}
