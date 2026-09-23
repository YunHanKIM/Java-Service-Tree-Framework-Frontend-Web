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

export const analysisResultSchema = z.object({
  matchingSkills: z.array(matchingSkillSchema).default([]),
  missingSkills: z.array(missingSkillSchema).default([]),
  prepLabels: z.array(z.string()).default([]),
});

export const questionsSchema = z.object({
  questions: z.array(z.string()).min(1),
});

export const feedbackSchema = z.object({
  feedback: z.string(),
});
