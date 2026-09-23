# 페이지 플레이북 — 설정 (`src/app/(app)/settings/page.tsx`)

## 구성

세 개의 독립된 폼(각자 별도 `<form onSubmit>`, 별도 저장 버튼) — 하나의 폼으로 합치지 말 것,
저장 대상(브라우저 vs 서버)과 실패 모드가 다르다.

1. **이력서 프로필**: `resumeStore.get()/update()` — 순수 클라이언트, 즉시 저장, 실패할 일이 없다
   (동기 localStorage 쓰기). `DocumentField`(이력서 원문·자기소개서)는 PDF면 `/api/parse-pdf`(스캔본 OCR
   포함), TXT/MD면 `file.text()`로 textarea를 채운다 — 파일을 올려도 **저장 버튼을 눌러야** 저장된다.
2. **AI 연동**: `GET/POST /api/settings/ai` — 서버 호출이라 실패할 수 있다(토스트로 에러 표시).
   `apiKey` 입력란은 항상 빈 문자열로 시작한다 — 서버가 원문 키를 절대 돌려주지 않기 때문에
   기존 값으로 채워줄 방법이 없다. placeholder로 `maskedKey`만 보여준다. provider가 `local`이면 키 대신
   Ollama 주소·분석 모델·비전 모델 입력과 "연결 확인"(`/api/settings/ai/local-models`, **저장된** 주소 기준)이 보인다.
3. **Notion 연동**: `src/components/settings/notion-settings-card.tsx` — 저장 시 서버가 실제로 DB를 조회해
   검증하므로 토큰 오타·통합 미연결이 저장 시점에 바로 드러난다.

## 알아야 할 것

- AI 프로바이더 `<Select>`도 `SelectValue`에 children 렌더 함수가 필요하다(다른 페이지와 동일 패턴).
- `apiKey`를 빈 문자열로 제출하면 서버(`saveAiSettings`)는 **기존 키를 유지**한다(지우려는 게 아니라
  단순히 provider/model만 바꾸는 경우가 많아서) — 키를 실제로 교체하려면 새 값을 입력해야 한다.
  클라우드 provider를 바꾸면서 키를 비워두면, 저장된 키의 주인(`keyProvider`)이 그 provider일 때만 키가
  유지되고 아니면 `null`이 된다 — `local`로 바꾸는 것은 키를 지우지 않는다(`settings-store.ts` 참조).

## 수정 시 체크리스트

- [ ] 새 AI 프로바이더를 추가하면 `PROVIDER_LABEL`/`PROVIDER_KEY_HELP`(이 페이지) +
      `src/lib/ai/index.ts`의 `DEFAULT_MODEL_BY_PROVIDER` + 새 `src/lib/ai/<provider>.ts` 구현을 함께 추가
- [ ] 이력서 필드를 바꾸면 `10_data_model`의 `ResumeProfile`과 `src/lib/ai/provider.ts`의
      `buildCompareUserPrompt()`를 함께 갱신
