import { NextRequest, NextResponse } from "next/server";
import { getSessionUserId } from "@/lib/server/session";
import { imagesToText } from "@/lib/server/ocr";

const MAX_SIZE = 8 * 1024 * 1024;
const ALLOWED_TYPES = ["image/png", "image/jpeg", "image/webp"];

// 공고 캡처 이미지 → 텍스트. 로컬 비전 모델 우선, 없으면 OCR (src/lib/server/ocr.ts)
export async function POST(req: NextRequest) {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });

  const formData = await req.formData().catch(() => null);
  const file = formData?.get("file");
  if (!file || typeof file === "string") {
    return NextResponse.json({ error: "이미지를 첨부해주세요." }, { status: 400 });
  }
  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json({ error: "PNG·JPG·WEBP 이미지만 지원해요." }, { status: 415 });
  }
  if (file.size > MAX_SIZE) {
    return NextResponse.json({ error: "이미지는 최대 8MB까지 업로드할 수 있어요." }, { status: 413 });
  }

  try {
    const result = await imagesToText(userId, [Buffer.from(await file.arrayBuffer())]);
    if (result.text.length < 30) {
      return NextResponse.json(
        { error: "이미지에서 글자를 거의 찾지 못했어요. 공고 본문이 잘 보이게 다시 캡처해주세요.", code: "EMPTY_TEXT" },
        { status: 422 }
      );
    }
    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ error: "이미지에서 글자를 읽는 중 오류가 발생했어요.", code: "OCR_ERROR" }, { status: 500 });
  }
}
