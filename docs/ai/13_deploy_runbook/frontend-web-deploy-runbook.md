# Frontend-Web — 배포 절차

빌드 단계가 없는 정적 사이트이므로, 정적 호스팅 서비스에 저장소 루트를 그대로 배포하면 된다.
모든 데이터는 브라우저 `localStorage`에 저장되므로 별도 백엔드·환경변수가 필요 없다.

## GitHub Pages (권장 — 포트폴리오용 무료 배포)

1. 저장소 Settings → Pages → Source를 `main` 브랜치 `/ (root)`로 설정
2. 배포된 URL(`https://<계정>.github.io/<저장소>/`)의 `index.html`이 대시보드
3. 커스텀 도메인이 필요하면 Pages 설정에서 CNAME 추가

## 기타 정적 호스팅 (Netlify / Vercel 등)

- Build command: 없음 (정적 파일 그대로 서빙)
- Publish directory: 저장소 루트
- 라우팅은 실제 파일 경로 기반(`pages/*.html`)이라 별도 rewrite 규칙이 필요 없다

## 로컬 실행

빌드 도구가 없어 `file://`로 직접 열어도 대부분 동작하지만, 정적 서버로 띄우는 것을 권장한다.

```bash
python -m http.server 8080   # 또는: npx serve .
```

## 배포 전 확인

- [ ] `docs/ai/07_review_checklist` 통과
- [ ] 시크릿(API 키 등)이 코드에 없는지 확인 — 이 프로젝트는 원칙적으로 클라이언트 시크릿이 없어야 한다
- [ ] 주요 화면(로그인 → 대시보드 → 공고분석 → 지원관리 → 면접준비) 수동 스모크 테스트
