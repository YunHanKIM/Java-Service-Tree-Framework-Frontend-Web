import { readJsonFile, writeJsonFile } from "./data-dir";
import type { AiProviderName, AiSettings } from "@/types/domain";
import { DEFAULT_MODEL_BY_PROVIDER } from "@/lib/ai";

interface StoredAiSettings {
  provider: AiProviderName;
  apiKey: string | null;
  model: string;
}

// userId -> 설정. 계정별로 격리 — 한 계정의 키가 다른 계정(특히 데모 계정)의 AI 호출에
// 쓰이는 일이 없도록 하기 위함이다(공개 배포 시 타인이 소유자의 키를 쓰는 것을 방지).
// 자세한 배경은 docs/ai/12_known_issues 참조.
type AiSettingsTable = Record<string, StoredAiSettings>;

const FILE = "ai-settings.json";
const DEFAULTS: StoredAiSettings = {
  provider: "anthropic",
  apiKey: null,
  model: DEFAULT_MODEL_BY_PROVIDER.anthropic,
};

function readTable(): AiSettingsTable {
  return readJsonFile<AiSettingsTable>(FILE, {});
}

function writeTable(table: AiSettingsTable): void {
  writeJsonFile(FILE, table);
}

export function getStoredAiSettings(userId: string): StoredAiSettings {
  return readTable()[userId] ?? DEFAULTS;
}

export function saveAiSettings(
  userId: string,
  input: { provider: AiProviderName; apiKey?: string; model?: string }
): StoredAiSettings {
  const table = readTable();
  const current = table[userId] ?? DEFAULTS;
  const keepExistingKey = input.apiKey === undefined || input.apiKey === "";
  const next: StoredAiSettings = {
    provider: input.provider,
    apiKey: keepExistingKey ? (current.provider === input.provider ? current.apiKey : null) : input.apiKey!,
    model: input.model || DEFAULT_MODEL_BY_PROVIDER[input.provider],
  };
  table[userId] = next;
  writeTable(table);
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
