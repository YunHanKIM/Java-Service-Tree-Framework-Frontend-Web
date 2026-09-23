# Frontend-Web — 코딩 규칙

- 기존 패턴(Next.js App Router, TypeScript, shadcn/ui, Tailwind)에 맞춘다. 요청 없이 새 상태관리
  라이브러리·CSS 프레임워크 도입 금지.
- `src/components/ui/*`(shadcn 생성 파일)는 직접 수정하지 않는다 — 필요하면 `npx shadcn add`로
  재생성하거나 감싸는 컴포넌트를 만든다.
- Base UI 다형성 렌더링은 `render` prop 사용(`asChild` 아님). `Button`을 `<a>`/`Link`로 렌더링할 땐
  `nativeButton={false}` 필수. `Select.Value`는 children 렌더 함수로 라벨을 직접 매핑
  (`02_tech_stack` 참조).
- 시크릿(API 키 등)을 클라이언트 코드·환경변수 노출 경로에 두지 않는다 — AI API 키는 서버
  전용 저장소(`src/lib/server/settings-store.ts`)에만 있어야 한다.
- API 라우트는 요청 바디를 zod로 검증(`src/types/schemas.ts` 또는 라우트 내 로컬 스키마)하고,
  인증이 필요하면 `getSessionUserId()`로 401을 먼저 확인한다.
- 클라이언트 폼 검증은 서버 측 검증과 정합되게, 필드 단위 에러를 표시한다.
- 접근성 기본(레이블, 포커스, 필요 시 ARIA) 준수.
- 사용자/AI가 생성한 문자열을 화면에 표시할 때 React의 기본 이스케이프(JSX 텍스트 노드)를 벗어나
  `dangerouslySetInnerHTML`을 쓰지 않는다.
- 한글 문자열에 조사(을/를, 이/가, 로/으로 등)를 동적으로 붙일 땐 하드코딩하지 말고
  `src/lib/client/korean.ts`류의 헬퍼를 사용하거나 새로 만든다.
