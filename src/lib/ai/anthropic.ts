import Anthropic from "@anthropic-ai/sdk";
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

export const ANTHROPIC_DEFAULT_MODEL = "claude-haiku-4-5-20251001";

export function createAnthropicProvider(apiKey: string, model: string = ANTHROPIC_DEFAULT_MODEL): AiProvider {
  const client = new Anthropic({ apiKey });

  async function completeJson(system: string, user: string): Promise<unknown> {
    let res;
    try {
      res = await client.messages.create({
        model,
        max_tokens: 1536,
        temperature: 0.4,
        system,
        messages: [{ role: "user", content: user }],
      });
    } catch (err) {
      throw new AiProviderError("Anthropic 호출에 실패했습니다. API 키와 모델명을 확인해주세요.", { cause: err });
    }
    const block = res.content.find((b) => b.type === "text");
    if (!block || block.type !== "text") throw new AiProviderError("Anthropic 응답이 비어 있습니다.");
    return parseJsonLoose(block.text);
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
