"use client";

// 브라우저 localStorage 데이터 계층 — 실제 백엔드 DB 대신 사용 (docs/ai/09_api_contract, 10_data_model 참조).
// AI 호출·인증·설정은 서버(Route Handler)가 담당하고, 공고·지원현황·이력서·면접 데이터는 클라이언트에만 저장된다.
import { STAGES } from "@/types/domain";
import type {
  Application,
  ApplicationWithPosting,
  InterviewQA,
  JobPosting,
  ResumeProfile,
  Stage,
} from "@/types/domain";

const KEYS = {
  resume: "jiwonnote.resume",
  postings: "jiwonnote.postings",
  applications: "jiwonnote.applications",
  interview: "jiwonnote.interviewAnswers",
} as const;

export function generateId(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function readJson<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeJson<T>(key: string, value: T): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(key, JSON.stringify(value));
}

export const resumeStore = {
  get(): ResumeProfile {
    return readJson<ResumeProfile>(KEYS.resume, { summary: "", skills: [], experienceSummary: "" });
  },
  update(patch: Partial<ResumeProfile>): ResumeProfile {
    const next = { ...this.get(), ...patch };
    writeJson(KEYS.resume, next);
    return next;
  },
};

type NewPostingInput = Omit<JobPosting, "id" | "bookmarked" | "createdAt" | "analysis">;

export const postingsStore = {
  list(): JobPosting[] {
    return readJson<JobPosting[]>(KEYS.postings, []);
  },
  get(id: string): JobPosting | null {
    return this.list().find((p) => p.id === id) ?? null;
  },
  create(data: NewPostingInput): JobPosting {
    const posting: JobPosting = {
      ...data,
      id: generateId("posting"),
      bookmarked: false,
      createdAt: new Date().toISOString(),
      analysis: null,
    };
    const list = this.list();
    list.unshift(posting);
    writeJson(KEYS.postings, list);
    return posting;
  },
  update(id: string, patch: Partial<JobPosting>): JobPosting | null {
    const list = this.list();
    const idx = list.findIndex((p) => p.id === id);
    if (idx === -1) return null;
    list[idx] = { ...list[idx], ...patch };
    writeJson(KEYS.postings, list);
    return list[idx];
  },
  remove(id: string): void {
    writeJson(
      KEYS.postings,
      this.list().filter((p) => p.id !== id)
    );
  },
  saveAnalysis(id: string, analysis: JobPosting["analysis"]): JobPosting | null {
    return this.update(id, { analysis });
  },
};

export const applicationsStore = {
  list(): Application[] {
    return readJson<Application[]>(KEYS.applications, []);
  },
  get(id: string): Application | null {
    return this.list().find((a) => a.id === id) ?? null;
  },
  getByPosting(postingId: string): Application | null {
    return this.list().find((a) => a.postingId === postingId) ?? null;
  },
  create(input: { postingId: string; stage?: Stage }): Application {
    const existing = this.getByPosting(input.postingId);
    if (existing) return existing;
    const application: Application = {
      id: generateId("app"),
      postingId: input.postingId,
      stage: input.stage ?? "interested",
      resultNote: "",
      updatedAt: new Date().toISOString(),
    };
    const list = this.list();
    list.unshift(application);
    writeJson(KEYS.applications, list);
    return application;
  },
  updateStage(id: string, stage: Stage): Application | null {
    const list = this.list();
    const idx = list.findIndex((a) => a.id === id);
    if (idx === -1) return null;
    list[idx] = { ...list[idx], stage, updatedAt: new Date().toISOString() };
    writeJson(KEYS.applications, list);
    return list[idx];
  },
  updateResultNote(id: string, resultNote: string): Application | null {
    const list = this.list();
    const idx = list.findIndex((a) => a.id === id);
    if (idx === -1) return null;
    list[idx] = { ...list[idx], resultNote, updatedAt: new Date().toISOString() };
    writeJson(KEYS.applications, list);
    return list[idx];
  },
  remove(id: string): void {
    writeJson(
      KEYS.applications,
      this.list().filter((a) => a.id !== id)
    );
  },
  counts(): Record<Stage, number> {
    const list = this.list();
    return STAGES.reduce(
      (acc, stage) => {
        acc[stage] = list.filter((a) => a.stage === stage).length;
        return acc;
      },
      {} as Record<Stage, number>
    );
  },
  listWithPostings(): ApplicationWithPosting[] {
    const postings = postingsStore.list();
    return this.list().map((app) => ({
      ...app,
      posting: postings.find((p) => p.id === app.postingId) ?? null,
    }));
  },
};

export const interviewStore = {
  list(): InterviewQA[] {
    return readJson<InterviewQA[]>(KEYS.interview, []);
  },
  listByApplication(applicationId: string): InterviewQA[] {
    return this.list().filter((q) => q.applicationId === applicationId);
  },
  bulkCreate(applicationId: string, questions: string[]): InterviewQA[] {
    const created: InterviewQA[] = questions.map((question) => ({
      id: generateId("qa"),
      applicationId,
      question,
      answer: "",
      feedback: null,
    }));
    writeJson(KEYS.interview, [...created, ...this.list()]);
    return created;
  },
  updateAnswer(id: string, answer: string): InterviewQA | null {
    const list = this.list();
    const idx = list.findIndex((q) => q.id === id);
    if (idx === -1) return null;
    list[idx] = { ...list[idx], answer };
    writeJson(KEYS.interview, list);
    return list[idx];
  },
  setFeedback(id: string, feedback: string): InterviewQA | null {
    const list = this.list();
    const idx = list.findIndex((q) => q.id === id);
    if (idx === -1) return null;
    list[idx] = { ...list[idx], feedback };
    writeJson(KEYS.interview, list);
    return list[idx];
  },
};
