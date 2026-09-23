# Frontend-Web — 소비 API 계약

## 지원노트 — 자체 API 라우트 (Next.js Route Handlers)

Backend-Core가 아니라 **이 저장소 자신의 서버(Route Handler)** 를 호출한다. 모든 요청은
`getSessionUserId()`로 인증을 확인하고, 미인증이면 `401`을 반환한다.

| 라우트 | 메서드 | 설명 |
|---|---|---|
| `/api/auth/login` | POST | `{email, password}` — 계정 없으면 자동 가입(bcrypt 해시), 있으면 검증. 세션 쿠키 발급 |
| `/api/auth/demo` | POST | 데모 계정(`demo@jiwonnote.app`) 세션 발급 |
| `/api/auth/logout` | POST | 세션 쿠키 삭제 |
| `/api/auth/session` | GET | 현재 로그인 사용자 조회 (`{user: User \| null}`) |
| `/api/settings/ai` | GET/POST | AI 프로바이더·API 키 조회/저장. GET 응답은 `{provider, hasKey, maskedKey, model}` — **원문 키는 절대 응답에 포함하지 않는다** |
| `/api/import-url` | POST | `{url}` → 서버가 실제로 fetch해서 `cheerio`로 본문 텍스트 추출. 실패 시 `code`(`FETCH_FAILED`/`NOT_HTML`/`EMPTY_TEXT`/`FETCH_ERROR`)와 함께 사람이 읽을 에러 메시지 반환 |
| `/api/parse-pdf` | POST | `FormData{file}` → `pdf-parse`(v2 `PDFParse` 클래스)로 텍스트 추출 |
| `/api/ai/extract` | POST | `{source, text}` → `ExtractedPosting` |
| `/api/ai/compare` | POST | `{posting, resume}` → `AnalysisResult`(prepItems는 서버에서 id 부여) |
| `/api/ai/questions` | POST | `{posting}` → `{questions: string[]}` |
| `/api/ai/feedback` | POST | `{question, answer}` → `{feedback: string}` |

`ai/*` 라우트는 `.data/ai-settings.json`에 API 키가 없으면 **412**(`code: "NO_API_KEY"`)를 반환한다.
클라이언트는 이 코드를 보고 설정 페이지로 안내하는 알림을 띄운다(mock으로 대체하지 않음 — 실패를
정직하게 보여준다).

## AI 프로바이더 — 실제 외부 API 호출

`/api/ai/*` 라우트는 `src/lib/ai/index.ts`의 `createAiProvider(provider, apiKey, model)`로 만든
`AiProvider`를 통해 **실제 OpenAI 또는 Anthropic API**를 호출한다. 키는 사용자가 설정 화면에서
직접 발급받아 입력하며(ChatGPT Plus·Claude Pro 구독과는 별개, 사용량 과금), 서버에만 저장되고
브라우저로 재전송되지 않는다. 응답은 zod 스키마(`src/lib/ai/schemas.ts`)로 검증하고, 마크다운
코드펜스나 잡담이 섞여도 `parseJsonLoose()`로 복구를 시도한다.

## Backend-Core 연동 (레거시 — 이 기능 범위에서는 미사용)

이 저장소의 원래 스캐폴딩 목적(Java-Service-Tree-Framework MSA 프론트엔드)을 위해 문단만 보존한다.
지원노트는 Backend-Core를 호출하지 않는다. 엔드포인트 관례(`/arms/...`, `*.do` 등)는 Backend-Core
`docs/ai/09_api_contract/` 참조.
