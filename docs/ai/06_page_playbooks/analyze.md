# 페이지 플레이북 — 공고 분석 (`src/app/(app)/analyze/page.tsx`)

## 상태 머신

`phase: "idle" | "loading" | "form" | "result"` — `AnalyzePageContent`(클라이언트 컴포넌트, `useSearchParams`
때문에 `<Suspense>`로 감싸야 함) 하나가 전체 흐름을 관리한다.

1. **idle**: 입력 탭(`paste`/`link`/`image`/`pdf`) 선택 대기
2. **loading**: `runExtraction(source, message, getText)` — 입력 방식별로 원문만 얻고(`/api/import-url`,
   `/api/image-to-text`, `/api/parse-pdf`, 붙여넣기는 그대로) 이후 `/api/ai/extract`는 공통. `notice`가 오면
   토스트로 알린다(비전 모델 → OCR 대체 등). 추출에 쓴 source는 `pendingSource`에 따로 저장한다 — 탭이
   바뀌어도 공고의 `source`가 틀어지지 않게.
3. **form**: `<ExtractionForm>` — 추출 결과 편집, 제출 시 `postingsStore.create()`로 로컬 저장 후 `result`로
4. **result**: `<AnalysisPanel>` 렌더 + `runComparison()`으로 `/api/ai/compare` 호출(별도 `comparing`
   상태로 로딩 표시, `phase`는 그대로 `result` 유지 — 헤더는 먼저 보이고 분석 결과만 아래에서 로딩)

## 알아야 할 것

- 링크 탭 실패 시(로그인 필요 페이지, 봇 차단 등) 에러 메시지를 보여주고 **이미지 탭**으로 전환한다 —
  화면 캡처가 가장 확실한 대체 수단이라서. 단 `UNSAFE_URL`(내부 주소)은 전환하지 않는다.
- 이미지는 `document`의 `paste` 리스너로 받는다 — 페이지 어디서든 Ctrl+V하면 이미지 탭으로 전환된다.
  클립보드에 이미지 파일이 없으면 기본 동작(텍스트 붙여넣기)을 막지 않는다. 미리보기 URL은 `useMemo`로
  만들고 effect cleanup에서 `revokeObjectURL` (effect 안에서 setState하면 react-hooks 경고).
- 입력 탭 4개는 390px에서 넘치므로 모바일에선 아이콘을 숨긴다. 그리드 컬럼에는 `min-w-0` 필요.
- "Notion에 저장"은 `api.exportToNotion(posting)` → 반환된 `url`을 `postingsStore.update(id, {notionPageUrl})`로
  저장. `NOTION_NOT_CONFIGURED`면 설정으로 가는 액션이 붙은 토스트.
- `NO_API_KEY`(412)는 `apiKeyMissing` 상태로 분리해서 **지속되는 Alert**로 보여준다 — 일반 `notice`
  텍스트와 섞지 말 것 (설정으로 이동하는 링크가 필요하기 때문).
- `?postingId=<id>` 딥링크는 저장된 공고를 바로 결과 화면으로 연다. `analysis`가 없으면 자동으로
  `runComparison()`을 실행한다.
- 추천 준비 항목 체크박스는 `postingsStore.saveAnalysis()`로 즉시 저장(로컬 상태만, 서버 동기화 없음).

## 수정 시 체크리스트

- [ ] 새 입력 방식을 추가하면 `PostingSource`(domain.ts), `handleAnalyzeClick()`의 분기, `/api/ai/extract`와
      `jobPostingSchema`의 `source` enum을 함께 수정
- [ ] `AnalysisResult`/`ExtractedPosting` 필드를 바꾸면 `10_data_model`, `src/lib/ai/schemas.ts`,
      `src/lib/ai/provider.ts`의 프롬프트를 동시에 갱신
- [ ] Base UI `Button render={<Link/>}` 패턴에는 `nativeButton={false}` 필수 (`02_tech_stack` 참조)
