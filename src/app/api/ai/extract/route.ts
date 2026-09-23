import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSessionUserId } from "@/lib/server/session";
import { resolveAiAccess } from "@/lib/server/ai-access";
import { createAiProvider, AiProviderError } from "@/lib/ai";

const bodySchema = z.object({
  source: z.enum(["link", "paste", "pdf", "image"]),
  // 너무 긴 원문은 비용·컨텍스트만 늘린다 — 공고 핵심은 앞부분에 몰려 있다
  text: z
    .string()
    .trim()
    .min(1)
    .transform((t) => t.slice(0, 12000)),
});

export async function POST(req: NextRequest) {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });

  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "분석할 텍스트가 없습니다." }, { status: 400 });

  const access = resolveAiAccess(userId, req);
  if (!access.ok) {
    return NextResponse.json({ error: access.error, code: access.code }, { status: access.status });
  }

  try {
    const provider = createAiProvider(access.credentials);
    const extracted = await provider.extractPosting(parsed.data);
    return NextResponse.json(extracted);
  } catch (err) {
    const message = err instanceof AiProviderError ? err.message : "AI 분석 중 오류가 발생했습니다.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
