import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import * as cheerio from "cheerio";
import { getSessionUserId } from "@/lib/server/session";

const bodySchema = z.object({ url: z.string().url() });

// 실제 서버사이드 URL 가져오기 — 브라우저에서 직접 fetch하면 CORS로 막히는 문제를
// 서버 라우트가 대신 요청해서 우회한다. 로그인 필요 페이지 · JS 렌더링 SPA · 봇 차단은
// 여전히 실패할 수 있다 (docs/ai/12_known_issues 참조) — 그때는 붙여넣기로 안내한다.
export async function POST(req: NextRequest) {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });

  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "올바른 URL을 입력해주세요." }, { status: 400 });
  }

  let res: Response;
  try {
    res = await fetch(parsed.data.url, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; JiwonNoteBot/1.0; +https://github.com)" },
      redirect: "follow",
      signal: AbortSignal.timeout(10000),
    });
  } catch {
    return NextResponse.json(
      { error: "페이지를 가져오는 중 오류가 발생했어요. 접근이 차단됐거나 존재하지 않는 주소일 수 있어요. 공고 내용을 직접 붙여넣어 주세요.", code: "FETCH_ERROR" },
      { status: 502 }
    );
  }

  if (!res.ok) {
    return NextResponse.json(
      { error: `페이지를 가져오지 못했어요 (HTTP ${res.status}). 로그인이 필요한 페이지일 수 있어요. 공고 내용을 직접 붙여넣어 주세요.`, code: "FETCH_FAILED" },
      { status: 502 }
    );
  }

  const contentType = res.headers.get("content-type") || "";
  if (!contentType.includes("text/html")) {
    return NextResponse.json(
      { error: "이 링크는 HTML 페이지가 아니에요. 공고 내용을 직접 붙여넣어 주세요.", code: "NOT_HTML" },
      { status: 415 }
    );
  }

  const html = await res.text();
  const $ = cheerio.load(html);
  $("script, style, noscript, nav, footer, header, svg, iframe").remove();
  const text = $("body")
    .text()
    .replace(/[ \t]+/g, " ")
    .replace(/\n\s*\n/g, "\n\n")
    .trim();

  if (!text || text.length < 50) {
    return NextResponse.json(
      { error: "페이지에서 본문을 추출하지 못했어요. JavaScript로 내용을 그리는 사이트일 수 있어요. 공고 내용을 직접 붙여넣어 주세요.", code: "EMPTY_TEXT" },
      { status: 422 }
    );
  }

  // AI 호출 비용·컨텍스트 절약을 위해 앞부분만 사용
  const trimmed = text.length > 6000 ? text.slice(0, 6000) : text;
  return NextResponse.json({ text: trimmed, originalUrl: parsed.data.url });
}
