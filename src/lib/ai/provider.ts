import type { AnalysisResult, ExtractedPosting, JobPosting, ResumeProfile } from "@/types/domain";

export class AiProviderError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message);
    this.name = "AiProviderError";
    if (options?.cause) this.cause = options.cause;
  }
}

/** compareResume은 prepItem id/done 상태를 다루지 않는다 — 라벨만 반환하고, 호출부(API route)가 PrepItem으로 변환한다 */
export type CompareResumeResult = Omit<AnalysisResult, "prepItems"> & { prepLabels: string[] };

export interface AiProvider {
  extractPosting(input: { source: string; text: string }): Promise<ExtractedPosting>;
  compareResume(posting: JobPosting, resume: ResumeProfile): Promise<CompareResumeResult>;
  generateQuestions(posting: JobPosting): Promise<string[]>;
  generateFeedback(question: string, answer: string): Promise<string>;
}

export const EXTRACT_SYSTEM_PROMPT = `당신은 채용공고 텍스트에서 핵심 정보를 추출하는 도우미입니다.
사용자가 제공한 채용공고 원문을 분석해서 아래 JSON 스키마에 맞는 객체만 출력하세요. 설명, 인사말, 마크다운 코드펜스 없이 순수 JSON만 출력하세요.

{
  "company": string,
  "title": string,
  "location": string,
  "employmentType": string,
  "deadline": string | null,
  "requiredSkills": string[],
  "preferredSkills": string[],
  "responsibilities": string[]
}

규칙:
- deadline은 알 수 있으면 YYYY-MM-DD 형식, 모르면 null.
- 원문에 없는 정보는 지어내지 말고 빈 문자열("") 또는 빈 배열([])로 둔다.
- requiredSkills/preferredSkills는 원문에 실제로 언급된 기술·도구·역량만 포함한다.`;

export const COMPARE_SYSTEM_PROMPT = `당신은 채용공고와 지원자의 이력서·자기소개서를 비교해 적합도를 분석하는 커리어 코치입니다.
아래 JSON 스키마에 맞는 객체만 출력하세요. 설명, 인사말, 마크다운 코드펜스 없이 순수 JSON만 출력하세요.

{
  "fitScore": number,
  "matchingSkills": [{ "name": string, "postingEvidence": string, "resumeEvidence": string }],
  "missingSkills": [{ "name": string, "reason": string }],
  "prepLabels": string[],
  "coverLetterReview": { "alignment": string, "suggestions": string[] } | null
}

규칙:
- fitScore: 0~100 정수. 필수 요건 충족도를 가장 크게, 우대 요건·업무 관련 경험을 그다음으로 반영한다.
- matchingSkills: 공고 요구사항과 이력서(원문이 있으면 원문 우선)에 공통으로 드러나는 기술/경험. postingEvidence/resumeEvidence는 반드시 주어진 입력 텍스트를 인용하거나 요약해서 작성 (지어내지 말 것).
- missingSkills: 공고에는 있지만 이력서에서 근거를 찾기 어려운 기술. reason은 왜 부족하다고 판단했는지 공고 내용을 근거로 설명.
- prepLabels: 부족한 부분을 보완하기 위한 구체적 준비 항목 2~4개 (예: "OO 개념 복습하기").
- coverLetterReview: 자기소개서가 주어졌을 때만 작성하고, 없으면 null. alignment는 자기소개서가 이 공고의 요구 역량·주요 업무를 얼마나 어필하는지 2~3문장으로 평가. suggestions는 이 공고에 맞춰 자기소개서를 고칠 구체적 제안 2~4개 (어떤 문단에 어떤 경험을 어떻게 보강할지).`;

export const QUESTIONS_SYSTEM_PROMPT = `당신은 기술 면접관입니다. 주어진 채용공고를 바탕으로 예상 면접 질문 5~6개를 한국어로 만드세요.
아래 JSON 스키마에 맞는 객체만 출력하세요. 설명, 인사말, 마크다운 코드펜스 없이 순수 JSON만 출력하세요.

{ "questions": string[] }

지원 동기, 공고의 필수 기술과 관련된 경험, 협업·문제 해결 경험, 회사/서비스 이해도를 골고루 포함하세요.`;

export const FEEDBACK_SYSTEM_PROMPT = `당신은 면접 코치입니다. 주어진 질문과 지원자의 답변을 보고 2~3문장으로 구체적이고 건설적인 피드백을 한국어로 작성하세요.
STAR 기법(상황-과제-행동-결과) 관점에서 잘한 점과 보완할 점을 짚어주세요.
아래 JSON 스키마에 맞는 객체만 출력하세요. 설명, 인사말, 마크다운 코드펜스 없이 순수 JSON만 출력하세요.

{ "feedback": string }`;

export function buildPostingSummary(posting: JobPosting): string {
  return [
    `회사: ${posting.company || "(미상)"}`,
    `직무: ${posting.title || "(미상)"}`,
    `근무지: ${posting.location || "(미상)"}`,
    `경력·고용형태: ${posting.employmentType || "(미상)"}`,
    `필수 기술: ${posting.requiredSkills.join(", ") || "(없음)"}`,
    `우대 기술: ${posting.preferredSkills.join(", ") || "(없음)"}`,
    `주요 업무: ${posting.responsibilities.join("; ") || "(없음)"}`,
  ].join("\n");
}

export function buildCompareUserPrompt(posting: JobPosting, resume: ResumeProfile): string {
  return [
    "[채용공고]",
    buildPostingSummary(posting),
    "",
    "[지원자 이력서]",
    `요약: ${resume.summary || "(없음)"}`,
    `보유 기술: ${resume.skills.join(", ") || "(없음)"}`,
    `경력 요약: ${resume.experienceSummary || "(없음)"}`,
    "",
    "[이력서 원문]",
    clip(resume.resumeText) || "(없음)",
    "",
    "[자기소개서]",
    clip(resume.coverLetterText) || "(없음 — coverLetterReview는 null)",
  ].join("\n");
}

// 이력서·자소서가 아주 길면 앞부분만 — 비용과 (특히 로컬 LLM의) 컨텍스트 한도를 넘지 않게
const DOC_MAX_CHARS = 6000;
function clip(text: string | undefined): string {
  const t = (text ?? "").trim();
  return t.length > DOC_MAX_CHARS ? `${t.slice(0, DOC_MAX_CHARS)}\n...(이하 생략)` : t;
}

/** 코드펜스나 잡담이 섞인 응답에서도 JSON을 최대한 복구해서 파싱한다 */
export function parseJsonLoose(text: string): unknown {
  const trimmed = text.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced ? fenced[1].trim() : trimmed;
  try {
    return JSON.parse(candidate);
  } catch {
    const start = candidate.indexOf("{");
    const end = candidate.lastIndexOf("}");
    if (start !== -1 && end !== -1 && end > start) {
      return JSON.parse(candidate.slice(start, end + 1));
    }
    throw new AiProviderError("AI 응답을 JSON으로 해석하지 못했습니다. 다시 시도해주세요.");
  }
}
