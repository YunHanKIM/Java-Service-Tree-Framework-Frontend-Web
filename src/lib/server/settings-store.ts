import { readJsonFile, writeJsonFile } from "./data-dir";
import type { AiProviderName, AiSettings } from "@/types/domain";
import { DEFAULT_MODEL_BY_PROVIDER } from "@/lib/ai";
import { LOCAL_DEFAULT_BASE_URL } from "@/lib/ai/local";

interface StoredAiSettings {
  provider: AiProviderName;
  apiKey: string | null;
  model: string;
  shareAsDemoPool: boolean;
  // 이전 버전 파일에는 없는 필드라 optional — 읽을 때 기본값으로 채운다
  baseUrl?: string;
  visionModel?: string;
  /** apiKey가 어느 클라우드 프로바이더의 키인지 — local을 거쳐 다른 프로바이더로 바꿀 때 키가 잘못 붙지 않게 */
  keyProvider?: Exclude<AiProviderName, "local"> | null;
}

// userId -> 설정. 계정별로 격리 — 한 계정의 키가 다른 계정(특히 데모 계정)의 AI 호출에
// 함부로 쓰이는 일이 없도록 하기 위함이다. 단, 계정 소유자가 shareAsDemoPool을 명시적으로 켜면
// 그 키는 한도 내에서(src/lib/server/demo-pool.ts) 키 없는 방문자에게도 공유된다 — 포트폴리오
// 데모를 "방문자가 아무 설정 없이 실제 AI를 체험"할 수 있게 하기 위함. 자세한 배경은
// docs/ai/12_known_issues 참조.
type AiSettingsTable = Record<string, StoredAiSettings>;

const FILE = "ai-settings.json";
const DEFAULTS: StoredAiSettings = {
  provider: "anthropic",
  apiKey: null,
  model: DEFAULT_MODEL_BY_PROVIDER.anthropic,
  shareAsDemoPool: false,
  baseUrl: LOCAL_DEFAULT_BASE_URL,
  visionModel: "",
  keyProvider: null,
};

function readTable(): AiSettingsTable {
  return readJsonFile<AiSettingsTable>(FILE, {});
}

function writeTable(table: AiSettingsTable): void {
  writeJsonFile(FILE, table);
}

export function getStoredAiSettings(userId: string): Required<StoredAiSettings> {
  return { ...DEFAULTS, ...readTable()[userId] } as Required<StoredAiSettings>;
}

export function saveAiSettings(
  userId: string,
  input: {
    provider: AiProviderName;
    apiKey?: string;
    model?: string;
    shareAsDemoPool?: boolean;
    baseUrl?: string;
    visionModel?: string;
  }
): Required<StoredAiSettings> {
  const table = readTable();
  const current = getStoredAiSettings(userId);
  const keepExistingKey = input.apiKey === undefined || input.apiKey === "";
  // keyProvider가 없는 이전 버전 데이터는 저장 당시 provider가 곧 키의 주인이다
  const keyOwner = current.keyProvider ?? (current.provider !== "local" && current.apiKey ? current.provider : null);

  // 로컬 LLM은 키가 없다 — 로컬로 바꿔도 기존 클라우드 키는 지우지 않고 둔다(같은 프로바이더로 돌아갈 때 재입력 불필요).
  // 클라우드로 바꿀 때는 새 키를 입력했거나, 보관 중인 키의 주인이 그 프로바이더일 때만 키를 쓴다.
  let apiKey: string | null;
  let keyProvider: StoredAiSettings["keyProvider"];
  if (input.provider === "local") {
    apiKey = current.apiKey;
    keyProvider = keyOwner;
  } else if (!keepExistingKey) {
    apiKey = input.apiKey!;
    keyProvider = input.provider;
  } else if (keyOwner === input.provider) {
    apiKey = current.apiKey;
    keyProvider = keyOwner;
  } else {
    apiKey = null;
    keyProvider = null;
  }
  const next: Required<StoredAiSettings> = {
    provider: input.provider,
    apiKey,
    keyProvider,
    model: input.model || DEFAULT_MODEL_BY_PROVIDER[input.provider],
    shareAsDemoPool: input.shareAsDemoPool ?? current.shareAsDemoPool,
    baseUrl: input.baseUrl || current.baseUrl,
    visionModel: input.visionModel ?? current.visionModel,
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
    shareAsDemoPool: stored.shareAsDemoPool,
    baseUrl: stored.baseUrl ?? LOCAL_DEFAULT_BASE_URL,
    visionModel: stored.visionModel ?? "",
  };
}

/**
 * 방문자(키 없는 계정)가 쓸 수 있는 "무료 체험 풀" 키를 찾는다 — shareAsDemoPool을 켠 계정 중
 * 첫 번째(보통 소유자 계정 하나뿐). 여러 계정이 켜도 상관없지만 굳이 다중 풀을 관리할 필요는 없어
 * 첫 매치만 쓴다.
 */
export function findDemoPoolSettings(): (StoredAiSettings & { ownerUserId: string }) | null {
  const table = readTable();
  for (const [userId, settings] of Object.entries(table)) {
    // 로컬 LLM은 소유자 PC에서만 의미가 있어 방문자 풀로 공유하지 않는다
    if (settings.shareAsDemoPool && settings.apiKey && settings.provider !== "local") {
      return { ...settings, ownerUserId: userId };
    }
  }
  return null;
}
