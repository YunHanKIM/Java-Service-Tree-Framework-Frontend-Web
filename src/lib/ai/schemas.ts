import { z } from "zod";

export const extractedPostingSchema = z.object({
  company: z.string().default(""),
  title: z.string().default(""),
  location: z.string().default(""),
  employmentType: z.string().default(""),
  deadline: z.string().nullable().default(null),
  requiredSkills: z.array(z.string()).default([]),
  preferredSkills: z.array(z.string()).default([]),
  responsibilities: z.array(z.string()).default([]),
});

export const matchingSkillSchema = z.object({
  name: z.string(),
  postingEvidence: z.string(),
  resumeEvidence: z.string(),
});

export const missingSkillSchema = z.object({
  name: z.string(),
  reason: z.string(),
});

export const coverLetterReviewSchema = z.object({
  alignment: z.string(),
  suggestions: z.array(z.string()).default([]),
});

export const analysisResultSchema = z.object({
  // 범위 밖 값(예: 105, 72.5)은 거부하지 않고 API route에서 0~100 정수로 보정한다.
  // 필수 — 모델이 빠뜨리면 0점으로 위장하지 않고 검증 실패(재시도 안내)로 처리한다. optional로 두면 Ollama
  // structured outputs가 이 필드를 생략해도 되는 것으로 보고 실제로 자주 빠뜨린다(실측)
  fitScore: z.number(),
  fitReason: z.string(),
  matchingSkills: z.array(matchingSkillSchema).default([]),
  missingSkills: z.array(missingSkillSchema).default([]),
  prepLabels: z.array(z.string()).default([]),
  coverLetterReview: coverLetterReviewSchema.nullable().default(null),
});

// 자기소개서가 있을 때 로컬 모델에 넘기는 형식 — nullable을 허용하면 structured outputs가 null을 골라버린다(실측)
export const analysisResultWithCoverLetterSchema = analysisResultSchema.extend({
  coverLetterReview: coverLetterReviewSchema,
});

export const questionsSchema = z.object({
  questions: z.array(z.string()).min(1),
});

export const feedbackSchema = z.object({
  feedback: z.string(),
});
