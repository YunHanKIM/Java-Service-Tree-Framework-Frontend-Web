# Frontend-Web — 함정·안티패턴

## 지원노트의 의도된 단순화 (포트폴리오 범위)

- **AI 키가 없으면 기본적으로 AI 기능은 동작하지 않는다.** mock으로 대체하지 않고 `412 NO_API_KEY`를
  그대로 보여준다 — 설정 화면으로 안내하는 알림이 뜬다. 단, 소유자가 "데모 풀" 공유를 켰다면
  아래 항목처럼 한도 내에서 키 없이도 동작한다.
- **데모 풀 (`src/lib/server/ai-access.ts`, `demo-pool.ts`) — 방문자가 키 없이 체험할 수 있게 하는
  한도 장치.** 포트폴리오 리뷰어에게 "본인 키를 등록해야만 AI를 볼 수 있다"고 요구하면 사실상 아무도
  안 써본다는 사용자 피드백으로 추가했다. 설정에서 `shareAsDemoPool`을 켠 계정의 키가 있으면, 키
  없는 요청(데모 계정 등)은 그 키를 빌려 쓰되 하루 총 50회 · 방문자(IP)당 하루 10회로 제한된다
  (`resolveAiAccess()`가 본인 키 → 데모 풀 → 키 없음 순으로 판단). 한도 초과 시 `429
  DEMO_LIMIT_REACHED`. 풀을 공유한 계정 본인이 호출할 때는 한도가 적용되지 않는다(자기 비용이므로).
  **운영 시 주의**: `shareAsDemoPool`은 소유자의 실제 계정에서만 켤 것 — 데모 계정 자체에 실제 키를
  등록하면 계정별 격리(아래 항목)가 무의미해진다. 한도 값은 개인 포트폴리오 규모 가정 — 필요하면
  `demo-pool.ts`의 `GLOBAL_DAILY_LIMIT`/`PER_IP_DAILY_LIMIT`을 조정할 것.
- **API 키는 계정별로 격리된다 (중요 — 2026-09-23 수정).** 초기 구현은 `.data/ai-settings.json`에
  키를 전역 단일 레코드로 저장해, 공개 배포 시 아무나 자동 가입해서 소유자의 키로 AI를 호출할 수
  있는 취약점이 있었다. `src/lib/server/settings-store.ts`를 `userId`를 키로 하는 맵(`Record<userId,
  StoredAiSettings>`)으로 바꿔 계정별로 분리했다 — 데모 계정(`demo@jiwonnote.app`)은 기본적으로
  키가 없고, 소유자는 본인 실제 계정에만 키를 등록해야 한다. `/api/ai/*`·`/api/settings/ai`
  라우트는 항상 `getSessionUserId()`로 얻은 `userId`를 넘겨서 조회·저장한다 — `userId` 없이
  `getStoredAiSettings()`를 호출하는 코드를 추가하지 말 것(컴파일도 안 되게 시그니처를 바꿔뒀다).
  운영 배포 시에도 소유자 계정과 데모 계정을 분리해서 쓸 것 — 데모 계정에 실제 키를 등록하면
  이 격리가 무의미해진다.
- **실제 DB가 없다.** 공고·지원현황·이력서·면접 데이터는 브라우저 `localStorage`에만 저장된다
  (다른 브라우저/기기에서는 보이지 않음). 인증 사용자와 AI 설정(API 키)만 서버 로컬 JSON
  파일(`/.data/`, gitignored)에 저장된다 — Postgres/Supabase 같은 실제 DB 셋업 없이 바로 동작하게
  하기 위한 의도된 선택. `src/lib/client/store.ts`의 함수 시그니처를 유지한 채 내부만 실제 API 호출로
  바꾸면 실제 DB로 교체하기 쉽도록 설계했다.
- **세션은 자체 구현이다.** Auth.js 같은 라이브러리 대신 HMAC 서명 쿠키(`src/lib/server/session.ts`)를
  직접 구현했다. `SESSION_SECRET` 환경변수를 설정하지 않으면 개발용 기본값을 쓴다 — 실서비스라면
  반드시 `.env.local`에 별도 시크릿을 설정할 것.
- **링크 크롤링: fetch → 헤드리스 브라우저 2단계, 그래도 실패할 수 있다.** `src/lib/server/crawl.ts`.
  일반 fetch가 메뉴·푸터뿐인 껍데기(1500자 미만)를 돌려주면 Playwright Chromium으로 JS까지 실행해 다시
  읽는다(원티드·사람인 확인). 함정 두 가지: ① Playwright 기본 **headless shell은 사람인에서 응답이 멈춘다**
  (봇 차단) — `channel: "chromium"`(풀 Chromium new headless)을 먼저 쓰고 실패 시 shell로 폴백. ② 사람인은
  본문 iframe 옆에 **"다음 공고" iframe**이 같이 붙어 있어 모든 프레임을 합치면 공고가 섞인다 — 가장 긴 자식
  프레임 하나만 쓴다. 로그인 필요 페이지는 여전히 실패하며, 그때는 이미지 탭(화면 캡처)으로 유도한다.
  서버리스 배포에는 브라우저가 없으므로 `CRAWLER_BROWSER=off`로 끌 수 있다.
  실제 Ollama로 돌려보다 추가로 찾은 차단 요인(2026-09-23): ③ 헤드리스 Chromium은 `sec-ch-ua` 클라이언트 힌트에
  `HeadlessChrome`을 실어 보내는데 사람인은 이 헤더만으로 연결을 끊는다 — 프록시할 때 `sec-ch-ua*`를 빼고 UA를
  고정한다. ④ 하위 리소스를 한꺼번에 열면 방화벽이 연결을 떨어뜨려(`CONNECT_TIMEOUT`) `domcontentloaded`에
  도달하지 못한다 — CSS까지 받지 않고, undici `Agent`의 호스트당 연결을 6으로 제한한다. 이 실패들은 전부
  조용히 fetch 결과(메뉴뿐인 859자)로 떨어지므로, 크롤링 품질은 `method`와 글자 수로 확인할 것.
