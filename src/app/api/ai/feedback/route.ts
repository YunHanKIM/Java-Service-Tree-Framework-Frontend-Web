import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSessionUserId } from "@/lib/server/session";
import { resolveAiAccess } from "@/lib/server/ai-access";
import { createAiProvider, AiProviderError } from "@/lib/ai";

const bodySchema = z.object({
  question: z.string().min(1),
  answer: z.string(),
});

export async function POST(req: NextRequest) {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });

  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "요청 형식이 올바르지 않습니다." }, { status: 400 });

  const access = resolveAiAccess(userId, req);
  if (!access.ok) {
    return NextResponse.json({ error: access.error, code: access.code }, { status: access.status });
  }

  try {
    const provider = createAiProvider(access.credentials);
    const feedback = await provider.generateFeedback(parsed.data.question, parsed.data.answer);
    return NextResponse.json({ feedback });
  } catch (err) {
    const message = err instanceof AiProviderError ? err.message : "AI 분석 중 오류가 발생했습니다.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
