# Frontend-Web — 배포 절차

Next.js 앱이라 API 라우트(서버 함수)를 실행할 Node 런타임이 필요하다 — GitHub Pages 같은 순수
정적 호스팅으로는 배포할 수 없다(이전 vanilla JS 버전과 다른 점).

## Vercel (권장)

1. GitHub 저장소를 Vercel에 연결 (Next.js 자동 감지, 별도 빌드 설정 불필요)
2. 환경변수(선택): `SESSION_SECRET` — 설정하지 않으면 개발용 기본값 사용(실서비스 비권장)
3. 배포 후에도 **AI API 키는 배포 시 넣지 않는다** — 배포된 사이트에 로그인한 뒤 설정 화면에서
   직접 등록한다 (`.data/ai-settings.json`은 서버 로컬 파일이라 서버리스 환경에서는 재배포·재시작마다
   초기화될 수 있음에 유의 — 영속화가 필요하면 실제 DB/KV로 교체)

## 로컬 실행

```bash
npm install
npm run dev      # http://localhost:3000
```

최초 접속 시 로그인 페이지로 이동한다. "데모 계정으로 체험하기"로 즉시 둘러볼 수 있고, AI 기능을
실제로 쓰려면 로그인 후 설정에서 OpenAI 또는 Anthropic API 키를 등록해야 한다.

## 프로덕션 빌드 확인

```bash
npm run build    # TypeScript + ESLint 모두 통과해야 성공
npm run start
```

## 배포 전 확인

- [ ] `npm run build` 성공 (TS 타입 오류·ESLint 오류 없음)
- [ ] `docs/ai/07_review_checklist` 통과
- [ ] API 키 등 시크릿이 코드나 git 이력에 없는지 확인 (`.data/`, `.env*`는 `.gitignore`에 있음)
- [ ] 주요 화면(로그인 → 대시보드 → 공고분석 → 지원관리 → 면접준비 → 설정) 수동 스모크 테스트
- [ ] 가능하면 실제 API 키로 AI 분석 1회 이상 실행해 실제 연동 확인 (`NO_API_KEY` 경로만으로는
      프롬프트·zod 스키마 정합성을 검증할 수 없음)
