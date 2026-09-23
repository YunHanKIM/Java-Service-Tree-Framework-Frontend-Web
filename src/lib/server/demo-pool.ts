import type { NextRequest } from "next/server";
import { readJsonFile, writeJsonFile } from "./data-dir";

// 포트폴리오 방문자가 키 등록 없이 AI를 체험할 수 있게 하되, 소유자 비용을 보호하는 한도.
// 값은 개인 포트폴리오 데모 규모를 가정한 것 — 필요하면 조정할 것.
const GLOBAL_DAILY_LIMIT = 50;
const PER_IP_DAILY_LIMIT = 10;

const FILE = "demo-usage.json";

interface UsageRecord {
  date: string; // YYYY-MM-DD
  total: number;
  byIp: Record<string, number>;
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function readUsage(): UsageRecord {
  const stored = readJsonFile<UsageRecord>(FILE, { date: today(), total: 0, byIp: {} });
  if (stored.date !== today()) {
    return { date: today(), total: 0, byIp: {} }; // 날짜가 바뀌면 자동 초기화
  }
  return stored;
}

export function getClientIp(req: NextRequest): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return req.headers.get("x-real-ip") || "unknown";
}

export type DemoQuotaResult = { allowed: true } | { allowed: false; reason: string };

/** 호출 전에 한도를 확인하고, 허용되면 즉시 사용량을 1 증가시킨다(체크와 소비를 분리하지 않음 — 데모 규모라 경쟁 조건 리스크 낮음) */
export function consumeDemoQuota(ip: string): DemoQuotaResult {
  const usage = readUsage();

  if (usage.total >= GLOBAL_DAILY_LIMIT) {
    return { allowed: false, reason: "오늘 무료 체험 한도에 도달했어요. 내일 다시 시도하거나 본인 API 키를 등록해주세요." };
  }
  const ipCount = usage.byIp[ip] ?? 0;
  if (ipCount >= PER_IP_DAILY_LIMIT) {
    return { allowed: false, reason: "이 기기의 오늘 무료 체험 한도에 도달했어요. 내일 다시 시도하거나 본인 API 키를 등록해주세요." };
  }

  usage.total += 1;
  usage.byIp[ip] = ipCount + 1;
  writeJsonFile(FILE, usage);
  return { allowed: true };
}
