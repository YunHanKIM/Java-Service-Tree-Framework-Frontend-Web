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
    // 메뉴·푸터뿐인 페이지를 넘기면 모델은 전부 빈 값으로 돌려준다 — 빈 공고로 비교 분석까지 가면 엉뚱한 결과가
    // 나오므로 여기서 멈추고 다른 입력 방식을 안내한다
    const found =
      extracted.company || extracted.title || extracted.requiredSkills.length > 0 || extracted.responsibilities.length > 0;
    if (!found) {
      return NextResponse.json(
        { error: "입력한 내용에서 공고 정보를 찾지 못했어요. 공고 본문을 붙여넣거나 화면을 캡처해 이미지로 넣어주세요.", code: "EMPTY_POSTING" },
        { status: 422 }
      );
    }
    return NextResponse.json(extracted);
  } catch (err) {
    const message = err instanceof AiProviderError ? err.message : "AI 분석 중 오류가 발생했습니다.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
