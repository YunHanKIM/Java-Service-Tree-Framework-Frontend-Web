# Frontend-Web — 함정·안티패턴

## 지원노트의 의도된 단순화 (포트폴리오 범위)

- **AI 키가 없으면 AI 기능은 동작하지 않는다.** mock으로 대체하지 않고 `412 NO_API_KEY`를 그대로
  보여준다 — 설정 화면으로 안내하는 알림이 뜬다. 데모 계정으로 로그인해도 AI 기능을 쓰려면 본인의
  OpenAI/Anthropic API 키를 직접 등록해야 한다.
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
- **링크 가져오기는 실제로 시도하지만 실패할 수 있다.** 서버가 실제로 URL을 fetch한다
  (`/api/import-url`, `cheerio`로 본문 추출). 로그인이 필요한 페이지, JavaScript로 렌더링되는 SPA,
  Cloudflare 등 봇 차단이 걸린 사이트는 실패한다 — 그 경우 사람이 읽을 수 있는 에러 메시지와 함께
  붙여넣기 탭으로 유도한다(가짜 성공을 보여주지 않는다).
- **PDF는 실제 텍스트 추출이지만 스캔 이미지는 못 읽는다.** `/api/parse-pdf`가 `pdf-parse`로 실제
  텍스트를 추출한다. 이미지로만 이루어진 PDF(OCR 필요)는 텍스트가 없어 실패 응답을 준다.

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
