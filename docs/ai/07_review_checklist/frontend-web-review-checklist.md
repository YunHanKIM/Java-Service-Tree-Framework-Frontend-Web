# Frontend-Web — 제출 전 자가검토 체크리스트

- [ ] 기존 코드 스타일(jQuery vs. native, Bootstrap 컴포넌트 사용법)과 일치하는가
- [ ] 폼 검증이 서버 측 검증과 정합되는가, 필드 단위 에러가 표시되는가
- [ ] AJAX 요청/응답 형태가 실제 Backend-Core 계약과 일치하는가 (지원노트 기능은 해당 없음 — `09_api_contract` 참조)
- [ ] 시크릿·환경별 URL이 하드코딩되지 않았는가 (LLM API 키를 클라이언트 코드에 넣지 않았는가)
- [ ] 접근성 기본(레이블, 포커스)이 지켜졌는가
- [ ] 크로스브라우저/반응형 확인했는가

## 지원노트 전용 항목

- [ ] `Store.*`를 거치지 않고 `localStorage`를 직접 읽고 쓰지 않는가
- [ ] 사용자/AI가 생성한 문자열을 DOM에 넣을 때 `Util.escapeHtml()`을 거쳤는가 (XSS 방지)
- [ ] 새 비동기(목 AI) 흐름에 로딩·빈 화면·실패 상태가 모두 있는가
- [ ] 새 페이지가 `Auth.requireLogin()` 가드와 `Nav.init()`을 호출하는가
- [ ] 새/변경된 화면 동작을 `docs/ai/06_page_playbooks/<page>.md`에 반영했는가
