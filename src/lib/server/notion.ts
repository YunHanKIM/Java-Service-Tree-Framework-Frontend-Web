import { STAGE_LABELS } from "@/types/domain";
import type { JobPosting, PostingSource, Stage } from "@/types/domain";

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
  // 데이터베이스 자리에 일반 페이지 ID를 넣은 경우 — resolveDatabaseId가 이 코드를 보고 페이지 안에서 DB를 찾는다
  if (res.status === 400 && /is a page, not a database/i.test(data.message ?? "")) {
    throw new NotionError("데이터베이스가 아니라 일반 페이지 링크예요.", 400, "NOTION_IS_PAGE");
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

// 지원노트가 채우는 속성(= DB 표의 열). 사용자 DB에 없으면 자동으로 추가하고, 같은 이름인데 타입이 다르면
// 건드리지 않고 건너뛴다. 객체 순서가 새로 만드는 DB의 열 순서가 된다.
const MANAGED_PROPERTIES = {
  "적합도 등급": {
    select: {
      options: [
        { name: "🟢 높음", color: "green" },
        { name: "🟡 보통", color: "yellow" },
        { name: "🔴 낮음", color: "red" },
      ],
    },
  },
  적합도: { number: { format: "number" } },
  "지원 단계": {
    select: {
      options: [
        { name: "관심", color: "gray" },
        { name: "지원예정", color: "blue" },
        { name: "지원완료", color: "purple" },
        { name: "면접", color: "orange" },
        { name: "결과", color: "green" },
      ],
    },
  },
  회사: { rich_text: {} },
  마감일: { date: {} },
  근무지: { rich_text: {} },
  고용형태: { rich_text: {} },
  "필수 기술": { multi_select: {} },
  "입력 방식": {
    select: {
      options: [
        { name: "링크", color: "blue" },
        { name: "붙여넣기", color: "gray" },
        { name: "이미지", color: "pink" },
        { name: "PDF", color: "red" },
      ],
    },
  },
  "원문 링크": { url: {} },
  분석일: { date: {} },
} as const;
type ManagedName = keyof typeof MANAGED_PROPERTIES;

const SOURCE_LABELS: Record<PostingSource, string> = { link: "링크", paste: "붙여넣기", image: "이미지", pdf: "PDF" };

/**
 * 사용자가 넣은 링크가 DB면 그대로, 일반 페이지면 ① 그 페이지 안의 첫 번째 인라인 DB를 쓰고 ② 없으면 그 페이지
 * 아래에 "지원노트 공고" DB를 새로 만든다 — 노션 사용자는 DB 링크와 페이지 링크를 구분하기 어렵기 때문(실제 문의).
 */
export async function resolveDatabaseId(
  token: string,
  id: string
): Promise<{ databaseId: string; created: boolean }> {
  try {
    await notionFetch<NotionDatabase>(token, `/databases/${id}`, "GET");
    return { databaseId: id, created: false };
  } catch (err) {
    if (!(err instanceof NotionError) || err.code !== "NOTION_IS_PAGE") throw err;
  }

  const children = await notionFetch<{ results: { id: string; type: string }[] }>(
    token,
    `/blocks/${id}/children?page_size=100`,
    "GET"
  );
  const inline = children.results.find((b) => b.type === "child_database");
  if (inline) return { databaseId: inline.id.replace(/-/g, ""), created: false };

  const db = await notionFetch<{ id: string }>(token, "/databases", "POST", {
    parent: { type: "page_id", page_id: id },
    is_inline: true,
    icon: { type: "emoji", emoji: "📋" },
    title: rich("지원노트 공고"),
    properties: { 공고: { title: {} }, ...MANAGED_PROPERTIES },
  });
  return { databaseId: db.id.replace(/-/g, ""), created: true };
}

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

// ---------- 블록 빌더 ----------

type Span = string | { text: string; bold?: boolean; italic?: boolean; color?: string; link?: string };

/** 서식 있는 rich_text — 조각마다 굵게·색·링크를 줄 수 있다 (조각당 1,900자 제한) */
function rich(...spans: Span[]) {
  return spans
    .map((s) => (typeof s === "string" ? { text: s } : s))
    .filter((s) => s.text)
    .map((s) => ({
      type: "text",
      text: { content: s.text.slice(0, TEXT_LIMIT), link: s.link ? { url: s.link } : null },
      annotations: { bold: Boolean(s.bold), italic: Boolean(s.italic), color: s.color ?? "default" },
    }));
}
const block = (type: string, body: object) => ({ object: "block", type, [type]: body });
const heading = (...spans: Span[]) => block("heading_2", { rich_text: rich(...spans) });
const paragraph = (...spans: Span[]) => block("paragraph", { rich_text: rich(...spans) });
const bullet = (...spans: Span[]) => block("bulleted_list_item", { rich_text: rich(...spans) });
const todo = (label: string, checked: boolean) => block("to_do", { rich_text: rich(label), checked });
const quote = (content: string) => block("quote", { rich_text: rich(content) });
const divider = () => block("divider", {});
const callout = (emoji: string, color: string, ...spans: Span[]) =>
  block("callout", { rich_text: rich(...spans), icon: { type: "emoji", emoji }, color });
const toggle = (title: Span[], children: object[]) => block("toggle", { rich_text: rich(...title), children });

/** 첫 행이 머리글인 표 — 첫 열(역량 이름)은 굵게 */
function table(headers: string[], rows: string[][]) {
  const row = (cells: string[], header: boolean) =>
    block("table_row", { cells: cells.map((c, i) => rich({ text: c || "-", bold: header || i === 0 })) });
  return block("table", {
    table_width: headers.length,
    has_column_header: true,
    has_row_header: false,
    children: [row(headers, true), ...rows.map((r) => row(r, false))],
  });
}

function fitGrade(score: number): { name: string; emoji: string; label: string; color: string } {
  if (score >= 70) return { name: "🟢 높음", emoji: "🟢", label: "높음", color: "green_background" };
  if (score >= 40) return { name: "🟡 보통", emoji: "🟡", label: "보통", color: "yellow_background" };
  return { name: "🔴 낮음", emoji: "🔴", label: "낮음", color: "red_background" };
}

/** ▰▰▰▰▰▱▱▱▱▱ — 노션 API로는 숫자 속성의 막대 표시를 켤 수 없어 본문에 글자로 그린다 */
const progressBar = (score: number) => "▰".repeat(Math.round(score / 10)) + "▱".repeat(10 - Math.round(score / 10));

function dDay(deadline: string | null): string | null {
  if (!deadline || !/^\d{4}-\d{2}-\d{2}$/.test(deadline)) return null;
  const days = Math.round((new Date(`${deadline}T00:00:00`).getTime() - new Date().setHours(0, 0, 0, 0)) / 86400000);
  return days > 0 ? `D-${days}` : days === 0 ? "D-Day" : "마감";
}

function buildBlocks(posting: JobPosting): object[] {
  const a = posting.analysis;
  const blocks: object[] = [];

  // 1) 적합도 요약 — 앱의 "공고 적합도" 카드와 같은 내용(점수·막대·근거)
  if (a?.fitScore !== undefined) {
    const g = fitGrade(a.fitScore);
    blocks.push(
      callout(
        g.emoji,
        g.color,
        { text: `공고 적합도 ${a.fitScore} / 100 · ${g.label}`, bold: true },
        `\n${progressBar(a.fitScore)}`,
        a.fitReason ? `\n\n${a.fitReason}` : ""
      )
    );
  } else {
    blocks.push(callout("⏳", "gray_background", "아직 이력서 비교 분석 전이에요. 분석이 끝난 뒤 다시 저장하면 결과가 들어가요."));
  }

  // 2) 공고 기본 정보
  const d = dDay(posting.deadline);
  const info: Span[] = [
    { text: posting.company || "회사 미상", bold: true },
    ` · ${posting.title || "직무 미상"}`,
    posting.location ? `\n📍 ${posting.location}` : "",
    posting.employmentType ? `   💼 ${posting.employmentType}` : "",
    posting.deadline ? `   📅 ${posting.deadline}${d ? ` (${d})` : ""}` : "",
  ];
  if (posting.originalUrl) info.push("\n", { text: "🔗 공고 원문 보기", link: posting.originalUrl });
  blocks.push(callout("📌", "gray_background", ...info));

  if (a) {
    blocks.push(divider());

    // 3) 일치 / 보완 경험 — 근거를 나란히 비교할 수 있게 표로
    blocks.push(heading(`✅ 일치하는 경험 (${a.matchingSkills.length})`));
    blocks.push(
      a.matchingSkills.length
        ? table(
            ["역량", "공고 근거", "내 이력서 근거"],
            a.matchingSkills.slice(0, MAX_LIST_ITEMS).map((s) => [s.name, s.postingEvidence, s.resumeEvidence])
          )
        : paragraph({ text: "일치하는 경험을 찾지 못했어요.", color: "gray" })
    );

    blocks.push(heading(`⚠️ 보완할 경험 (${a.missingSkills.length})`));
    blocks.push(
      a.missingSkills.length
        ? table(["역량", "판단 근거"], a.missingSkills.slice(0, MAX_LIST_ITEMS).map((s) => [s.name, s.reason]))
        : paragraph({ text: "보완할 경험이 없어요. 훌륭해요!", color: "gray" })
    );

    // 4) 준비 항목 — 노션에서도 바로 체크할 수 있게 할 일 블록으로
    if (a.prepItems.length) {
      blocks.push(heading("📋 추천 준비 항목"));
      a.prepItems.slice(0, MAX_LIST_ITEMS).forEach((p) => blocks.push(todo(p.label, p.done)));
    }

    // 5) 자기소개서 피드백 — 길어서 접어둔다
    if (a.coverLetterReview) {
      blocks.push(
        toggle(
          [{ text: "✍️ 자기소개서 피드백", bold: true }],
          [
            quote(a.coverLetterReview.alignment),
            ...a.coverLetterReview.suggestions.slice(0, MAX_LIST_ITEMS).map((s) => bullet(s)),
          ]
        )
      );
    }
  }

  // 6) 공고 원문 요약 — 참고용이라 접어둔다
  const summary: object[] = [];
  if (posting.requiredSkills.length) {
    summary.push(bullet({ text: "필수: ", bold: true }, posting.requiredSkills.slice(0, MAX_SKILLS).join(", ")));
  }
  if (posting.preferredSkills.length) {
    summary.push(bullet({ text: "우대: ", bold: true }, posting.preferredSkills.slice(0, MAX_SKILLS).join(", ")));
  }
  posting.responsibilities.slice(0, MAX_LIST_ITEMS).forEach((r) => summary.push(bullet({ text: "업무: ", bold: true }, r)));
  if (summary.length) blocks.push(toggle([{ text: "📄 공고 요약 (자격요건·우대사항·주요업무)", bold: true }], summary));

  blocks.push(divider());
  blocks.push(
    paragraph({ text: `지원노트에서 저장 · ${new Date().toISOString().slice(0, 10)}`, italic: true, color: "gray" })
  );
  return blocks.slice(0, MAX_BLOCKS);
}

// multi_select 옵션 이름에는 쉼표를 쓸 수 없고 100자 제한이 있다
const selectName = (s: string) =>
  s
    .replace(/,/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 100);

export async function exportPostingToNotion(
  token: string,
  databaseId: string,
  posting: JobPosting,
  stage: Stage | null
): Promise<{ url: string }> {
  const { titleProp, usable } = await prepareDatabase(token, databaseId);
  const title = [posting.company, posting.title].filter(Boolean).join(" · ") || "제목 없는 공고";

  const properties: Record<string, unknown> = { [titleProp]: { title: rich(title) } };
  const set = (name: ManagedName, value: unknown) => {
    if (usable.has(name)) properties[name] = value;
  };
  const score = posting.analysis?.fitScore;
  if (score !== undefined) {
    set("적합도", { number: score });
    set("적합도 등급", { select: { name: fitGrade(score).name } });
  }
  if (stage) set("지원 단계", { select: { name: STAGE_LABELS[stage] } });
  if (posting.company) set("회사", { rich_text: rich(posting.company) });
  if (posting.deadline && /^\d{4}-\d{2}-\d{2}$/.test(posting.deadline)) set("마감일", { date: { start: posting.deadline } });
  if (posting.location) set("근무지", { rich_text: rich(posting.location) });
  if (posting.employmentType) set("고용형태", { rich_text: rich(posting.employmentType) });
  const skills = [...new Set(posting.requiredSkills.map(selectName).filter(Boolean))].slice(0, MAX_SKILLS);
  if (skills.length) set("필수 기술", { multi_select: skills.map((name) => ({ name })) });
  set("입력 방식", { select: { name: SOURCE_LABELS[posting.source] } });
  if (posting.originalUrl) set("원문 링크", { url: posting.originalUrl });
  set("분석일", { date: { start: new Date().toISOString().slice(0, 10) } });

  const page = await notionFetch<{ url: string }>(token, "/pages", "POST", {
    parent: { database_id: databaseId },
    icon: { type: "emoji", emoji: "🏢" },
    properties,
    children: buildBlocks(posting),
  });
  return { url: page.url };
}
