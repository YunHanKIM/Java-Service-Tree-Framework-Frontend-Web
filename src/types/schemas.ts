import { z } from "zod";

// API 경계 검증용 — src/types/domain.ts 타입과 형태를 맞춰 유지할 것
export const resumeProfileSchema = z.object({
  summary: z.string(),
  skills: z.array(z.string()),
  experienceSummary: z.string(),
  // 이전 버전 localStorage에는 없는 필드
  resumeText: z.string().max(20000).default(""),
  coverLetterText: z.string().max(20000).default(""),
});

export const jobPostingSchema = z.object({
  id: z.string(),
  source: z.enum(["link", "paste", "pdf", "image"]),
  company: z.string(),
  title: z.string(),
  location: z.string(),
  employmentType: z.string(),
  deadline: z.string().nullable(),
  requiredSkills: z.array(z.string()),
  preferredSkills: z.array(z.string()),
  responsibilities: z.array(z.string()),
  originalUrl: z.string().nullable(),
  bookmarked: z.boolean(),
  createdAt: z.string(),
  analysis: z.unknown().nullable(),
  notionPageUrl: z.string().nullable().optional(),
});

// localStorage에 저장된 분석 결과 — Notion 내보내기처럼 서버가 내용을 실제로 쓰는 곳에서만 검증한다
export const storedAnalysisSchema = z.object({
  fitScore: z.number().optional(),
  fitReason: z.string().optional(),
  matchingSkills: z.array(z.object({ name: z.string(), postingEvidence: z.string(), resumeEvidence: z.string() })),
  missingSkills: z.array(z.object({ name: z.string(), reason: z.string() })),
  prepItems: z.array(z.object({ id: z.string(), label: z.string(), done: z.boolean() })),
  coverLetterReview: z.object({ alignment: z.string(), suggestions: z.array(z.string()) }).nullable().optional(),
});
