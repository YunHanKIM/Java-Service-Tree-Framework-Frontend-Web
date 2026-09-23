import { readJsonFile, writeJsonFile } from "./data-dir";
import type { AiProviderName, AiSettings } from "@/types/domain";
import { DEFAULT_MODEL_BY_PROVIDER } from "@/lib/ai";

interface StoredAiSettings {
  provider: AiProviderName;
  apiKey: string | null;
  model: string;
}

const FILE = "ai-settings.json";
const DEFAULTS: StoredAiSettings = {
  provider: "anthropic",
  apiKey: null,
  model: DEFAULT_MODEL_BY_PROVIDER.anthropic,
};

export function getStoredAiSettings(): StoredAiSettings {
  return readJsonFile<StoredAiSettings>(FILE, DEFAULTS);
}

export function saveAiSettings(input: { provider: AiProviderName; apiKey?: string; model?: string }): StoredAiSettings {
  const current = getStoredAiSettings();
  const keepExistingKey = input.apiKey === undefined || input.apiKey === "";
  const next: StoredAiSettings = {
    provider: input.provider,
    apiKey: keepExistingKey ? (current.provider === input.provider ? current.apiKey : null) : input.apiKey!,
    model: input.model || DEFAULT_MODEL_BY_PROVIDER[input.provider],
  };
  writeJsonFile(FILE, next);
  return next;
}

function maskKey(key: string | null): string | null {
  if (!key) return null;
  if (key.length <= 8) return "••••••••";
  return `${key.slice(0, 4)}••••${key.slice(-4)}`;
}

export function toPublicAiSettings(stored: StoredAiSettings): AiSettings {
  return {
    provider: stored.provider,
    hasKey: Boolean(stored.apiKey),
    maskedKey: maskKey(stored.apiKey),
    model: stored.model,
  };
}
