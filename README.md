# 지원노트 (JiwonNote)

> AI 채용공고 분석 · 이력서 비교 · 지원 관리를 한 곳에서.
> Next.js + TypeScript + shadcn/ui로 만든 포트폴리오 프로젝트입니다. 본인의 OpenAI/Anthropic
> API 키를 등록하거나, **내 PC의 로컬 LLM(Ollama)** 을 연결하면 실제 AI가 동작합니다. 분석 결과는
> **Notion 데이터베이스**로 보낼 수 있습니다.

## 서비스 소개

취업을 준비하다 보면 "공고를 저장해두고 → 내 이력서와 비교해보고 → 지원 여부를 결정하고 →
여러 곳에 지원한 현황을 관리하고 → 면접까지 준비"하는 과정을 여러 도구(메모장, 엑셀, 즐겨찾기)에
흩어놓게 됩니다. 지원노트는 이 흐름을 한 화면 안에서 처리합니다.

- **공고 분석**: 링크(크롤링) / 본문 붙여넣기 / 화면 캡처 이미지(Ctrl+V) / PDF(스캔본 포함) 중 하나로
  공고를 입력하면 AI가 핵심 정보를 구조화해서 추출
- **이력서·자기소개서 비교**: 업로드한 이력서·자기소개서 원문과 공고를 비교해 적합도(0~100), 일치하는
  경험 · 보완할 경험을 근거와 함께 제시하고, 이 공고에 맞춘 자기소개서 수정 제안까지
- **Notion 저장**: 분석 결과를 내 Notion 데이터베이스에 페이지로 저장 (필요한 속성은 자동 추가)
- **로컬 LLM**: API 키 없이 Ollama(qwen2.5 등)로 분석 — 비전 모델을 지정하면 이미지·스캔 PDF도 로컬에서 판독
- **지원 관리**: 관심 → 지원예정 → 지원완료 → 면접 → 결과, 5단계 칸반으로 관리 (드래그 앤 드롭)
- **면접 준비**: 공고 맞춤 예상 질문에 답변을 작성하고 AI 피드백을 받기

## 문제 정의 · 왜 이 프로젝트인가

단순 "AI 챗봇 UI"는 복잡한 상태 관리·비동기 흐름·실무 수준 UI 완성도를 보여주기 어렵습니다.
지원노트는 칸반 드래그 앤 드롭, 낙관적 업데이트와 실패 복구, 다단계 비동기 AI 흐름(추출 → 확인·수정
→ 비교분석), 실제 서버 사이드 URL 가져오기·PDF 파싱, 자체 인증 — 프론트엔드와 풀스택 양쪽에서
실제로 마주치는 문제들을 의도적으로 포함해서 만들었습니다.

## 사용자 흐름

```
회원가입/로그인(자동 가입) → 설정에서 이력서·자기소개서 업로드 + AI(API 키 또는 로컬 Ollama) + Notion 연결
   → 공고 URL/본문/캡처 이미지/PDF 입력 → AI 추출 → 사용자 확인·수정 → 저장
   → AI가 이력서·자소서와 비교(적합도, 일치/보완 경험 + 근거, 자소서 피드백) → Notion 저장 · 지원 목록에 저장
   → 칸반에서 단계 관리(드래그) → 예상 질문 생성 → 답변 작성 + AI 피드백
```

## 주요 화면

| 화면 | 경로 | 설명 |
|------|------|------|
| 대시보드 | `/` | 지원 파이프라인 차트, 마감 임박 공고, 최근 등록 공고 |
| 로그인 | `/login` | 이메일/비밀번호(최초 로그인 시 자동 가입) + 데모 계정 1클릭 체험 |
| 설정 | `/settings` | 이력서·자기소개서(PDF/TXT 업로드), AI 프로바이더(OpenAI/Anthropic/로컬 Ollama), Notion 연동 |
| 공고 분석 | `/analyze` | 4가지 입력 방식 → 실제 AI 추출 → 비교분석(적합도·자소서 피드백) → Notion 저장 |
| 지원 관리 | `/applications` | 5단 칸반, @dnd-kit 드래그 앤 드롭 + 낙관적 업데이트 |
| 면접 준비 | `/interview` | 예상 질문 · 답변 · AI 피드백 |

