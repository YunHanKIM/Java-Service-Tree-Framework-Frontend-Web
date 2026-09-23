# 페이지 플레이북 — 공고 분석 (`src/app/(app)/analyze/page.tsx`)

## 상태 머신

`phase: "idle" | "loading" | "form" | "result"` — `AnalyzePageContent`(클라이언트 컴포넌트, `useSearchParams`
때문에 `<Suspense>`로 감싸야 함) 하나가 전체 흐름을 관리한다.

1. **idle**: 입력 탭(`paste`/`link`/`pdf`) 선택 대기
2. **loading**: 입력 방식에 따라 `/api/import-url`(link) 또는 `/api/parse-pdf`(pdf)를 먼저 호출한 뒤
   `/api/ai/extract` 호출
3. **form**: `<ExtractionForm>` — 추출 결과 편집, 제출 시 `postingsStore.create()`로 로컬 저장 후 `result`로
4. **result**: `<AnalysisPanel>` 렌더 + `runComparison()`으로 `/api/ai/compare` 호출(별도 `comparing`
   상태로 로딩 표시, `phase`는 그대로 `result` 유지 — 헤더는 먼저 보이고 분석 결과만 아래에서 로딩)

## 알아야 할 것

- 링크 탭은 **실제로 서버 fetch를 시도**한다(`api.importUrl`) — 실패 시(로그인 필요 페이지, JS 렌더링
  SPA, 봇 차단 등) 에러 메시지를 보여주고 자동으로 `paste` 탭으로 전환한다. 이건 흉내가 아니라 실제
  실패 경로다.
- `NO_API_KEY`(412)는 `apiKeyMissing` 상태로 분리해서 **지속되는 Alert**로 보여준다 — 일반 `notice`
  텍스트와 섞지 말 것 (설정으로 이동하는 링크가 필요하기 때문).
- `?postingId=<id>` 딥링크는 저장된 공고를 바로 결과 화면으로 연다. `analysis`가 없으면 자동으로
  `runComparison()`을 실행한다.
- 추천 준비 항목 체크박스는 `postingsStore.saveAnalysis()`로 즉시 저장(로컬 상태만, 서버 동기화 없음).

## 수정 시 체크리스트

- [ ] 새 입력 방식을 추가하면 `Tab` 유니온 타입과 `handleAnalyzeClick()`의 분기, `/api/ai/extract`의
      `source` enum(`src/types/schemas.ts`)을 함께 수정
- [ ] `AnalysisResult`/`ExtractedPosting` 필드를 바꾸면 `10_data_model`, `src/lib/ai/schemas.ts`,
      `src/lib/ai/provider.ts`의 프롬프트를 동시에 갱신
- [ ] Base UI `Button render={<Link/>}` 패턴에는 `nativeButton={false}` 필수 (`02_tech_stack` 참조)
