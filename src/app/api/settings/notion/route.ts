import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSessionUserId } from "@/lib/server/session";
import { getStoredNotionSettings, saveNotionSettings, toPublicNotionSettings } from "@/lib/server/notion-store";
import { getDatabaseInfo, NotionError, parseDatabaseId } from "@/lib/server/notion";

export async function GET() {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  return NextResponse.json(toPublicNotionSettings(getStoredNotionSettings(userId)));
}

const bodySchema = z.object({
  token: z.string().trim().max(200).optional(),
  database: z.string().trim().min(1).max(500),
});

// 저장 전에 실제로 DB를 조회해본다 — 토큰 오타·통합 미연결을 저장 시점에 바로 알려주기 위해
export async function POST(req: NextRequest) {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });

  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "데이터베이스 링크 또는 ID를 입력해주세요." }, { status: 400 });

  const databaseId = parseDatabaseId(parsed.data.database);
  if (!databaseId) {
    return NextResponse.json({ error: "데이터베이스 링크/ID 형식이 아니에요. 노션 DB 페이지의 링크를 그대로 붙여넣어 주세요." }, { status: 400 });
  }
  const token = parsed.data.token || getStoredNotionSettings(userId).token;
  if (!token) return NextResponse.json({ error: "Notion 통합 토큰을 입력해주세요." }, { status: 400 });

  try {
    const { title } = await getDatabaseInfo(token, databaseId);
    const saved = saveNotionSettings(userId, { token: parsed.data.token, databaseId });
    return NextResponse.json({ ...toPublicNotionSettings(saved), databaseTitle: title });
  } catch (err) {
    if (err instanceof NotionError) return NextResponse.json({ error: err.message, code: err.code }, { status: 400 });
    return NextResponse.json({ error: "Notion 연결 확인 중 오류가 발생했어요." }, { status: 502 });
  }
}
