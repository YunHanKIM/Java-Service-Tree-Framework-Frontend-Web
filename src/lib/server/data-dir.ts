import fs from "node:fs";
import path from "node:path";

// 서버 전용 로컬 "DB" 대체 — 실제 Postgres/Supabase 없이 바로 동작하게 하기 위한 의도된 단순화.
// .gitignore의 /.data/ 항목으로 커밋 대상에서 제외된다.
export const DATA_DIR = path.join(process.cwd(), ".data");

function ensureDataDir(): void {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
}

export function readJsonFile<T>(fileName: string, fallback: T): T {
  ensureDataDir();
  const filePath = path.join(DATA_DIR, fileName);
  if (!fs.existsSync(filePath)) return fallback;
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf-8")) as T;
  } catch {
    return fallback;
  }
}

export function writeJsonFile<T>(fileName: string, data: T): void {
  ensureDataDir();
  const filePath = path.join(DATA_DIR, fileName);
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf-8");
}
