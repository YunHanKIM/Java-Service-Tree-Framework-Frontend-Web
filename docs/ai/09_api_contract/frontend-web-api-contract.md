# Frontend-Web — 소비 API 계약

## 지원노트 (현재 구현) — 실제 백엔드 없음

이 기능은 별도 백엔드 서버 없이 **`localStorage` 목 데이터 계층**으로 동작한다. 실제 OpenAI 등
LLM API를 브라우저에서 직접 호출하지 않는다 — API 키가 클라이언트 번들에 노출되는 것은 보안
위험이므로 의도적으로 배제했다(`12_known_issues` 참조).

- 데이터 접근: `assets/js/common/store.js` (CRUD 함수 — `Store.postings.*`, `Store.applications.*`,
  `Store.resume.*`, `Store.interview.*`, `Store.auth.*`)
- "AI" 분석: `assets/js/common/mock-ai.js` — 실제 네트워크 호출 없이 `Promise` + `setTimeout`으로
  지연을 흉내 내는 규칙 기반 시뮬레이션. 함수 시그니처는 실제 API 응답을 흉내 낸 구조(비동기,
  구조화된 JSON 형태)로 설계해, 추후 실제 백엔드로 교체해도 호출부(`pages/*.js`) 수정이 최소화되게 한다.
- 향후 실제 백엔드가 필요해지면 `store.js`/`mock-ai.js`의 함수 시그니처를 유지한 채 내부 구현만
  `assets/js/common/ajax.js`(`Api.get`/`Api.post`) 호출로 교체하는 방식을 권장한다.

## Backend-Core 연동 (레거시 — 현재 기능 범위에서는 미사용)

이 저장소의 원래 스캐폴딩 목적(Java-Service-Tree-Framework MSA 프론트엔드)을 위해 보존한다.
지원노트 기능은 아래 계약을 사용하지 않는다.

- 엔드포인트 관례: `/arms/...`(일반), `/admin/arms/...`(관리자), `/anonymous/...`(공개) — Backend-Core `docs/ai/09_api_contract/` 참조
- 접미사 `*.do` 관례 존재 (Backend-Core 실측)
- HTTP 메서드: 조회 GET · 생성 POST · 수정 PUT · 삭제 DELETE
- 권한 라우팅은 Middle-Proxy 게이트웨이가 부여 — Frontend-Web에서 임의로 `/auth-*` prefix를 만들지 않는다

(구체적 엔드포인트 목록은 실제 연동 시 Backend-Core 소스 기준으로 확정)
