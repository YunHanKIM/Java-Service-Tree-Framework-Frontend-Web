# Frontend-Web — 기술 스택

> 2026-09-23 Next.js 스택으로 전면 재구축 — 이전 버전(vanilla JS + jQuery + Bootstrap, 빌드 도구 없음)은
> git 이력의 `feature/nextjs-rewrite` 브랜치 분기 이전 커밋에 남아있다.

| 구분 | 값 |
|------|-----|
| 프레임워크 | Next.js (App Router, Turbopack) |
| 언어 | TypeScript |
| 스타일링 | Tailwind CSS v4 + shadcn/ui (Base UI 기반) |
| 아이콘 | lucide-react |
| 차트 | recharts (shadcn `chart` 래퍼) |
| 드래그 앤 드롭 | @dnd-kit |
| 폰트 | Pretendard (CDN, 무료) |
| 데이터 검증 | zod |
| 인증 | 자체 구현 — bcryptjs 해시 + HMAC 서명 쿠키 세션 (외부 Auth 서비스 없음) |
| AI 연동 | OpenAI SDK / Anthropic SDK — 사용자가 설정 화면에서 등록한 API 키로 서버가 직접 호출 |
| 링크 가져오기 | cheerio (서버에서 URL을 fetch해 본문 텍스트 추출) |
| PDF 텍스트 추출 | pdf-parse (v2, `PDFParse` 클래스 API) |
| 데이터 저장 | 도메인 데이터(공고·지원현황·이력서·면접)는 브라우저 `localStorage`, 인증·API 키는 서버 로컬 JSON(`/.data/`, gitignored) — 실제 DB 없음(의도된 단순화, `12_known_issues` 참조) |
| 빌드 도구 | Next.js 자체 (`next dev` / `next build`) |

## Base UI 관련 주의사항

shadcn/ui가 Radix 대신 **Base UI**(`@base-ui/react`)를 기반으로 생성됨 — Radix와 API가 다르다.

- 다형성 렌더링은 `asChild`가 아니라 **`render` prop**: `<Button render={<Link href="/x" />}>텍스트</Button>`
- `Button`을 `<a>`/`Link`로 렌더링할 때는 **`nativeButton={false}`** 를 반드시 함께 지정 (안 하면 dev 콘솔 경고 + 오버레이가 클릭을 가로챔)
- `<Select.Value />`는 Radix와 달리 **선택된 값을 자동으로 라벨로 바꿔주지 않는다** — 그대로 두면 raw value 문자열이 보인다.
  `<SelectValue>{(v) => LABEL_MAP[v]}</SelectValue>` 처럼 children 렌더 함수로 직접 매핑할 것.
