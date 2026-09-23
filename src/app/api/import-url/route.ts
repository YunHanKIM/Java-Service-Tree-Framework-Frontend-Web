import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSessionUserId } from "@/lib/server/session";
import { crawlPostingText, CrawlError } from "@/lib/server/crawl";

const bodySchema = z.object({ url: z.string().url() });

// 서버사이드 크롤링 — 1) 일반 fetch(+JSON-LD JobPosting 우선) 2) 본문이 비면 헤드리스 Chromium으로
// JS까지 실행해서 다시 읽는다. 로그인 필요 페이지·봇 차단은 여전히 실패할 수 있다
// (docs/ai/12_known_issues 참조) — 그때는 붙여넣기/이미지 입력으로 안내한다.
export async function POST(req: NextRequest) {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });

  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "올바른 URL을 입력해주세요." }, { status: 400 });
  }

  try {
    const { text, method } = await crawlPostingText(parsed.data.url);
    // AI 호출 비용·컨텍스트 절약을 위해 앞부분만 사용
    const trimmed = text.length > 8000 ? text.slice(0, 8000) : text;
    return NextResponse.json({ text: trimmed, originalUrl: parsed.data.url, method });
  } catch (err) {
    if (err instanceof CrawlError) {
      return NextResponse.json({ error: err.message, code: err.code }, { status: err.status });
    }
    return NextResponse.json(
      { error: "페이지를 가져오는 중 오류가 발생했어요. 공고 내용을 직접 붙여넣어 주세요.", code: "FETCH_ERROR" },
      { status: 502 }
    );
  }
}
