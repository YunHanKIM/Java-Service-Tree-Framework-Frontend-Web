import { NextResponse } from "next/server";
import { ensureDemoUser, toPublicUser } from "@/lib/server/users-store";
import { createSession } from "@/lib/server/session";

export async function POST() {
  const user = await ensureDemoUser();
  await createSession(user.id);
  return NextResponse.json({ user: toPublicUser(user) });
}
