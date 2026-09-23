import type { JobPosting } from "@/types/domain";

// 2022-06-28 버전은 "데이터베이스 = 단일 데이터 소스" 모델이라 database_id로 바로 페이지를 만들 수 있다.
// 2025-09-03부터는 data_source_id를 거쳐야 하는데, 공고 DB처럼 소스가 하나인 경우엔 구버전이 더 단순하다.
const NOTION_VERSION = "2022-06-28";
const API = "https://api.notion.com/v1";
// Notion rich_text 한 조각은 2000자 제한
const TEXT_LIMIT = 1900;
// 페이지 생성 시 children은 최대 100블록
const MAX_BLOCKS = 100;
// OCR 잡음이나 조작된 localStorage 데이터로 배열이 비정상적으로 길어도 페이로드·DB 옵션이 폭증하지 않게
const MAX_SKILLS = 30;
const MAX_LIST_ITEMS = 20;

export class NotionError extends Error {
  constructor(
    message: string,
    public status: number,
    public code: string
  ) {
    super(message);
  }
}

async function notionFetch<T>(token: string, path: string, method: "GET" | "POST" | "PATCH", body?: unknown): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${API}${path}`, {
      method,
      headers: {
        Authorization: `Bearer ${token}`,
        "Notion-Version": NOTION_VERSION,
        "Content-Type": "application/json",
      },
      body: body ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(15000),
    });
  } catch (err) {
    throw new NotionError(`Notion에 연결하지 못했어요. (${err instanceof Error ? err.message : "네트워크 오류"})`, 502, "NOTION_NETWORK");
  }
  const data = (await res.json().catch(() => ({}))) as { message?: string; code?: string };
  if (res.ok) return data as T;

  if (res.status === 401) {
    throw new NotionError("Notion 통합 토큰이 올바르지 않아요. 설정에서 다시 확인해주세요.", 401, "NOTION_UNAUTHORIZED");
  }
  if (res.status === 403) {
    throw new NotionError(
      "통합에 권한이 부족해요. Notion 통합 설정의 기능(Capabilities)에서 콘텐츠 읽기·업데이트·삽입을 모두 켜주세요.",
      403,
      "NOTION_FORBIDDEN"
    );
  }
  if (res.status === 404) {
    throw new NotionError(
      "데이터베이스를 찾을 수 없어요. 데이터베이스 ID를 확인하고, 해당 데이터베이스의 ··· → 연결(Connections)에 통합을 추가했는지 확인해주세요.",
      404,
      "NOTION_NOT_FOUND"
    );
  }
  if (res.status === 429) {
    throw new NotionError("Notion 요청이 너무 많아요. 잠시 후 다시 시도해주세요.", 429, "NOTION_RATE_LIMITED");
  }
  throw new NotionError(`Notion 요청이 실패했어요: ${data.message ?? `HTTP ${res.status}`}`, 502, data.code ?? "NOTION_ERROR");
}

/** 노션 링크(https://www.notion.so/ws/Title-<32hex>?v=...)나 하이픈 있는 UUID에서 데이터베이스 ID를 꺼낸다 */
export function parseDatabaseId(input: string): string | null {
  const trimmed = input.trim();
  let candidate = trimmed;
  try {
    // 링크면 경로 마지막 조각만 본다 — ?v=<view id>의 32자리를 DB ID로 오인하지 않도록
    candidate = new URL(trimmed).pathname.split("/").pop() ?? "";
  } catch {
    // URL이 아니면 입력 그대로
  }
  const match = candidate.replace(/-/g, "").match(/([0-9a-f]{32})$/i);
  return match ? match[1].toLowerCase() : null;
}

interface NotionDatabase {
  title?: { plain_text: string }[];
  properties: Record<string, { type: string }>;
}

// 지원노트가 채우는 속성. 사용자 DB에 없으면 자동으로 추가하고, 같은 이름인데 타입이 다르면 건드리지 않고 건너뛴다.
const MANAGED_PROPERTIES = {
  회사: { rich_text: {} },
  적합도: { number: { format: "number" } },
  마감일: { date: {} },
  "필수 기술": { multi_select: {} },
  "원문 링크": { url: {} },
  분석일: { date: {} },
} as const;
type ManagedName = keyof typeof MANAGED_PROPERTIES;

/**
 * DB를 조회하고 없는 관리 속성을 추가한다. 설정 저장 시에도 이걸 호출해서, 읽기만 되고 수정 권한이 없는
 * 통합을 내보내기 시점이 아니라 저장 시점에 걸러낸다(페이지 삽입 권한은 실제로 만들어보기 전엔 알 수 없다).
 */
export async function prepareDatabase(
  token: string,
  databaseId: string
): Promise<{ title: string; titleProp: string; usable: Set<ManagedName> }> {
  const db = await notionFetch<NotionDatabase>(token, `/databases/${databaseId}`, "GET");
  const title = db.title?.map((t) => t.plain_text).join("") || "(제목 없음)";
  const titleProp = Object.entries(db.properties).find(([, p]) => p.type === "title")?.[0];
  if (!titleProp) throw new NotionError("데이터베이스에 제목 속성이 없어요.", 400, "NOTION_BAD_DATABASE");

  const usable = new Set<ManagedName>();
  const missing: Record<string, unknown> = {};
  for (const [name, schema] of Object.entries(MANAGED_PROPERTIES) as [ManagedName, object][]) {
    const existing = db.properties[name];
    const wantedType = Object.keys(schema)[0];
    if (!existing) {
      missing[name] = schema;
      usable.add(name);
    } else if (existing.type === wantedType) {
      usable.add(name);
    }
  }
  if (Object.keys(missing).length > 0) {
    await notionFetch(token, `/databases/${databaseId}`, "PATCH", { properties: missing });
  }
  return { title, titleProp, usable };
}

const text = (content: string) => [{ type: "text", text: { content: content.slice(0, TEXT_LIMIT) } }];
const heading = (content: string) => ({ object: "block", type: "heading_2", heading_2: { rich_text: text(content) } });
const paragraph = (content: string) => ({ object: "block", type: "paragraph", paragraph: { rich_text: text(content) } });
const bullet = (content: string) => ({
  object: "block",
  type: "bulleted_list_item",
  bulleted_list_item: { rich_text: text(content) },
});
const todo = (content: string, checked: boolean) => ({ object: "block", type: "to_do", to_do: { rich_text: text(content), checked } });

function buildBlocks(posting: JobPosting): object[] {
  const a = posting.analysis;
  const blocks: object[] = [heading("공고 요약")];
  const meta = [posting.location && `근무지: ${posting.location}`, posting.employmentType && `고용형태: ${posting.employmentType}`]
    .filter(Boolean)
    .join(" · ");
  if (meta) blocks.push(paragraph(meta));
  if (posting.requiredSkills.length) blocks.push(bullet(`필수 기술: ${posting.requiredSkills.slice(0, MAX_SKILLS).join(", ")}`));
  if (posting.preferredSkills.length) blocks.push(bullet(`우대 기술: ${posting.preferredSkills.slice(0, MAX_SKILLS).join(", ")}`));
  posting.responsibilities.slice(0, MAX_LIST_ITEMS).forEach((r) => blocks.push(bullet(`업무: ${r}`)));

  if (a) {
    if (a.fitScore !== undefined) blocks.push(heading(`적합도 ${a.fitScore} / 100`));
    blocks.push(heading(`일치하는 경험 (${a.matchingSkills.length})`));
    a.matchingSkills.slice(0, MAX_LIST_ITEMS).forEach((s) => blocks.push(bullet(`${s.name} — 공고: ${s.postingEvidence} / 내 이력서: ${s.resumeEvidence}`)));
    blocks.push(heading(`보완할 경험 (${a.missingSkills.length})`));
    a.missingSkills.slice(0, MAX_LIST_ITEMS).forEach((s) => blocks.push(bullet(`${s.name} — ${s.reason}`)));
    if (a.prepItems.length) {
      blocks.push(heading("추천 준비 항목"));
      a.prepItems.slice(0, MAX_LIST_ITEMS).forEach((p) => blocks.push(todo(p.label, p.done)));
    }
    if (a.coverLetterReview) {
      blocks.push(heading("자기소개서 피드백"));
      blocks.push(paragraph(a.coverLetterReview.alignment));
      a.coverLetterReview.suggestions.slice(0, MAX_LIST_ITEMS).forEach((s) => blocks.push(bullet(s)));
    }
  } else {
    blocks.push(paragraph("아직 이력서 비교 분석 전이에요."));
  }
  blocks.push(paragraph("지원노트에서 저장됨"));
  return blocks.slice(0, MAX_BLOCKS);
}

// multi_select 옵션 이름에는 쉼표를 쓸 수 없고 100자 제한이 있다
const selectName = (s: string) =>
  s
    .replace(/,/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 100);

export async function exportPostingToNotion(token: string, databaseId: string, posting: JobPosting): Promise<{ url: string }> {
  const { titleProp, usable } = await prepareDatabase(token, databaseId);
  const title = [posting.company, posting.title].filter(Boolean).join(" · ") || "제목 없는 공고";

  const properties: Record<string, unknown> = { [titleProp]: { title: text(title) } };
  const set = (name: ManagedName, value: unknown) => {
    if (usable.has(name)) properties[name] = value;
  };
  if (posting.company) set("회사", { rich_text: text(posting.company) });
  if (posting.analysis?.fitScore !== undefined) set("적합도", { number: posting.analysis.fitScore });
  if (posting.deadline && /^\d{4}-\d{2}-\d{2}$/.test(posting.deadline)) set("마감일", { date: { start: posting.deadline } });
  const skills = [...new Set(posting.requiredSkills.map(selectName).filter(Boolean))].slice(0, MAX_SKILLS);
  if (skills.length) set("필수 기술", { multi_select: skills.map((name) => ({ name })) });
  if (posting.originalUrl) set("원문 링크", { url: posting.originalUrl });
  set("분석일", { date: { start: new Date().toISOString().slice(0, 10) } });

  const page = await notionFetch<{ url: string }>(token, "/pages", "POST", {
    parent: { database_id: databaseId },
    properties,
    children: buildBlocks(posting),
  });
  return { url: page.url };
}