## 빠른 시작

```bash
npm install
npm run dev
# http://localhost:3000 → 로그인 페이지 → "데모 계정으로 체험하기"
```

AI 기능을 실제로 쓰려면 로그인 후 **설정**에서 OpenAI 또는 Anthropic API 키를 등록하세요
(ChatGPT Plus/Claude Pro 구독과는 별개로 발급받는 API 키이며, [platform.openai.com](https://platform.openai.com/api-keys)
또는 [console.anthropic.com](https://console.anthropic.com/settings/keys)에서 발급). 키가 없어도
앱은 정상 동작하며, AI 호출 시점에 "API 키가 필요해요" 안내가 뜹니다 — mock으로 눈속임하지 않습니다.

**API 키 없이 로컬 LLM으로 쓰려면** (Ollama 설치 후):

```bash
ollama pull qwen2.5:7b          # 분석 모델 (한국어 공고 추천)
ollama pull qwen2.5vl:7b        # 선택 — 이미지·스캔 PDF 판독용 비전 모델 (없으면 내장 OCR)
npx playwright install chromium # 선택 — 원티드·사람인처럼 JS로 그리는 채용 사이트 크롤링용
```

설정 → AI 연동에서 "로컬 LLM (Ollama)"를 선택하고 저장 → "연결 확인"으로 모델 목록을 확인하세요.

**Notion에 저장하려면**: [notion.so/profile/integrations](https://www.notion.so/profile/integrations)에서
내부 통합을 만들고 → 공고를 모을 데이터베이스의 ··· → 연결에 그 통합을 추가한 뒤 → 설정 → Notion 연동에
토큰과 데이터베이스 링크를 넣으세요. 회사·적합도·마감일·필수 기술 등 필요한 속성은 자동으로 추가됩니다.

**키는 계정별로 격리됩니다.** "데모 계정으로 체험하기"로 들어온 방문자는 키가 없는 별도 계정이라
소유자의 API 사용량·비용에 영향을 주지 않습니다. 이 앱을 공개 배포할 때는 본인의 실제 계정에만
키를 등록하고, 데모 계정에는 등록하지 마세요.

**포트폴리오로 공개할 때 — 방문자가 키 등록 없이 체험하게 하려면**: 설정에서 "방문자에게 무료
체험으로 공유"를 켜세요. 리뷰어는 "데모 계정으로 체험하기"만 눌러도 실제 AI를 써볼 수 있고,
비용은 하루 총 50회 · 방문자(IP)당 하루 10회로 제한됩니다(`src/lib/server/demo-pool.ts`에서
조정 가능). 소유자 본인이 로그인해서 쓸 때는 이 한도가 적용되지 않습니다.

## 기술 선택 근거

| 영역 | 선택 | 이유 |
|------|------|------|
| 프레임워크 | Next.js App Router + TypeScript | Server Component/Route Handler로 API 키를 서버에만 두면서, 인터랙션이 필요한 부분만 Client Component로 분리 |
| UI | Tailwind v4 + shadcn/ui(Base UI) | 컴포넌트를 밑바닥부터 만들지 않고도 접근성 있는 사이드바·다이얼로그·차트를 빠르게 조립 — 완성도 있는 UI에 집중 |
| AI 연동 | OpenAI/Anthropic SDK, 사용자 API 키 | 브라우저에 키를 노출하지 않으면서도 "진짜로 동작하는" AI — 서버가 키를 갖고 대신 호출 |
| 로컬 LLM | Ollama 네이티브 `/api/chat` | OpenAI 호환 `/v1`은 `num_ctx`를 못 바꿔 이력서+자소서+공고가 기본 4k 컨텍스트에서 조용히 잘림. structured outputs(zod → JSON Schema)로 작은 모델의 JSON 형식 위반도 방지 |
| Notion | REST API 직접 호출 | 필요한 건 DB 조회·속성 추가·페이지 생성 3개 호출뿐 — SDK 없이 버전(2022-06-28)을 명시적으로 고정 |
| 이미지·스캔 PDF | 로컬 비전 모델 → tesseract.js 폴백 | 비전 모델이 한글 인식이 훨씬 정확하지만 GPU가 없어도 동작하도록 OCR을 기본 경로로 유지 |
| 링크 크롤링 | 서버 fetch + cheerio → Playwright 폴백 | 브라우저에서 임의 도메인을 fetch하면 CORS로 막힘. JS로 본문을 그리는 채용 사이트는 헤드리스 Chromium으로 다시 읽음 |
| PDF 파싱 | pdf-parse (서버) | 실제 텍스트 추출 — 파일명만 보고 흉내내지 않음 |
| 도메인 데이터 | `localStorage` (DB 없음) | Postgres/Supabase 같은 외부 서비스 셋업 없이 clone 즉시 실행 가능하게 하는 의도된 단순화. 인증·API 키만 서버(`/.data/`, gitignored)에 |
| 드래그 앤 드롭 | @dnd-kit | 포인터+키보드 센서를 함께 지원, 접근성을 직접 구현하는 것보다 신뢰할 수 있음 |
| 폰트 | Pretendard (SIL OFL, 무료) | 한글 가독성이 좋은 오픈소스 폰트 |
| 디자인 | Notion 스타일 블루 팔레트 | 밝은 배경, 얇은 보더, 부드러운 그림자, 여백 중심의 절제된 UI |

## 아키텍처

```
src/app/(app)/*/page.tsx        # 인증 필요 화면 — 공유 레이아웃(사이드바)은 (app)/layout.tsx 하나
src/app/login/page.tsx          # 공개 화면
src/app/api/**/route.ts         # 서버 — 인증, 설정, URL/PDF 처리, AI 4종
        │
        ├── src/lib/server/     # session.ts(HMAC 쿠키) · users-store.ts(bcrypt) · settings-store.ts(API 키)
        │                       # crawl.ts + url-guard.ts(크롤링·SSRF) · ocr.ts(비전/OCR) · notion.ts(+notion-store)
        └── src/lib/ai/         # AiProvider 인터페이스 + openai.ts/anthropic.ts/local.ts(Ollama) (공통 프롬프트 + zod 검증)

src/lib/client/store.ts         # localStorage 데이터 계층 (공고·지원현황·이력서·면접)
src/lib/client/api.ts           # 클라이언트 → 자체 API 라우트 fetch 래퍼
src/components/                 # ui/(shadcn) + layout/ + 화면별 컴포넌트
```

인증은 서버(쿠키 세션)에, API 키는 서버 로컬 파일에, 나머지 도메인 데이터는 브라우저에 — 이렇게
나눈 이유는 `docs/ai/12_known_issues`에 설명. 자세한 구조는 `docs/ai/03_directory_structure`,
데이터 스키마는 `docs/ai/10_data_model` 참조.

## 어려웠던 문제와 해결 과정

- **"포트폴리오 리뷰어가 키 등록 없이 실제 AI를 체험"과 "소유자 비용 보호"는 서로 충돌한다**: 처음엔
  계정마다 각자 키를 등록하게 했는데, 정확한 지적을 받았다 — 리뷰어가 API 키까지 발급받아야 한다면
  아무도 안 써볼 거고, 그럴 거면 그냥 ChatGPT에 붙여넣으라는 것과 다를 게 없다. 그렇다고 소유자 키를
  아무 제한 없이 전역 공유하면 이전에 고친 보안 문제가 재발한다. 절충으로 "소유자가 명시적으로 켜는
  한도부 공유 풀"을 만들었다 — 하루 총량·IP별 한도로 비용 상한을 걸고, 소유자 본인 호출만 무제한으로
  뒀다. curl로 격리·한도·우회 세 가지를 각각 직접 재현해서 확인했다.
- **"AI 기능"을 클라이언트에 키를 노출하지 않고 진짜로 동작하게 만들기**: Route Handler가 서버
  로컬 파일에 저장된 키로 OpenAI/Anthropic을 직접 호출하고, 응답은 zod 스키마로 검증한다. 프롬프트가
  마크다운 코드펜스나 잡담을 섞어 보내도 `parseJsonLoose()`가 복구를 시도하고, 그래도 실패하면
  가짜 성공 대신 에러를 그대로 보여준다.
- **크롤러를 SSRF 발판으로 만들지 않기**: 링크 가져오기는 "서버가 사용자 대신 임의 URL에 요청하는"
  기능이라, 내부망·클라우드 메타데이터 주소를 막아야 한다. 처음엔 URL을 DNS 조회해서 사설 IP면
  거부했는데, codex 리뷰에서 두 가지 우회가 지적됐다 — ① `http://[::ffff:127.0.0.1]`은 URL 파서가
  `::ffff:7f00:1`로 정규화해 문자열 검사를 빠져나가고, ② 검사할 때와 실제 연결할 때 DNS를 두 번
  해석하니 그 사이 IP를 바꾸는 DNS rebinding이 통한다. 해결: fetch는 undici `Agent`의 커넥터에
  검사 로직(`guardedLookup`)을 꽂아 **실제 연결 시점의 해석**을 검사하고, 헤드리스 브라우저는 네트워크를
  직접 쓰지 못하게 모든 요청을 그 guarded fetch로 대신 보내 `route.fulfill()`로 돌려준다. 7가지 우회
  표기를 실제 요청으로 재현해 전부 막히는 것을 확인했다.
- **사람인 크롤링의 두 가지 함정**: Playwright 기본 headless shell은 사람인에서 응답이 아예 멈췄고
  (봇 차단 — 풀 Chromium의 new headless로 해결), 본문 iframe 옆에 "다음 공고" iframe이 붙어 있어 전부
  합치면 두 공고가 섞였다(가장 긴 자식 프레임만 사용). 둘 다 실제 공고 URL로 크롤링해보다 발견했다.
- **로컬 LLM의 조용한 실패**: Ollama의 OpenAI 호환 엔드포인트로 붙이면 코드는 가장 단순하지만,
  기본 컨텍스트(4096 토큰)를 넘는 입력을 **에러 없이 앞부분을 잘라** 버린다 — 이력서·자소서를 함께
  넣는 순간 분석 품질이 조용히 무너진다. 네이티브 `/api/chat`으로 바꿔 `num_ctx`를 지정하고,
  목 Ollama 서버로 실제 요청 본문(`num_ctx`·스키마·이력서/자소서 포함 여부)을 검증했다.
- **CORS 때문에 안 되던 링크 가져오기를 서버로 넘겨서 해결**: `/api/import-url`이 서버에서 fetch하고
  `cheerio`로 본문을 추출한다. 로그인 필요 페이지·JS 렌더링 SPA·봇 차단은 여전히 실패하지만, 이제
  "왜" 실패했는지 사람이 읽을 메시지로 알려주고 붙여넣기로 안내한다 — 예전처럼 항상 실패를
  흉내내는 게 아니라 진짜 실패 경로다.
- **칸반 드래그 앤 드롭 + 낙관적 업데이트**: `@dnd-kit`으로 구현하고, 상태 변경은 "먼저 React 상태를
  바꾸고 → 비동기 커밋을 시도하고 → 실패하면 되돌리는" 패턴(`applications/page.tsx`의
  `changeStage()`)을 직접 작성했다. 실패를 체감할 수 있도록 12% 확률로 실패를 시뮬레이션한다(서버
  커밋 자체는 로컬 localStorage 쓰기라 진짜 실패는 없지만, 인터랙션 패턴은 실제 네트워크 실패와 동일).
- **Base UI(Radix 아님)로 생성된 shadcn/ui 다루기**: `asChild` 대신 `render` prop, `Button`을 링크로
  쓸 땐 `nativeButton={false}`, `Select.Value`는 라벨을 자동 매핑해주지 않음 — 셋 다 Playwright로
  실제 클릭해보다가 발견했다. 자세한 내용은 `docs/ai/02_tech_stack`.
- **작은 한글 텍스트는 스크린샷만으로 판정하면 안 된다**: "관심으로 이동"의 "으"가 스크린샷에서
  괄호처럼 보여 존재하지 않는 문법 버그를 의심한 적이 있다 — `page.textContent()`로 실제 DOM
  문자열을 뽑아서 확인하고 나서야 오독이었음을 확인했다. (다만 로/으로 조사 자체는 실제로 하드코딩
  버그가 있었고 `src/lib/client/korean.ts`의 `roParticle()`로 고쳤다.)

## 성능 및 테스트 결과

- Playwright(Chromium)로 로그인 → 대시보드 → 설정(이력서 저장) → 공고 분석(3개 입력 탭,
  `NO_API_KEY` 경로) → 지원 관리(카드 클릭 다이얼로그, 드롭다운 단계 변경, 검색) → 면접 준비 →
  390px 모바일(오프캔버스 사이드바 포함) 전체 흐름 자동 스모크 테스트
- `npm run build` — TypeScript 타입 오류·ESLint 오류 없이 통과 (Turbopack)
- Playwright E2E: 설정(이력서 txt 업로드·자소서 입력) → 공고 분석(Ctrl+V 이미지 붙여넣기 → 비전 판독 →
  추출 → 비교) → 적합도·자기소개서 피드백 표시, Notion 미설정/잘못된 토큰 안내 — 목 Ollama 서버 사용
- 실제 사이트 크롤링(사람인 공고: fetch 859자 껍데기 → 브라우저 폴백 7,996자 본문), SSRF 우회 7종 차단,
  스캔 PDF·이미지 OCR(각 약 2초)
- 코드 리뷰: 기능 묶음마다 Codex(읽기 전용)로 리뷰 → 1차 4건(SSRF 2·키 오귀속·OCR 시간 예산),
  2차 3건(Notion 권한 검증·적합도 누락 처리·배열 상한) 반영
- 칸반 단계 변경 토스트 문구를 실제 DOM `textContent()`로 추출해 조사(로/으로) 정확성까지 검증

## 향후 개선 사항

- 도메인 데이터를 실제 DB(Postgres/Supabase 등)로 이전 — `store.ts` 인터페이스는 이미 그 교체를
  염두에 두고 설계됨
- 자동화 테스트(Playwright) 스위트를 리포지토리에 포함해 회귀 방지 — 현재는 수동 스모크만 수행
- Lighthouse 기반 성능 측정 및 Core Web Vitals 추적
- 크롬 확장 프로그램으로 공고 저장 (원본 개념 문서의 3단계 — 이번 범위에는 포함 안 함)

## 구조

```
.
├── src/
│   ├── app/                   # App Router 페이지 + API 라우트
│   ├── components/            # ui/(shadcn) + layout/ + 화면별 컴포넌트
│   ├── lib/                   # ai/ (서버), server/ (서버), client/ (브라우저)
│   └── types/                 # domain.ts, schemas.ts
├── .data/                     # 서버 로컬 "DB" (gitignored, 자동 생성)
└── docs/ai/                   # AI 작업 하네스 문서 (화면별 규칙: 06_page_playbooks/)
```

## 새 페이지 추가

1. 인증이 필요하면 `src/app/(app)/<page>/page.tsx`(사이드바 자동 적용), 아니면 `src/app/<page>/page.tsx`
2. 화면별 규칙은 `docs/ai/06_page_playbooks/<page>.md`에 기록
3. 새 API가 필요하면 `src/app/api/<name>/route.ts` — 인증 필요 시 `getSessionUserId()`로 401 처리,
   요청 바디는 zod로 검증

---

> 이 저장소는 원래 Java-Service-Tree-Framework MSA의 프론트엔드 모듈 스캐폴딩으로 시작했습니다.
> 현재는 "지원노트" 포트폴리오 프로젝트로 범위를 확정해 구현했습니다. 처음엔 스캐폴딩된 vanilla JS
> 스택을 그대로 따랐으나, 실제로 동작하는 AI·링크 가져오기가 필요하다는 피드백을 받아 같은 날
> Next.js로 전면 재구축했습니다 — 두 버전 모두 git 이력에 남아있습니다. 배경은
> `docs/ai/01_project_overview` 참조.
