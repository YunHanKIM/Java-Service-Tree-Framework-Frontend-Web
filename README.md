# Java-Service-Tree-Framework-Frontend-Web

Java-Service-Tree-Framework MSA의 프론트엔드 모듈. vanilla JavaScript · jQuery · Bootstrap 기반
서버렌더링/멀티페이지 웹 UI. Backend-Core API를 AJAX로 소비한다.

## 구조

```
.
├── index.html                 # 진입 페이지
├── pages/                     # 페이지 추가 시 여기에 <page>.html
├── assets/
│   ├── css/main.css           # 커스텀 스타일
│   └── js/
│       ├── common/
│       │   ├── config.js      # API base URL 등 환경 설정
│       │   └── ajax.js        # Backend-Core 호출 공통 래퍼
│       └── pages/              # 페이지별 JS (<page>.js)
└── docs/ai/                   # AI 작업 하네스 문서
```

## 실행

빌드 단계 없음 — 정적 파일 서버로 `index.html`을 열거나 서빙하면 된다.
API 호출 대상은 `assets/js/common/config.js`의 `apiBaseUrl`로 설정한다.

## 새 페이지 추가

1. `pages/<page>.html` 생성 (index.html 상단 `<head>`/네비게이션 구조 복사)
2. `assets/js/pages/<page>.js` 생성, `index.html`의 스크립트 태그 패턴대로 로드
3. 화면별 규칙이 생기면 `docs/ai/06_page_playbooks/`에 기록
