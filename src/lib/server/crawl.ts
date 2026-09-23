import * as cheerio from "cheerio";
import type { Frame } from "playwright";
import { assertPublicUrl, UnsafeUrlError } from "./url-guard";

const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0 Safari/537.36";
const MAX_REDIRECTS = 5;
const MIN_USEFUL_TEXT = 300;
// fetch 결과가 이보다 짧으면 메뉴·푸터만 있는 껍데기일 가능성이 높다 — 원티드(SPA)나 사람인(본문이 iframe)이
// 그렇다. 헤드리스 브라우저로도 읽어보고 더 긴 쪽을 쓴다
const CONFIDENT_FETCH_TEXT = 1500;

export class CrawlError extends Error {
  constructor(
    message: string,
    public code: string,
    public status: number
  ) {
    super(message);
  }
}

export interface CrawlResult {
  text: string;
  finalUrl: string;
  method: "fetch" | "browser";
}

function normalizeText(text: string): string {
  return text
    .replace(/[^\S\n]+/g, " ")
    .replace(/\n\s*\n+/g, "\n\n")
    .trim();
}

/** 채용 사이트 상당수가 SEO용으로 넣는 schema.org JobPosting(JSON-LD)에서 본문을 꺼낸다 — 가장 깨끗한 원문 */
function extractJobPostingJsonLd($: cheerio.CheerioAPI): string | null {
  const parts: string[] = [];
  $('script[type="application/ld+json"]').each((_, el) => {
    try {
      const data = JSON.parse($(el).text());
      const nodes: unknown[] = Array.isArray(data) ? data : data?.["@graph"] ?? [data];
      for (const node of nodes) {
        const n = node as Record<string, unknown>;
        if (n?.["@type"] !== "JobPosting") continue;
        const org = (n.hiringOrganization as Record<string, unknown> | undefined)?.name;
        const description = cheerio.load(String(n.description ?? "")).text();
        parts.push(
          [
            n.title && `직무: ${n.title}`,
            org && `회사: ${org}`,
            n.employmentType && `고용형태: ${n.employmentType}`,
            n.validThrough && `마감일: ${n.validThrough}`,
            description,
          ]
            .filter(Boolean)
            .join("\n")
        );
      }
    } catch {
      // 깨진 JSON-LD는 무시하고 본문 텍스트로 대체
    }
  });
  const text = normalizeText(parts.join("\n\n"));
  return text.length >= MIN_USEFUL_TEXT ? text : null;
}

async function fetchWithCheckedRedirects(startUrl: string): Promise<Response & { finalUrl: string }> {
  let current = startUrl;
  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    await assertPublicUrl(current); // 리다이렉트로 내부 주소로 튀는 경우까지 매 홉마다 검사
    const res = await fetch(current, {
      headers: { "User-Agent": USER_AGENT, "Accept-Language": "ko-KR,ko;q=0.9,en;q=0.8" },
      redirect: "manual",
      signal: AbortSignal.timeout(10000),
    });
    const location = res.headers.get("location");
    if (res.status >= 300 && res.status < 400 && location) {
      current = new URL(location, current).toString();
      continue;
    }
    return Object.assign(res, { finalUrl: current });
  }
  throw new CrawlError("리다이렉트가 너무 많아요.", "TOO_MANY_REDIRECTS", 502);
}

async function crawlWithFetch(url: string): Promise<CrawlResult | null> {
  const res = await fetchWithCheckedRedirects(url);
  if (!res.ok) return null;
  if (!(res.headers.get("content-type") || "").includes("text/html")) {
    throw new CrawlError("이 링크는 HTML 페이지가 아니에요. PDF라면 PDF 업로드를 이용해주세요.", "NOT_HTML", 415);
  }
  const $ = cheerio.load(await res.text());
  const fromJsonLd = extractJobPostingJsonLd($);
  if (fromJsonLd) return { text: fromJsonLd, finalUrl: res.finalUrl, method: "fetch" };

  $("script, style, noscript, nav, footer, header, svg, iframe").remove();
  const text = normalizeText($("body").text());
  return text.length >= MIN_USEFUL_TEXT ? { text, finalUrl: res.finalUrl, method: "fetch" } : null;
}

