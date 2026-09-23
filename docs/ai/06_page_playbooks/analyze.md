# 페이지 플레이북 — 공고 분석 (`pages/analyze.html`)

## 화면 상태

1. **입력 대기**: 3개 탭(붙여넣기/링크/PDF) 중 하나 선택, 우측은 empty-state
2. **추출 중**: `renderLoading()` — 스켈레톤 라인
3. **추출 결과 확인·수정**: 편집 가능한 폼 (`renderExtractionForm`) — 저장 시 `Store.postings.create()`
4. **비교분석 중**: `runComparison()` 호출 후 다시 스켈레톤
5. **분석 결과**: 공고 상세 + 일치/보완 경험 + 추천 준비 항목 (`renderPostingResult`)

## 알아야 할 것

- 링크 입력은 `MockAI.importFromUrl()`이 **항상 실패**하고 `manual_input_required`를 반환한다 —
  실제 크롤러가 없기 때문에 의도된 동작이다. 실패 시 자동으로 붙여넣기 탭으로 전환하고 포커스를 옮긴다
  (`docs/ai/12_known_issues` 참조). 이 흐름 자체가 포트폴리오에서 보여주려는 "실패 시 복구" 사례다.
- `?postingId=<id>` 쿼리 파라미터로 특정 공고의 분석 결과에 바로 진입할 수 있다(URL 상태 보존).
  분석이 없는 상태로 진입하면 자동으로 `runComparison()`을 실행한다.
- 추천 준비 항목 체크박스는 클릭 즉시 `Store.postings.saveAnalysis()`로 저장된다(로컬 상태만, 서버 동기화 없음).
- "지원 목록에 저장" 버튼은 `Store.applications.create()`로 `interested` 단계 지원을 생성한다 — 중복 방지를
  위해 이미 지원 항목이 있으면 버튼 대신 현재 단계 배지를 보여준다.

## 수정 시 체크리스트

- [ ] 새 입력 방식을 추가하면 `activeTab` 분기와 `MockAI.parsePosting({source})` 양쪽을 함께 수정
- [ ] `AnalysisResult` 필드를 바꾸면 `docs/ai/10_data_model`과 `mock-ai.js`를 동시에 갱신
- [ ] XSS 방지: 사용자/AI가 생성한 문자열은 반드시 `Util.escapeHtml()`을 거쳐 삽입
