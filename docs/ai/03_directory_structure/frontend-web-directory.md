# Frontend-Web — 디렉터리 구조

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

새 화면 추가 시 `pages/<page>.html` + `assets/js/pages/<page>.js` 패턴을 따른다.
