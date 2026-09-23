import { z } from "zod";
import type { JobPosting, ResumeProfile } from "@/types/domain";
import {
  AiProvider,
  AiProviderError,
  buildCompareUserPrompt,
  buildPostingSummary,
  COMPARE_SYSTEM_PROMPT,
  EXTRACT_SYSTEM_PROMPT,
  FEEDBACK_SYSTEM_PROMPT,
  parseJsonLoose,
  QUESTIONS_SYSTEM_PROMPT,
} from "./provider";
import {
  analysisResultSchema,
  analysisResultWithCoverLetterSchema,
  extractedPostingSchema,
  feedbackSchema,
  questionsSchema,
} from "./schemas";

export const LOCAL_DEFAULT_MODEL = "qwen2.5:7b";
export const LOCAL_DEFAULT_BASE_URL = "http://localhost:11434";

// 이력서+자소서+공고를 한 번에 넣으면 Ollama 기본 컨텍스트(4096 토큰)를 넘겨 앞부분이 조용히 잘린다.
// OpenAI 호환 엔드포인트(/v1)는 num_ctx를 받지 않으므로 네이티브 /api/chat을 쓴다.
const NUM_CTX = 16384;
const TIMEOUT_MS = 180_000;

const LOOPBACK_HOSTS = new Set(["localhost", "127.0.0.1", "[::1]"]);

/**
 * "로컬" LLM 주소는 루프백만 허용한다 — 누구나 가입할 수 있는 앱에서 임의 주소를 받으면
 * 서버가 내부망으로 요청을 보내는 발판(SSRF)이 되기 때문. 원격 Ollama가 필요하면 SSH 터널 등으로
 * localhost에 붙여서 쓴다.
 */
export function isAllowedLocalBaseUrl(raw: string): boolean {
  try {
    const url = new URL(raw);
    return (url.protocol === "http:" || url.protocol === "https:") && LOOPBACK_HOSTS.has(url.hostname);
  } catch {
    return false;
  }
}

interface OllamaMessage {
  role: "system" | "user";
  content: string;
  images?: string[];
}

async function ollamaChat(
  baseUrl: string,
  model: string,
  messages: OllamaMessage[],
  format?: Record<string, unknown>,
  timeoutMs: number = TIMEOUT_MS
): Promise<string> {
  let res: Response;
  try {
    res = await fetch(`${baseUrl.replace(/\/+$/, "")}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        messages,
        stream: false,
        ...(format ? { format } : {}),
        options: { temperature: 0.4, num_ctx: NUM_CTX },
      }),
      signal: AbortSignal.timeout(timeoutMs),
    });
  } catch (err) {
    const timedOut = err instanceof Error && err.name === "TimeoutError";
    throw new AiProviderError(
      timedOut
        ? "로컬 LLM 응답이 너무 오래 걸립니다. 더 작은 모델을 쓰거나 잠시 후 다시 시도해주세요."
        : `로컬 LLM(Ollama)에 연결하지 못했습니다. \`ollama serve\`가 실행 중인지, 주소(${baseUrl})가 맞는지 확인해주세요.`,
      { cause: err }
    );
  }

  if (res.status === 404) {
    throw new AiProviderError(`로컬 모델 "${model}"이(가) 없습니다. 터미널에서 \`ollama pull ${model}\`로 먼저 받아주세요.`);
  }
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new AiProviderError(`로컬 LLM 호출에 실패했습니다 (HTTP ${res.status}). ${detail.slice(0, 200)}`);
  }

  const data = (await res.json().catch(() => null)) as { message?: { content?: string } } | null;
  const content = data?.message?.content;
  if (!content) throw new AiProviderError("로컬 LLM 응답이 비어 있습니다.");
  return content;
}

/** Ollama에 설치된 모델 목록 — 설정 화면의 연결 확인용 */
export async function listLocalModels(baseUrl: string): Promise<string[]> {
  let res: Response;
  try {
    res = await fetch(`${baseUrl.replace(/\/+$/, "")}/api/tags`, { signal: AbortSignal.timeout(5000) });
  } catch (err) {
    throw new AiProviderError(`Ollama(${baseUrl})에 연결하지 못했습니다. \`ollama serve\`가 실행 중인지 확인해주세요.`, {
      cause: err,
    });
  }
  if (!res.ok) throw new AiProviderError(`Ollama 모델 목록을 가져오지 못했습니다 (HTTP ${res.status}).`);
  const data = (await res.json().catch(() => null)) as { models?: { name: string }[] } | null;
  return (data?.models ?? []).map((m) => m.name);
}

/** 비전 모델로 이미지 속 글자를 그대로 옮겨 적는다 (공고 스크린샷·스캔 PDF 페이지용) */
export async function transcribeImageWithLocalModel(
  baseUrl: string,
  model: string,
  imageBase64: string,
  timeoutMs: number
): Promise<string> {
  const text = await ollamaChat(
    baseUrl,
    model,
    [
      {
        role: "user",
        content:
          "이 이미지는 채용공고(또는 이력서) 캡처입니다. 이미지에 보이는 글자를 빠짐없이, 원래 순서대로 옮겨 적으세요. 요약하거나 설명을 덧붙이지 말고 텍스트만 출력하세요.",
        images: [imageBase64],
      },
    ],
    undefined,
    timeoutMs
  );
  return text.trim();
}

export function createLocalProvider(baseUrl: string, model: string = LOCAL_DEFAULT_MODEL): AiProvider {
  // 작은 로컬 모델은 "JSON만 출력하라"는 지시를 자주 어긴다 — Ollama structured outputs(format에 JSON Schema)로
  // 디코딩 단계에서 형식을 강제하고, 그래도 zod로 한 번 더 검증한다.
  async function completeJson<T>(system: string, user: string, schema: z.ZodType<T>): Promise<T> {
    const content = await ollamaChat(
      baseUrl,
      model,
      [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      z.toJSONSchema(schema) as Record<string, unknown>
    );
    return schema.parse(parseJsonLoose(content));
  }

  return {
    extractPosting({ text }) {
      return completeJson(EXTRACT_SYSTEM_PROMPT, text, extractedPostingSchema);
    },
    compareResume(posting: JobPosting, resume: ResumeProfile) {
      const schema = resume.coverLetterText?.trim() ? analysisResultWithCoverLetterSchema : analysisResultSchema;
      return completeJson(COMPARE_SYSTEM_PROMPT, buildCompareUserPrompt(posting, resume), schema);
    },
    async generateQuestions(posting: JobPosting) {
      return (await completeJson(QUESTIONS_SYSTEM_PROMPT, buildPostingSummary(posting), questionsSchema)).questions;
    },
    async generateFeedback(question: string, answer: string) {
      const user = `질문: ${question}\n답변: ${answer || "(작성하지 않음)"}`;
      return (await completeJson(FEEDBACK_SYSTEM_PROMPT, user, feedbackSchema)).feedback;
    },
  };
}
