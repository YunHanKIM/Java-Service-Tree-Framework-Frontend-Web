# Frontend-Web — 디렉터리 구조

```
.
├── src/
│   ├── app/
│   │   ├── layout.tsx                 # 루트 레이아웃 (SessionProvider, Toaster, 폰트)
│   │   ├── globals.css                # Tailwind + shadcn 테마 토큰 (Notion 스타일 블루 팔레트)
│   │   ├── login/page.tsx             # 로그인 (사이드바 없음)
│   │   ├── (app)/                     # 인증 필요 라우트 그룹 — 공유 레이아웃 하나로 전 페이지 사이드바 처리
│   │   │   ├── layout.tsx             # 세션 확인 → 미인증 시 /login 리다이렉트, 인증 시 AppShell로 감쌈
│   │   │   ├── page.tsx               # 대시보드
│   │   │   ├── analyze/page.tsx       # 공고 분석
│   │   │   ├── applications/page.tsx  # 지원 관리 (칸반)
│   │   │   ├── interview/page.tsx     # 면접 준비
│   │   │   └── settings/page.tsx      # 이력서 프로필 + AI 프로바이더/키 설정
│   │   └── api/
│   │       ├── auth/{login,demo,logout,session}/route.ts
│   │       ├── settings/ai/route.ts        # AI 프로바이더·키 저장/조회 (키는 응답에 포함 안 됨)
│   │       ├── import-url/route.ts         # 서버사이드 URL fetch + 본문 추출 (실제 동작)
│   │       ├── parse-pdf/route.ts          # 서버사이드 PDF 텍스트 추출 (실제 동작)
│   │       └── ai/{extract,compare,questions,feedback}/route.ts
│   ├── components/
│   │   ├── ui/                        # shadcn/ui 생성 컴포넌트 (직접 수정 지양 — 재생성으로 갱신)
│   │   ├── layout/                    # app-shell, app-sidebar, page-header
│   │   ├── dashboard/                 # stat-tile, pipeline-chart
│   │   ├── analyze/                   # extraction-form, analysis-panel
│   │   ├── applications/              # kanban-card, kanban-column, detail-dialog
│   │   ├── interview/                 # question-card
│   │   └── shared/                    # empty-state, pipeline-strip
│   ├── lib/
│   │   ├── ai/                        # AiProvider 인터페이스 + openai.ts/anthropic.ts + 공통 프롬프트
│   │   ├── server/                    # session.ts, users-store.ts, settings-store.ts, data-dir.ts (서버 전용)
│   │   └── client/                    # store.ts, seed.ts, api.ts, session-context.tsx, korean.ts (브라우저 전용)
│   └── types/
│       ├── domain.ts                  # JobPosting/Application/InterviewQA/ResumeProfile/AiSettings 등
│       └── schemas.ts                 # API 경계 zod 검증 스키마
├── .data/                             # 서버 로컬 "DB" (사용자, AI 설정) — gitignored, 실행 시 자동 생성
└── docs/ai/                           # AI 작업 하네스 문서 (06_page_playbooks/에 화면별 상세 규칙)
```

새 화면 추가 시 `src/app/(app)/<page>/page.tsx` (인증 필요) 또는 `src/app/<page>/page.tsx`(공개)를 만들고,
`AppShell`이 이미 사이드바를 제공하므로 페이지는 콘텐츠만 작성한다. 화면별 규칙은
`docs/ai/06_page_playbooks/<page>.md`에 기록한다.
