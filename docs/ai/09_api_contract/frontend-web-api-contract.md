# Frontend-Web — 소비 API 계약

Backend-Core가 제공하는 엔드포인트를 AJAX로 소비한다.

- 엔드포인트 관례: `/arms/...`(일반), `/admin/arms/...`(관리자), `/anonymous/...`(공개) — Backend-Core `docs/ai/09_api_contract/` 참조
- 접미사 `*.do` 관례 존재 (Backend-Core 실측)
- HTTP 메서드: 조회 GET · 생성 POST · 수정 PUT · 삭제 DELETE
- 권한 라우팅은 Middle-Proxy 게이트웨이가 부여 — Frontend-Web에서 임의로 `/auth-*` prefix를 만들지 않는다

(구체적 엔드포인트 목록은 실제 연동 시 Backend-Core 소스 기준으로 확정)
