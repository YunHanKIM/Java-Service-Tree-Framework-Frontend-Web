import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSessionUserId } from "@/lib/server/session";
import { getStoredAiSettings } from "@/lib/server/settings-store";
import { createAiProvider, AiProviderError } from "@/lib/ai";

const bodySchema = z.object({
  source: z.enum(["link", "paste", "pdf"]),
  text: z.string().min(1),
});

export async function POST(req: NextRequest) {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });

  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "분석할 텍스트가 없습니다." }, { status: 400 });

  const settings = getStoredAiSettings(userId);
  if (!settings.apiKey) {
    return NextResponse.json({ error: "AI API 키가 설정되지 않았습니다. 설정에서 먼저 등록해주세요.", code: "NO_API_KEY" }, { status: 412 });
  }

  try {
    const provider = createAiProvider(settings.provider, settings.apiKey, settings.model);
    const extracted = await provider.extractPosting(parsed.data);
    return NextResponse.json(extracted);
  } catch (err) {
    const message = err instanceof AiProviderError ? err.message : "AI 분석 중 오류가 발생했습니다.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
