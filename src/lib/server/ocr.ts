import path from "node:path";
import fs from "node:fs";
import { DATA_DIR } from "./data-dir";
import { getStoredAiSettings } from "./settings-store";
import { transcribeImageWithLocalModel } from "@/lib/ai/local";

export interface ImageTextResult {
  text: string;
  /** vision = 로컬 비전 모델 · ocr = tesseract */
  method: "vision" | "ocr";
  /** 비전 모델이 실패해 OCR로 대체됐을 때 사용자에게 보여줄 안내 */
  notice?: string;
}

// 비전 모델 전체(모든 페이지 합산) 시간 예산. 넘기면 남은 페이지는 포기하고 OCR로 전환한다 —
// 느린 로컬 모델 때문에 요청 하나가 몇 분씩 붙잡히지 않게
const VISION_BUDGET_MS = 90_000;

async function ocrWithTesseract(images: Buffer[]): Promise<string> {
  const { createWorker } = await import("tesseract.js");
  // 언어 데이터(kor/eng)는 첫 실행 때 CDN에서 받아 .data/(gitignored)에 캐시한다
  const cachePath = path.join(DATA_DIR, "tesseract");
  fs.mkdirSync(cachePath, { recursive: true });
  const worker = await createWorker(["kor", "eng"], 1, { cachePath });
  try {
    // 한글은 기본 설정에서 글자마다 공백이 끼는 경우가 많아 원래 띄어쓰기를 보존하도록 한다
    await worker.setParameters({ preserve_interword_spaces: "1" });
    const texts: string[] = [];
    for (const image of images) {
      const { data } = await worker.recognize(image);
      texts.push(data.text);
    }
    return texts.join("\n\n");
  } finally {
    await worker.terminate();
  }
}

/**
 * 이미지(공고 캡처·스캔 PDF 페이지)에서 글자를 뽑는다. 사용자가 로컬 LLM + 비전 모델을 설정했으면
 * 비전 모델이 우선(한글 인식이 훨씬 정확), 없거나 실패하면 tesseract OCR로 대체한다.
 */
export async function imagesToText(userId: string, images: Buffer[]): Promise<ImageTextResult> {
  const settings = getStoredAiSettings(userId);
  let notice: string | undefined;

  if (settings.provider === "local" && settings.visionModel) {
    try {
      const deadline = Date.now() + VISION_BUDGET_MS;
      const texts: string[] = [];
      for (const image of images) {
        const remaining = deadline - Date.now();
        if (remaining < 5000) throw new Error("비전 모델 처리 시간 초과");
        texts.push(
          await transcribeImageWithLocalModel(settings.baseUrl, settings.visionModel, image.toString("base64"), remaining)
        );
      }
      const text = texts.join("\n\n").trim();
      if (text) return { text, method: "vision" };
    } catch (err) {
      notice = `비전 모델을 쓰지 못해 OCR로 대신 인식했어요. (${err instanceof Error ? err.message : "알 수 없는 오류"})`;
    }
  }

  const text = (await ocrWithTesseract(images)).trim();
  return { text, method: "ocr", notice };
}
