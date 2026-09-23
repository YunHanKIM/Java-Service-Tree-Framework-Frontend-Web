# Frontend-Web — 디렉터리 구조

```
.
├── index.html                        # 대시보드 (진입 페이지)
├── pages/
│   ├── login.html                    # 로그인 (목 세션)
│   ├── analyze.html                  # 공고 분석 (입력 → AI 추출 → 비교분석)
│   ├── applications.html             # 지원 관리 (칸반)
│   └── interview.html                # 면접 준비 (예상 질문·답변·피드백)
├── assets/
│   ├── css/main.css                  # Notion 스타일 디자인 시스템 (전체 커스텀 스타일)
│   └── js/
│       ├── common/
│       │   ├── config.js             # API base URL 등 환경 설정 (레거시, 현재 미사용)
│       │   ├── ajax.js                # Backend-Core 호출 공통 래퍼 (레거시, 현재 미사용)
│       │   ├── util.js                # ID/날짜 포맷/이스케이프/지연 유틸
│       │   ├── store.js               # localStorage 데이터 계층 (auth/resume/postings/applications/interview)
│       │   ├── seed.js                # 데모 시드 데이터 (최초 1회)
│       │   ├── mock-ai.js             # 목 AI 엔진 (공고 파싱·이력서 비교·면접 질문·피드백)
│       │   ├── auth.js                # 로그인 가드 (requireLogin/redirectIfLoggedIn)
│       │   └── nav.js                 # 활성 메뉴·사용자명·로그아웃 공통 동작
│       └── pages/                     # 페이지별 JS (<page>.js) — index.js/login.js/analyze.js/applications.js/interview.js
└── docs/ai/                          # AI 작업 하네스 문서 (06_page_playbooks/에 화면별 상세 규칙)
```

새 화면 추가 시 `pages/<page>.html` + `assets/js/pages/<page>.js` 패턴을 따르고, 사이드바·상단바
마크업은 기존 페이지에서 복제한다(빌드 도구 없음 — `12_known_issues` 참조). 화면별 규칙은
`docs/ai/06_page_playbooks/<page>.md`에 기록한다.
