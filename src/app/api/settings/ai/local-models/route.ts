import { NextResponse } from "next/server";
import { getSessionUserId } from "@/lib/server/session";
import { getStoredAiSettings } from "@/lib/server/settings-store";
import { AiProviderError } from "@/lib/ai";
import { listLocalModels } from "@/lib/ai/local";

// 설정 화면 "연결 확인" — 저장된 로컬 LLM 주소로 Ollama에 붙어 설치된 모델 목록을 돌려준다.
// 주소는 요청 본문이 아니라 저장된 설정(루프백 검증을 거친 값)에서만 읽는다.
export async function GET() {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });

  const { baseUrl } = getStoredAiSettings(userId);
  try {
    return NextResponse.json({ models: await listLocalModels(baseUrl) });
  } catch (err) {
    const message = err instanceof AiProviderError ? err.message : "Ollama 연결 확인에 실패했어요.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
