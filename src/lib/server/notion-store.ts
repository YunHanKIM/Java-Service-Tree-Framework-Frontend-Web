import { readJsonFile, writeJsonFile } from "./data-dir";
import type { NotionSettings } from "@/types/domain";

interface StoredNotionSettings {
  token: string | null;
  databaseId: string | null;
}

// userId -> Notion 연동 설정. AI 키와 마찬가지로 계정별로 격리하고 서버(.data/, gitignored)에만 둔다
type NotionSettingsTable = Record<string, StoredNotionSettings>;

const FILE = "notion-settings.json";
const DEFAULTS: StoredNotionSettings = { token: null, databaseId: null };

export function getStoredNotionSettings(userId: string): StoredNotionSettings {
  return { ...DEFAULTS, ...readJsonFile<NotionSettingsTable>(FILE, {})[userId] };
}

export function saveNotionSettings(userId: string, input: { token?: string; databaseId: string }): StoredNotionSettings {
  const table = readJsonFile<NotionSettingsTable>(FILE, {});
  const current = getStoredNotionSettings(userId);
  const next: StoredNotionSettings = {
    // 토큰 칸을 비워 저장하면 기존 토큰 유지 (AI 키와 같은 규칙)
    token: input.token ? input.token : current.token,
    databaseId: input.databaseId,
  };
  table[userId] = next;
  writeJsonFile(FILE, table);
  return next;
}

export function toPublicNotionSettings(stored: StoredNotionSettings): NotionSettings {
  const t = stored.token;
  return {
    hasToken: Boolean(t),
    maskedToken: t ? (t.length <= 8 ? "••••••••" : `${t.slice(0, 4)}••••${t.slice(-4)}`) : null,
    databaseId: stored.databaseId,
  };
}
