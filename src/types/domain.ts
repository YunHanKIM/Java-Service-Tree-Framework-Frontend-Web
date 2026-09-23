export const STAGES = ["interested", "planned", "applied", "interview", "result"] as const;
export type Stage = (typeof STAGES)[number];

export const STAGE_LABELS: Record<Stage, string> = {
  interested: "관심",
  planned: "지원예정",
  applied: "지원완료",
  interview: "면접",
  result: "결과",
};

export interface User {
  id: string;
  name: string;
  email: string;
}

export interface ResumeProfile {
  summary: string;
  skills: string[];
  experienceSummary: string;
}

export type PostingSource = "link" | "paste" | "pdf" | "image";

export interface JobPosting {
  id: string;
  source: PostingSource;
  company: string;
  title: string;
  location: string;
  employmentType: string;
  deadline: string | null;
  requiredSkills: string[];
  preferredSkills: string[];
  responsibilities: string[];
  originalUrl: string | null;
  bookmarked: boolean;
  createdAt: string;
  analysis: AnalysisResult | null;
}

export interface MatchingSkill {
  name: string;
  postingEvidence: string;
  resumeEvidence: string;
}

export interface MissingSkill {
  name: string;
  reason: string;
}

export interface PrepItem {
  id: string;
  label: string;
  done: boolean;
}

export interface AnalysisResult {
  matchingSkills: MatchingSkill[];
  missingSkills: MissingSkill[];
  prepItems: PrepItem[];
}

export interface Application {
  id: string;
  postingId: string;
  stage: Stage;
  resultNote: string;
  updatedAt: string;
}

export interface ApplicationWithPosting extends Application {
  posting: JobPosting | null;
}

export interface InterviewQA {
  id: string;
  applicationId: string;
  question: string;
  answer: string;
  feedback: string | null;
}

/** 공고 추출 단계 결과 — AnalysisResult로 넘어가기 전, 사용자가 확인·수정하는 중간 형태 */
export interface ExtractedPosting {
  company: string;
  title: string;
  location: string;
  employmentType: string;
  deadline: string | null;
  requiredSkills: string[];
  preferredSkills: string[];
  responsibilities: string[];
}

export type AiProviderName = "openai" | "anthropic" | "local";

export interface AiSettings {
  provider: AiProviderName;
  hasKey: boolean;
  maskedKey: string | null;
  model: string;
  /** provider가 "local"(Ollama)일 때만 의미 있음 */
  baseUrl: string;
  /** 이미지·스캔 PDF를 읽을 로컬 비전 모델 (비우면 OCR로 대체) */
  visionModel: string;
  /** 이 계정의 키를 키 없는 방문자에게 한도 내에서 무료로 공유할지 (포트폴리오 데모용) */
  shareAsDemoPool: boolean;
}
