import type { AiProviderName } from "@/types/domain";
import { AiProvider, AiProviderError } from "./provider";
import { createOpenAiProvider, OPENAI_DEFAULT_MODEL } from "./openai";
import { createAnthropicProvider, ANTHROPIC_DEFAULT_MODEL } from "./anthropic";
import { createLocalProvider, LOCAL_DEFAULT_BASE_URL, LOCAL_DEFAULT_MODEL } from "./local";

export const DEFAULT_MODEL_BY_PROVIDER: Record<AiProviderName, string> = {
  openai: OPENAI_DEFAULT_MODEL,
  anthropic: ANTHROPIC_DEFAULT_MODEL,
  local: LOCAL_DEFAULT_MODEL,
};

export function createAiProvider(credentials: {
  provider: AiProviderName;
  apiKey: string;
  model: string;
  baseUrl?: string | null;
}): AiProvider {
  const { provider, apiKey, model, baseUrl } = credentials;
  if (provider === "openai") return createOpenAiProvider(apiKey, model);
  if (provider === "anthropic") return createAnthropicProvider(apiKey, model);
  if (provider === "local") return createLocalProvider(baseUrl || LOCAL_DEFAULT_BASE_URL, model);
  throw new AiProviderError(`지원하지 않는 AI 프로바이더: ${provider}`);
}

export { AiProviderError };
export type { AiProvider };
