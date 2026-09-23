import OpenAI from "openai";
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
import { analysisResultSchema, extractedPostingSchema, feedbackSchema, questionsSchema } from "./schemas";

export const OPENAI_DEFAULT_MODEL = "gpt-4o-mini";

export function createOpenAiProvider(apiKey: string, model: string = OPENAI_DEFAULT_MODEL): AiProvider {
  const client = new OpenAI({ apiKey });

  async function completeJson(system: string, user: string): Promise<unknown> {
    let res;
    try {
      res = await client.chat.completions.create({
        model,
        temperature: 0.4,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
      });
    } catch (err) {
      throw new AiProviderError("OpenAI 호출에 실패했습니다. API 키와 모델명을 확인해주세요.", { cause: err });
    }
    const content = res.choices[0]?.message?.content;
    if (!content) throw new AiProviderError("OpenAI 응답이 비어 있습니다.");
    return parseJsonLoose(content);
  }

  return {
    async extractPosting({ text }) {
      const raw = await completeJson(EXTRACT_SYSTEM_PROMPT, text);
      return extractedPostingSchema.parse(raw);
    },
    async compareResume(posting: JobPosting, resume: ResumeProfile) {
      const raw = await completeJson(COMPARE_SYSTEM_PROMPT, buildCompareUserPrompt(posting, resume));
      return analysisResultSchema.parse(raw);
    },
    async generateQuestions(posting: JobPosting) {
      const raw = await completeJson(QUESTIONS_SYSTEM_PROMPT, buildPostingSummary(posting));
      return questionsSchema.parse(raw).questions;
    },
    async generateFeedback(question: string, answer: string) {
      const user = `질문: ${question}\n답변: ${answer || "(작성하지 않음)"}`;
      const raw = await completeJson(FEEDBACK_SYSTEM_PROMPT, user);
      return feedbackSchema.parse(raw).feedback;
    },
  };
}
