import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSessionUserId } from "@/lib/server/session";
import { getStoredNotionSettings } from "@/lib/server/notion-store";
import { exportPostingToNotion, NotionError } from "@/lib/server/notion";
import { jobPostingSchema, storedAnalysisSchema } from "@/types/schemas";
import type { JobPosting } from "@/types/domain";

const bodySchema = z.object({
  posting: jobPostingSchema.extend({ analysis: storedAnalysisSchema.nullable() }),
});

// 분석한 공고를 사용자의 Notion 데이터베이스에 새 페이지로 저장한다
export async function POST(req: NextRequest) {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });

  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "요청 형식이 올바르지 않습니다." }, { status: 400 });

  const { token, databaseId } = getStoredNotionSettings(userId);
  if (!token || !databaseId) {
    return NextResponse.json(
      { error: "Notion 연동이 설정되지 않았어요. 설정에서 통합 토큰과 데이터베이스를 등록해주세요.", code: "NOTION_NOT_CONFIGURED" },
      { status: 412 }
    );
  }

  try {
    const { url } = await exportPostingToNotion(token, databaseId, parsed.data.posting as JobPosting);
    return NextResponse.json({ url });
  } catch (err) {
    // 노션 토큰 오류(401)를 그대로 넘기면 앱 로그인 만료로 오해할 수 있어 400으로 바꾼다
    if (err instanceof NotionError) {
      return NextResponse.json({ error: err.message, code: err.code }, { status: err.status === 401 ? 400 : err.status });
    }
    return NextResponse.json({ error: "Notion 저장 중 오류가 발생했어요." }, { status: 502 });
  }
}
