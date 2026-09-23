import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSessionUserId } from "@/lib/server/session";
import { resolveAiAccess } from "@/lib/server/ai-access";
import { createAiProvider, AiProviderError } from "@/lib/ai";
import { jobPostingSchema, resumeProfileSchema } from "@/types/schemas";
import type { JobPosting } from "@/types/domain";

const bodySchema = z.object({
  posting: jobPostingSchema,
  resume: resumeProfileSchema,
});

function generatePrepId(): string {
  return `prep_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

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
    const result = await provider.compareResume(parsed.data.posting as JobPosting, parsed.data.resume);
    const hasCoverLetter = parsed.data.resume.coverLetterText.trim().length > 0;
    return NextResponse.json({
      fitScore: Math.max(0, Math.min(100, Math.round(result.fitScore ?? 0))),
      // 자소서가 없는데 모델이 리뷰를 지어낸 경우는 버린다
      coverLetterReview: hasCoverLetter ? result.coverLetterReview : null,
      matchingSkills: result.matchingSkills,
      missingSkills: result.missingSkills,
      prepItems: result.prepLabels.map((label) => ({ id: generatePrepId(), label, done: false })),
    });
  } catch (err) {
    const message = err instanceof AiProviderError ? err.message : "AI 분석 중 오류가 발생했습니다.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
