"use client";

import type { AnalysisResult, ExtractedPosting, JobPosting, ResumeProfile } from "@/types/domain";

export class ApiError extends Error {
  status: number;
  code?: string;
  constructor(message: string, status: number, code?: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

async function postJson<T>(url: string, body: unknown): Promise<T> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(data.error ?? "요청이 실패했습니다.", res.status, data.code);
  return data as T;
}

async function postFile<T>(url: string, file: File, fallbackError: string): Promise<T> {
  const formData = new FormData();
  formData.append("file", file);
  const res = await fetch(url, { method: "POST", body: formData });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(data.error ?? fallbackError, res.status, data.code);
  return data as T;
}

export const api = {
  importUrl: (url: string) =>
    postJson<{ text: string; originalUrl: string; method: "fetch" | "browser" }>("/api/import-url", { url }),
  extractPosting: (source: string, text: string) => postJson<ExtractedPosting>("/api/ai/extract", { source, text }),
  compareResume: (posting: JobPosting, resume: ResumeProfile) =>
    postJson<AnalysisResult>("/api/ai/compare", { posting, resume }),
  generateQuestions: (posting: JobPosting) => postJson<{ questions: string[] }>("/api/ai/questions", { posting }),
  generateFeedback: (question: string, answer: string) =>
    postJson<{ feedback: string }>("/api/ai/feedback", { question, answer }),

  parsePdf: (file: File) =>
    postFile<{ text: string; fileName: string; method: "text" | "vision" | "ocr"; notice?: string }>(
      "/api/parse-pdf",
      file,
      "PDF 처리에 실패했습니다."
    ),
  imageToText: (file: File) =>
    postFile<{ text: string; method: "vision" | "ocr"; notice?: string }>(
      "/api/image-to-text",
      file,
      "이미지 처리에 실패했습니다."
    ),
};