- **크롤러 SSRF 방어 — 검사와 연결을 분리하지 말 것.** URL을 한 번 `dns.lookup`해서 검사하고 fetch가 다시
  해석하면 DNS rebinding으로 우회된다(codex 리뷰 지적). 그래서 fetch는 undici `Agent({connect: {lookup:
  guardedLookup}})`로 **실제 연결 시점의 해석**을 검사하고, 헤드리스 브라우저는 `page.route`에서 모든 요청을
  그 guarded fetch로 대신 보내 `route.fulfill()`한다 — `route.continue()`로 바꾸면 Chromium이 DNS를 직접
  해석해 방어가 무력화된다. 서비스 워커·WebSocket은 route를 우회하므로 차단. IPv4-mapped IPv6는 URL
  파서가 `::ffff:7f00:1`처럼 16진수로 정규화하므로 두 표기 모두 IPv4로 되돌려 검사한다.
- **로컬 LLM 주소는 루프백만 허용.** 누구나 가입 가능한 앱이라 임의 주소를 받으면 SSRF 발판이 된다.
  원격 Ollama는 SSH 터널 등으로 localhost에 붙여 쓸 것. 로컬 provider는 데모 풀로 공유되지 않는다.
- **빈 공고는 추출 단계에서 막는다.** 메뉴뿐인 페이지를 넘기면 모델은 모든 필드를 빈 값으로 돌려주고, 그대로
  비교까지 가면 이력서 내용만으로 엉뚱한 "보완할 경험"을 지어낸다(실측). `/api/ai/extract`가 회사·직무·필수
  기술·업무가 모두 비면 422 `EMPTY_POSTING`으로 멈춘다.
- **로컬 모델 structured outputs는 optional·nullable을 "생략해도 됨"으로 쓴다.** `fitScore`를 optional로 두자
  qwen2.5:7b가 실제로 빠뜨렸고, `coverLetterReview`를 nullable로 두자 자소서가 있어도 null을 골랐다. 그래서
  `fitScore`는 필수(빠지면 검증 실패), 자소서가 있을 때는 `analysisResultWithCoverLetterSchema`(null 불가)를 넘긴다.
- **스캔 PDF·이미지는 OCR로 읽지만 정확도에 한계가 있다.** 텍스트 레이어가 없으면 앞 3페이지만 렌더링해
  읽는다(페이지당 수 초). tesseract 한글 인식은 로고·특수 글꼴에서 오탈자가 생긴다(예: `ABC테크` →
  `[&8<테크]`) — 추출 결과는 항상 사용자 확인·수정 폼을 거치므로 치명적이진 않다. 로컬 비전 모델을
  설정하면 훨씬 정확하다. tesseract 언어 데이터는 첫 실행 때 CDN에서 받아 `.data/tesseract/`에 캐시한다.
- **Notion 연동은 `Notion-Version: 2022-06-28`에 고정.** 데이터 소스가 여러 개인 DB(2025-09 이후 기능)는
  이 버전으로 페이지를 만들 수 없다. "다시 저장"은 기존 페이지를 갱신하지 않고 새 페이지를 만든다
  (사용자가 노션에서 덧붙인 메모를 덮어쓰지 않기 위한 선택). 실제 Notion DB에 대한 쓰기는 사용자 토큰이
  없어 목(fetch 가로채기)과 실제 API 401 경로로만 검증했다 — 첫 실사용 시 확인 필요.

## Base UI 관련 함정 (`02_tech_stack` 요약과 함께 볼 것)

- `Button`을 `render={<Link/>}` 또는 `render={<a/>}`로 쓸 때 `nativeButton={false}`를 빼먹으면
  dev 콘솔 경고가 뜨고, Next.js dev 오버레이가 화면 클릭을 가로채는 것처럼 보일 수 있다(실제로는
  경고 자체가 원인이 아니라 오버레이 렌더링 문제였음 — 원인 진단 시 `nativeButton` 누락부터 의심할 것).
- `<Select.Value />`는 선택값을 자동으로 라벨로 바꿔주지 않는다 — 매번 children 렌더 함수로 직접
  매핑해야 한다. 빠뜨리면 화면에 `"recent"`, `"interested"` 같은 raw enum 값이 그대로 노출된다.

## 검증 방법론 관련 함정

- **작은 텍스트가 섞인 스크린샷은 오독하기 쉽다.** "으" 같은 한글 음절이 작은 크기에서 괄호처럼
  보여 실제로는 정상인 텍스트를 버그로 오인한 적이 있다 — 문자열이 의심스러우면 스크린샷 대신
  `page.textContent()`로 실제 DOM 텍스트를 추출해 확인할 것.
