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
| `/api/settings/ai` | GET/POST | **로그인한 계정 전용** AI 프로바이더(`openai`/`anthropic`/`local`)·API 키·`shareAsDemoPool`·로컬 LLM `baseUrl`/`visionModel` 조회/저장(`userId`로 격리). GET 응답은 `{provider, hasKey, maskedKey, model, shareAsDemoPool, baseUrl, visionModel}` — **원문 키는 절대 응답에 포함하지 않는다**. `baseUrl`은 localhost/127.0.0.1/[::1]만 허용(SSRF 방지) |
| `/api/settings/ai/local-models` | GET | 저장된 `baseUrl`의 Ollama `/api/tags`를 조회해 설치된 모델 목록 반환 (연결 확인용) |
| `/api/settings/notion` | GET/POST | Notion 통합 토큰·데이터베이스 조회/저장. POST `{token?, database}` — `database`는 노션 링크나 ID. 저장 전에 실제로 DB를 조회해 검증하고 `{hasToken, maskedToken, databaseId, databaseTitle}` 반환 |
| `/api/notion/export` | POST | `{posting}`(분석 포함) → 사용자 DB에 페이지 생성, `{url}` 반환. 미설정이면 **412** `NOTION_NOT_CONFIGURED`, 토큰 오류는 400 `NOTION_UNAUTHORIZED`, DB 미연결은 404 `NOTION_NOT_FOUND` |
| `/api/import-url` | POST | `{url}` → `{text, originalUrl, method: "fetch"\|"browser"}`. 일반 fetch(JSON-LD JobPosting 우선) → 본문이 1500자 미만이면 헤드리스 Chromium으로 다시 읽고 더 긴 쪽 사용. 내부 주소는 400 `UNSAFE_URL`, 비HTML 415 `NOT_HTML`, 본문 없음 422 `EMPTY_TEXT` |
| `/api/parse-pdf` | POST | `FormData{file}` → `{text, fileName, method: "text"\|"vision"\|"ocr", notice?}`. 텍스트 레이어가 없으면 앞 3페이지를 렌더링해 비전 모델/OCR. 최대 15,000자(이력서·자소서도 이 라우트 사용) |
| `/api/image-to-text` | POST | `FormData{file}`(PNG/JPG/WEBP, ≤8MB) → `{text, method: "vision"\|"ocr", notice?}`. 비전 모델 실패 시 OCR로 대체하고 `notice`로 알림 |
| `/api/ai/extract` | POST | `{source: link\|paste\|pdf\|image, text}` → `ExtractedPosting` (text는 서버에서 12,000자로 자름) |
| `/api/ai/compare` | POST | `{posting, resume}` → `AnalysisResult`(prepItems는 서버에서 id 부여, `fitScore`는 0~100 정수로 보정, 자소서가 비어 있으면 `coverLetterReview`는 항상 null) |
| `/api/ai/questions` | POST | `{posting}` → `{questions: string[]}` |
| `/api/ai/feedback` | POST | `{question, answer}` → `{feedback: string}` |

`ai/*` 라우트는 `src/lib/server/ai-access.ts`의 `resolveAiAccess(userId, req)`로 자격증명을 정한다:

0. 계정의 provider가 `local`이면 키 없이 로컬 Ollama 사용 (데모 풀로는 절대 공유되지 않음)
1. 로그인한 계정에 본인 키가 있으면 그걸 사용 (무제한, 본인 비용)
2. 없으면 `shareAsDemoPool`을 켠 계정(보통 소유자)의 키를 한도 내에서 사용 — 하루 총 50회·
   방문자(IP)당 하루 10회. 초과 시 **429**(`code: "DEMO_LIMIT_REACHED"`)
3. 공유된 풀도 없으면 **412**(`code: "NO_API_KEY"`)

클라이언트는 `NO_API_KEY`를 보고 설정 페이지로 안내하는 지속 알림을 띄운다(mock으로 대체하지 않음 —
실패를 정직하게 보여준다). `DEMO_LIMIT_REACHED`는 일반 에러 메시지로 표시된다.

## AI 프로바이더 — 실제 외부 API 호출 (계정별 키 + 선택적 한도부 공유 풀)

`/api/ai/*` 라우트는 `src/lib/ai/index.ts`의 `createAiProvider(credentials)`로 만든
`AiProvider`를 통해 **실제 OpenAI·Anthropic API 또는 로컬 Ollama**를 호출한다. 키는 사용자가 설정 화면에서
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

## 로컬 LLM (Ollama) — `src/lib/ai/local.ts`

- OpenAI 호환 `/v1`이 아니라 **네이티브 `/api/chat`** 을 쓴다 — `/v1`은 `num_ctx`를 받지 않아 기본 컨텍스트
  (4096 토큰)를 넘는 이력서+자소서+공고 프롬프트가 조용히 잘리기 때문. `options.num_ctx = 16384`.
- `format`에 zod 스키마를 `z.toJSONSchema()`로 변환해 넘긴다(Ollama structured outputs) — 작은 로컬 모델이
  JSON 형식을 어기는 것을 디코딩 단계에서 막고, 응답은 다시 zod로 검증한다.
- 비전(이미지 → 텍스트)은 `messages[].images`(base64). 여러 페이지 합산 90초 예산을 넘기면 OCR로 전환.
- 404 = 모델 미설치(`ollama pull <model>` 안내), 연결 실패 = `ollama serve` 안내.

## Notion API — `src/lib/server/notion.ts`

- `Notion-Version: 2022-06-28` 고정 — 단일 데이터 소스 DB는 `parent.database_id`로 바로 페이지 생성 가능.
  2025-09-03 이후 버전은 `data_source_id`를 거쳐야 하므로 버전을 올릴 때 함께 수정할 것.
- 호출 순서: `GET /databases/{id}`(제목 속성 이름·기존 속성 확인) → 없는 관리 속성만 `PATCH /databases/{id}`로
  추가(같은 이름·다른 타입이면 건드리지 않고 그 값만 생략) → `POST /pages`.
- 관리 속성: `회사`(rich_text) · `적합도`(number) · `마감일`(date) · `필수 기술`(multi_select) · `원문 링크`(url) · `분석일`(date).
- 제한: rich_text 조각 1,900자로 자름(API 한도 2,000), children 최대 100블록, multi_select 이름의 쉼표 제거.
