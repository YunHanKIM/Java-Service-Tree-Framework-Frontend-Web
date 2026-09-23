# Frontend-Web — 변경 이력

## [Unreleased]

### 한도부 데모 풀 — 방문자가 키 없이 실제 AI를 체험

- 계정별 키 격리(바로 아래 항목) 이후 나온 후속 피드백: 포트폴리오 리뷰어에게 "본인 키를 등록해야
  AI를 볼 수 있다"고 요구하면 사실상 아무도 안 써본다 — 그럴 거면 그냥 ChatGPT에 공고를 붙여넣으라고
  하는 것과 다를 게 없다는 지적. 일리 있는 지적이라 반영.
- 설정에 `shareAsDemoPool` 토글 추가 — 소유자가 켜면 그 키가 키 없는 요청(데모 계정 등)에도 쓰이되,
  하루 총 50회·방문자(IP)당 하루 10회로 제한된다(`src/lib/server/demo-pool.ts`,
  `ai-access.ts`의 `resolveAiAccess()`). 소유자 본인 호출은 한도 미적용.
- curl로 3단계 검증: 데모 계정이 풀 키를 실제로 쓰는지(412가 아니라 502로 실패 = 키를 시도했다는
  뜻), 11번째 요청에서 IP 한도(429)가 걸리는지, 소유자 본인 호출은 한도 후에도 통과하는지 모두 확인.

### 보안 수정 — AI API 키 계정별 격리

- v2 초기 배포는 API 키를 전역 단일 레코드로 저장했다 — 공개 배포 시 누구나 자동 가입해서 소유자의
  키로 AI를 호출할 수 있는 비용/보안 취약점이었다(사용자 지적으로 발견).
- `settings-store.ts`를 `userId` 맵으로 바꿔 계정별로 완전히 격리. 데모 계정은 기본적으로 키가 없어
  방문자가 소유자의 비용을 쓸 수 없다. curl로 owner/demo/stranger 세 계정 간 격리를 직접 검증함.

### 지원노트 v2 — Next.js 전면 재구축

- 스택 전환: vanilla JS + jQuery + Bootstrap(빌드 도구 없음) → Next.js(App Router) + TypeScript +
  Tailwind v4 + shadcn/ui(Base UI 기반). v1 구현은 git 이력에 그대로 남아있다(`feature/nextjs-rewrite`
  분기 이전 커밋).
- **실제 AI 연동**: 설정 화면에서 OpenAI 또는 Anthropic API 키를 등록하면 서버(Route Handler)가 실제
  API를 호출한다(`src/lib/ai/*`, zod로 구조화된 응답 검증). 키가 없으면 mock으로 대체하지 않고
  `NO_API_KEY`를 그대로 보여주고 설정으로 안내한다.
- **실제 링크 가져오기**: `/api/import-url`이 서버에서 실제로 URL을 fetch하고 `cheerio`로 본문을
  추출한다(v1은 항상 실패를 시뮬레이션했음). 실패(로그인 필요·JS 렌더링·봇 차단)는 여전히 발생할 수
  있고, 그때만 붙여넣기로 안내한다.
- **실제 PDF 텍스트 추출**: `/api/parse-pdf`가 `pdf-parse`로 실제 텍스트를 추출한다(v1은 파일명만 사용).
- **이력서 프로필 편집 화면 추가**(`/settings`) — v1에서 누락됐던 부분. AI 프로바이더/API 키 설정도 같은 화면에서.
- **인증 강화**: bcrypt 해시 + HMAC 서명 쿠키 기반 서버 세션(v1은 localStorage 플래그였음).
- **레이아웃 리팩터**: `(app)` 라우트 그룹 레이아웃 하나가 사이드바를 전 페이지에 공급 — v1의
  "페이지마다 사이드바 마크업 복제" 한계를 해소.
- **칸반 드래그 앤 드롭**: `@dnd-kit` 기반으로 재구현(v1의 HTML5 DnD + DOM 조작 대신 React 상태 기반
  낙관적 업데이트). 실패 시뮬레이션·롤백은 v1과 동일한 개념 유지.
- **대시보드 차트**: recharts(shadcn `chart` 래퍼)로 재구현, dataviz 방법론(순서형 단일 계열, sequential
  블루 램프)은 v1과 동일.
- `docs/ai/02_tech_stack`, `03_directory_structure`, `04_coding_standards`, `07_review_checklist`,
  `09_api_contract`, `10_data_model`, `12_known_issues`, `13_deploy_runbook`, `06_page_playbooks/*`(신규
  `settings.md` 포함) 전면 갱신.
- 검증: Playwright로 로그인→대시보드→설정→공고분석(NO_API_KEY 경로)→지원관리(드래그/메뉴/검색/다이얼로그)→
  면접준비→모바일(390px) 전체 흐름 확인, `npm run build`(TS+ESLint) 통과. 스크린샷 오독으로 인한
  거짓 버그 리포트를 `textContent()` 직접 확인으로 정정한 사례 있음(`12_known_issues` 참조).

### 지원노트 v1 — 포트폴리오 구현 (vanilla JS, 이후 v2로 재구축)

- 프로젝트 범위 확정: "지원노트" — AI 채용공고 분석 · 이력서 비교 · 지원 관리 웹 서비스
- 핵심 계층: `localStorage` 데이터 계층(`store.js`), 목 AI 엔진(`mock-ai.js`), 데모 시드 데이터(`seed.js`)
- 화면 5종: 대시보드(`index.html`), 로그인(`pages/login.html`), 공고 분석(`pages/analyze.html`),
  지원 관리 칸반(`pages/applications.html`), 면접 준비(`pages/interview.html`)
- Notion 스타일 디자인 시스템(`assets/css/main.css`) — Pretendard 웹폰트, 카드·스킬 태그·칸반·
  스켈레톤 로딩 컴포넌트
- 대시보드 지원 파이프라인 차트: dataviz 스킬 방법론에 따른 순서형(ordinal) 단일 계열 바 차트
- 공고 분석: 링크/붙여넣기/PDF 3가지 입력, 추출 결과 확인·수정, 이력서 비교분석(일치/보완 경험 + 근거),
  링크 입력 실패 시 붙여넣기로 자동 전환하는 복구 흐름
- 지원 관리: 5단 칸반, 드래그 앤 드롭 + `<select>`(키보드/터치 접근성) 양쪽에서 동작하는 낙관적 업데이트
  (실패 시뮬레이션 및 롤백 포함), 검색·정렬, 상세 모달
- 면접 준비: 공고 맞춤 예상 질문 생성, 답변 작성, AI 목피드백
- `docs/ai/01_project_overview`, `09_api_contract`, `10_data_model`, `12_known_issues`,
  `03_directory_structure`, `07_review_checklist`, `13_deploy_runbook`, `06_page_playbooks/*` 갱신
- 검증: Playwright로 로그인→대시보드→공고분석→지원관리→면접준비 전체 흐름 및 모바일(390px) 반응형
  레이아웃 스모크 테스트 — 콘솔 에러 0건 (자세한 방법은 `07_review_checklist` 참고)

### 스캐폴딩

- 프로젝트 초기화 (빈 저장소, 하네스 문서 골격 생성)
- 초기 파일 스캐폴딩: index.html, assets/(css/js), README.md, .gitignore (Bootstrap 5.3.3 · jQuery 3.7.1 CDN)
