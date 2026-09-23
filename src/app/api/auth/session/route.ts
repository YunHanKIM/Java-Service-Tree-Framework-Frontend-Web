import { NextResponse } from "next/server";
import { getSessionUserId } from "@/lib/server/session";
import { findUserById, toPublicUser } from "@/lib/server/users-store";

export async function GET() {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ user: null });
  const user = findUserById(userId);
  if (!user) return NextResponse.json({ user: null });
  return NextResponse.json({ user: toPublicUser(user) });
}
