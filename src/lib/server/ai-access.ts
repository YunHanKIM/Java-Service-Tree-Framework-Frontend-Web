import type { NextRequest } from "next/server";
import { getStoredAiSettings, findDemoPoolSettings } from "./settings-store";
import { consumeDemoQuota, getClientIp } from "./demo-pool";
import type { AiProviderName } from "@/types/domain";

export interface AiCredentials {
  provider: AiProviderName;
  apiKey: string;
  model: string;
  /** 로컬 LLM(Ollama) 주소 — provider가 "local"일 때만 사용 */
  baseUrl: string | null;
  /** "own" = 본인이 등록한 키(무제한, 본인 비용) · "demo-pool" = 소유자가 공유한 체험 풀(일일 한도 적용) */
  source: "own" | "demo-pool";
}

export type AiAccessResult =
  | { ok: true; credentials: AiCredentials }
  | { ok: false; status: number; error: string; code: string };

/**
 * 호출자가 쓸 AI 자격증명을 정한다: 본인 키 우선(무제한) → 없으면 소유자가 공유한 데모 풀(일일 한도)
 * → 그것도 없으면 키 등록 안내. 4개 /api/ai/* 라우트가 모두 이 함수 하나를 거친다 — 한도 로직을
 * 라우트마다 복제하지 말 것. 자세한 배경은 docs/ai/12_known_issues 참조.
 */
export function resolveAiAccess(userId: string, req: NextRequest): AiAccessResult {
  const own = getStoredAiSettings(userId);
  if (own.provider === "local") {
    return {
      ok: true,
      credentials: { provider: "local", apiKey: "", model: own.model, baseUrl: own.baseUrl, source: "own" },
    };
  }
  if (own.apiKey) {
    return {
      ok: true,
      credentials: { provider: own.provider, apiKey: own.apiKey, model: own.model, baseUrl: null, source: "own" },
    };
  }

  const pool = findDemoPoolSettings();
  if (!pool) {
    return {
      ok: false,
      status: 412,
      code: "NO_API_KEY",
      error: "AI API 키가 설정되지 않았습니다. 설정에서 먼저 등록해주세요.",
    };
  }

  // 풀을 공유한 소유자 본인이 호출하는 경우는 한도 없이 통과(어차피 본인 비용)
  if (pool.ownerUserId === userId) {
    return {
      ok: true,
      credentials: { provider: pool.provider, apiKey: pool.apiKey!, model: pool.model, baseUrl: null, source: "own" },
    };
  }

  const quota = consumeDemoQuota(getClientIp(req));
  if (!quota.allowed) {
    return { ok: false, status: 429, code: "DEMO_LIMIT_REACHED", error: quota.reason };
  }

  return {
    ok: true,
    credentials: { provider: pool.provider, apiKey: pool.apiKey!, model: pool.model, baseUrl: null, source: "demo-pool" },
  };
}
