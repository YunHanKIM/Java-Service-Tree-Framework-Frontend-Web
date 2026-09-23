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
| `/api/settings/ai` | GET/POST | **로그인한 계정 전용** AI 프로바이더·API 키·`shareAsDemoPool` 조회/저장(`userId`로 격리). GET 응답은 `{provider, hasKey, maskedKey, model, shareAsDemoPool}` — **원문 키는 절대 응답에 포함하지 않는다** |
| `/api/import-url` | POST | `{url}` → 서버가 실제로 fetch해서 `cheerio`로 본문 텍스트 추출. 실패 시 `code`(`FETCH_FAILED`/`NOT_HTML`/`EMPTY_TEXT`/`FETCH_ERROR`)와 함께 사람이 읽을 에러 메시지 반환 |
| `/api/parse-pdf` | POST | `FormData{file}` → `pdf-parse`(v2 `PDFParse` 클래스)로 텍스트 추출 |
| `/api/ai/extract` | POST | `{source, text}` → `ExtractedPosting` |
| `/api/ai/compare` | POST | `{posting, resume}` → `AnalysisResult`(prepItems는 서버에서 id 부여) |
| `/api/ai/questions` | POST | `{posting}` → `{questions: string[]}` |
| `/api/ai/feedback` | POST | `{question, answer}` → `{feedback: string}` |

`ai/*` 라우트는 `src/lib/server/ai-access.ts`의 `resolveAiAccess(userId, req)`로 자격증명을 정한다:

1. 로그인한 계정에 본인 키가 있으면 그걸 사용 (무제한, 본인 비용)
2. 없으면 `shareAsDemoPool`을 켠 계정(보통 소유자)의 키를 한도 내에서 사용 — 하루 총 50회·
   방문자(IP)당 하루 10회. 초과 시 **429**(`code: "DEMO_LIMIT_REACHED"`)
3. 공유된 풀도 없으면 **412**(`code: "NO_API_KEY"`)

클라이언트는 `NO_API_KEY`를 보고 설정 페이지로 안내하는 지속 알림을 띄운다(mock으로 대체하지 않음 —
실패를 정직하게 보여준다). `DEMO_LIMIT_REACHED`는 일반 에러 메시지로 표시된다.

## AI 프로바이더 — 실제 외부 API 호출 (계정별 키 + 선택적 한도부 공유 풀)

`/api/ai/*` 라우트는 `src/lib/ai/index.ts`의 `createAiProvider(provider, apiKey, model)`로 만든
`AiProvider`를 통해 **실제 OpenAI 또는 Anthropic API**를 호출한다. 키는 사용자가 설정 화면에서
직접 발급받아 입력하며(ChatGPT Plus·Claude Pro 구독과는 별개, 사용량 과금), 기본적으로 **로그인한
계정에만 연결되어** `.data/ai-settings.json`에 `userId`별로 저장되고 브라우저로 재전송되지 않는다 —
한 계정의 키가 다른 계정(데모 계정 포함)의 AI 호출에 함부로 쓰이는 일은 없다(`12_known_issues` 참조,
공개 배포 시 비용 격리를 위한 핵심 안전장치). 계정 소유자가 `shareAsDemoPool`을 명시적으로 켜면 그
키가 위 한도 내에서 방문자에게도 공유된다 — 포트폴리오 리뷰어가 키 등록 없이 실제 AI를 체험할 수
있게 하기 위한 절충. 응답은 zod 스키마(`src/lib/ai/schemas.ts`)로 검증하고, 마크다운 코드펜스나
잡담이 섞여도 `parseJsonLoose()`로 복구를 시도한다.

## Backend-Core 연동 (레거시 — 이 기능 범위에서는 미사용)

이 저장소의 원래 스캐폴딩 목적(Java-Service-Tree-Framework MSA 프론트엔드)을 위해 문단만 보존한다.
지원노트는 Backend-Core를 호출하지 않는다. 엔드포인트 관례(`/arms/...`, `*.do` 등)는 Backend-Core
`docs/ai/09_api_contract/` 참조.
