import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createUser, findUserByEmail, toPublicUser, verifyPassword } from "@/lib/server/users-store";
import { createSession } from "@/lib/server/session";

const bodySchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

export async function POST(req: NextRequest) {
  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "이메일 형식과 8자 이상 비밀번호를 확인해주세요." }, { status: 400 });
  }
  const { email, password } = parsed.data;

  let user = findUserByEmail(email);
  if (!user) {
    // 별도 회원가입 화면 없이 최초 로그인 시 자동 가입 (데모 단순화 — docs/ai/12_known_issues 참조)
    user = await createUser(email, password, email.split("@")[0]);
  } else {
    const ok = await verifyPassword(user, password);
    if (!ok) {
      return NextResponse.json({ error: "비밀번호가 일치하지 않습니다." }, { status: 401 });
    }
  }

  await createSession(user.id);
  return NextResponse.json({ user: toPublicUser(user) });
}
