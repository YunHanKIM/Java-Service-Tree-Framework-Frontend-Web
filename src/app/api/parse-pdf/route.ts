import { NextRequest, NextResponse } from "next/server";
import { getSessionUserId } from "@/lib/server/session";
import { imagesToText } from "@/lib/server/ocr";

const MAX_SIZE = 10 * 1024 * 1024;
// 이력서·자기소개서도 이 라우트를 쓰므로 공고보다 넉넉하게 — 공고 분석 쪽은 /api/ai/extract에서 다시 자른다
const MAX_CHARS = 15000;
// 스캔 PDF OCR은 페이지당 수 초가 걸려 앞쪽 몇 페이지만 읽는다
const OCR_MAX_PAGES = 3;

function normalize(text: string): string {
  return text.replace(/[ \t]+/g, " ").replace(/\n\s*\n/g, "\n\n").trim();
}

export async function POST(req: NextRequest) {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });

  const formData = await req.formData().catch(() => null);
  const file = formData?.get("file");
  if (!file || typeof file === "string") {
    return NextResponse.json({ error: "PDF 파일을 첨부해주세요." }, { status: 400 });
  }
  if (file.size > MAX_SIZE) {
    return NextResponse.json({ error: "PDF 파일은 최대 10MB까지 업로드할 수 있어요." }, { status: 413 });
  }

  const { PDFParse } = await import("pdf-parse");
  let parser;
  try {
    parser = new PDFParse({ data: Buffer.from(await file.arrayBuffer()) });
    // pdf-parse 기본값이 페이지마다 "-- 1 of 3 --" 구분자를 넣는데, AI 입력에는 잡음이라 끈다
    let text = normalize((await parser.getText({ pageJoiner: "" })).text);
    let method: "text" | "vision" | "ocr" = "text";
    let notice: string | undefined;

    // 텍스트 레이어가 없는 스캔 PDF — 페이지를 이미지로 렌더링해서 비전 모델/OCR로 읽는다
    if (text.length < 30) {
      const shots = await parser.getScreenshot({ first: OCR_MAX_PAGES, scale: 2, imageDataUrl: false });
      const images = shots.pages.map((p) => Buffer.from(p.data));
      const ocr = await imagesToText(userId, images);
      text = normalize(ocr.text);
      method = ocr.method;
      notice = ocr.notice;
    }

    if (text.length < 30) {
      return NextResponse.json(
        { error: "PDF에서 글자를 찾지 못했어요. 공고 내용을 직접 붙여넣어 주세요.", code: "EMPTY_TEXT" },
        { status: 422 }
      );
    }

    const trimmed = text.length > MAX_CHARS ? text.slice(0, MAX_CHARS) : text;
    return NextResponse.json({ text: trimmed, fileName: file.name, method, notice });
  } catch {
    return NextResponse.json({ error: "PDF를 읽는 중 오류가 발생했어요.", code: "PARSE_ERROR" }, { status: 500 });
  } finally {
    await parser?.destroy().catch(() => {});
  }
}
