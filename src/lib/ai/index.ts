import type { AiProviderName } from "@/types/domain";
import { AiProvider, AiProviderError } from "./provider";
import { createOpenAiProvider, OPENAI_DEFAULT_MODEL } from "./openai";
import { createAnthropicProvider, ANTHROPIC_DEFAULT_MODEL } from "./anthropic";

export const DEFAULT_MODEL_BY_PROVIDER: Record<AiProviderName, string> = {
  openai: OPENAI_DEFAULT_MODEL,
  anthropic: ANTHROPIC_DEFAULT_MODEL,
};

export function createAiProvider(provider: AiProviderName, apiKey: string, model?: string): AiProvider {
  if (provider === "openai") return createOpenAiProvider(apiKey, model);
  if (provider === "anthropic") return createAnthropicProvider(apiKey, model);
  throw new AiProviderError(`지원하지 않는 AI 프로바이더: ${provider}`);
}

export { AiProviderError };
export type { AiProvider };