/**
 * 헤드리스 Chromium으로 JS까지 실행한 뒤 본문을 읽는다. 로컬 실행 전제 — 서버리스(Vercel 등)에는
 * 브라우저 바이너리가 없으므로 CRAWLER_BROWSER=off로 끌 수 있고, 로드 실패 시에도 조용히 건너뛴다.
 */
async function crawlWithBrowser(url: string): Promise<CrawlResult | null> {
  if (process.env.CRAWLER_BROWSER === "off") return null;
  let chromium;
  try {
    ({ chromium } = await import("playwright"));
  } catch {
    return null;
  }

  // 기본 headless shell은 봇 차단에 자주 걸려(사람인은 응답 자체가 멈춘다) 풀 Chromium의 new headless를 우선 쓴다
  let browser;
  try {
    browser = await chromium.launch({ headless: true, channel: "chromium" });
  } catch {
    try {
      browser = await chromium.launch({ headless: true });
    } catch {
      // 브라우저 미설치(npx playwright install chromium 필요) — 폴백 불가
      return null;
    }
  }
  try {
    const page = await browser.newPage({ userAgent: USER_AGENT, locale: "ko-KR" });
    // 문서·XHR 요청도 내부 주소로는 못 나가게 하고, 본문과 무관한 무거운 리소스는 받지 않는다
    await page.route("**/*", async (route) => {
      const req = route.request();
      if (["image", "media", "font"].includes(req.resourceType())) return route.abort();
      try {
        await assertPublicUrl(req.url());
        return route.continue();
      } catch {
        return route.abort();
      }
    });
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 20000 });
    // 광고 스크립트가 많은 사이트는 networkidle에 끝내 도달하지 않는다 — 짧게 기다리고 넘어간다
    await page.waitForLoadState("networkidle", { timeout: 5000 }).catch(() => {});

    const readText = (frame: Frame) =>
      frame
        .evaluate(() => {
          document.querySelectorAll("script, style, noscript, nav, footer, header, svg").forEach((el) => el.remove());
          return document.body?.innerText ?? "";
        })
        .catch(() => "");

    // 사람인처럼 공고 본문을 iframe에 넣는 사이트가 있다. 단 "다음 공고" 같은 다른 공고 iframe도 붙어 있어
    // 전부 합치면 공고가 섞인다 — 가장 긴 자식 프레임 하나(=본문)를 앞에, 제목·회사명이 있는 메인 프레임을 뒤에 둔다
    const mainText = await readText(page.mainFrame());
    let bodyText = "";
    for (const frame of page.mainFrame().childFrames()) {
      const t = await readText(frame);
      if (t.length > bodyText.length) bodyText = t;
    }
    const text = normalizeText([bodyText, mainText].filter((t) => t.trim()).join("\n\n"));
    return text.length >= MIN_USEFUL_TEXT ? { text, finalUrl: page.url(), method: "browser" } : null;
  } catch {
    return null;
  } finally {
    await browser.close().catch(() => {});
  }
}

export async function crawlPostingText(url: string): Promise<CrawlResult> {
  try {
    await assertPublicUrl(url);
  } catch (err) {
    throw new CrawlError(err instanceof Error ? err.message : "가져올 수 없는 주소예요.", "UNSAFE_URL", 400);
  }

  let fetched: CrawlResult | null = null;
  try {
    fetched = await crawlWithFetch(url);
  } catch (err) {
    if (err instanceof CrawlError) throw err;
    if (err instanceof UnsafeUrlError) throw new CrawlError(err.message, "UNSAFE_URL", 400);
    // 네트워크 오류·봇 차단 등 — 브라우저로 한 번 더 시도
  }
  let result = fetched;
  if (!fetched || fetched.text.length < CONFIDENT_FETCH_TEXT) {
    const rendered = await crawlWithBrowser(url);
    if (rendered && rendered.text.length > (fetched?.text.length ?? 0)) result = rendered;
  }
  if (!result) {
    throw new CrawlError(
      "페이지에서 공고 본문을 가져오지 못했어요. 로그인이 필요하거나 접근이 차단된 사이트일 수 있어요. 본문 복사 또는 화면 캡처 이미지로 입력해주세요.",
      "EMPTY_TEXT",
      422
    );
  }
  return result;
}
