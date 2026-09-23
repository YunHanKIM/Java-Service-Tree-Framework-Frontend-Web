# Frontend-Web — 제출 전 자가검토 체크리스트

- [ ] `npm run build` 통과 (TypeScript 타입 오류·ESLint 오류 없음)
- [ ] 기존 코드 스타일(shadcn/ui 컴포넌트 사용법, Tailwind 유틸리티 우선)과 일치하는가
- [ ] Base UI `render`/`nativeButton`/`SelectValue` 패턴을 맞게 썼는가 (`02_tech_stack` 참조)
- [ ] 폼 검증이 API 라우트 측 zod 검증과 정합되는가, 필드 단위 에러가 표시되는가
- [ ] 시크릿(API 키 등)이 클라이언트 코드·git 이력에 없는가 (`.data/`, `.env*`는 gitignore 대상)
- [ ] 접근성 기본(레이블, 포커스)이 지켜졌는가
- [ ] 반응형(모바일 뷰포트) 확인했는가

## 지원노트 전용 항목

- [ ] `src/lib/client/store.ts`를 거치지 않고 `localStorage`를 직접 읽고 쓰지 않는가
- [ ] 새 AI 호출 흐름에 로딩·빈 화면·`NO_API_KEY`·일반 실패 네 가지 상태가 모두 있는가
- [ ] 새 인증 필요 페이지가 `(app)/layout.tsx` 라우트 그룹 아래에 있는가 (별도 가드 코드 중복 작성 금지)
- [ ] 새/변경된 화면 동작을 `docs/ai/06_page_playbooks/<page>.md`에 반영했는가
- [ ] 한글 조사(로/으로 등)를 동적으로 붙이는 곳에 하드코딩된 조사가 없는가
- [ ] 가능하면 Playwright로 실제 클릭까지 확인했는가 — 스크린샷만으로 작은 한글 텍스트를 판정하지
      말고 `textContent()`로 실제 문자열을 확인할 것 (`12_known_issues` 참조)
