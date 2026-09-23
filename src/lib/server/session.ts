import crypto from "node:crypto";
import { cookies } from "next/headers";

// 데모 목적의 경량 세션 — 실서비스라면 SESSION_SECRET을 .env.local에 반드시 별도로 설정할 것.
const COOKIE_NAME = "jiwonnote_session";
const SECRET = process.env.SESSION_SECRET || "jiwonnote-dev-secret-change-me";

function sign(userId: string): string {
  const hmac = crypto.createHmac("sha256", SECRET).update(userId).digest("hex");
  return `${userId}.${hmac}`;
}

function verify(token: string): string | null {
  const [userId, sig] = token.split(".");
  if (!userId || !sig) return null;
  const expected = crypto.createHmac("sha256", SECRET).update(userId).digest("hex");
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  return userId;
}

export async function createSession(userId: string): Promise<void> {
  const store = await cookies();
  store.set(COOKIE_NAME, sign(userId), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
}

export async function getSessionUserId(): Promise<string | null> {
  const store = await cookies();
  const token = store.get(COOKIE_NAME)?.value;
  if (!token) return null;
  return verify(token);
}

export async function clearSession(): Promise<void> {
  const store = await cookies();
  store.delete(COOKIE_NAME);
}
