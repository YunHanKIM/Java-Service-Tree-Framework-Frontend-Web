import { NextRequest, NextResponse } from "next/server";
import { getSessionUserId } from "@/lib/server/session";

const MAX_SIZE = 10 * 1024 * 1024;

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

  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const { PDFParse } = await import("pdf-parse");
    const parser = new PDFParse({ data: buffer });
    const result = await parser.getText();
    await parser.destroy();
    const text = result.text.replace(/[ \t]+/g, " ").replace(/\n\s*\n/g, "\n\n").trim();

    if (!text || text.length < 30) {
      return NextResponse.json(
        { error: "PDF에서 텍스트를 추출하지 못했어요 (스캔 이미지 PDF일 수 있어요). 공고 내용을 직접 붙여넣어 주세요.", code: "EMPTY_TEXT" },
        { status: 422 }
      );
    }

    const trimmed = text.length > 6000 ? text.slice(0, 6000) : text;
    return NextResponse.json({ text: trimmed, fileName: file.name });
  } catch {
    return NextResponse.json({ error: "PDF를 읽는 중 오류가 발생했어요.", code: "PARSE_ERROR" }, { status: 500 });
  }
}
