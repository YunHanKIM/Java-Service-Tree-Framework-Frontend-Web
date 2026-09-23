# Frontend-Web — 변경 이력

## [Unreleased]

### 지원노트 v1 — 포트폴리오 구현

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
