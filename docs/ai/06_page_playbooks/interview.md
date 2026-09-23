# 페이지 플레이북 — 면접 준비 (`pages/interview.html`)

## 흐름

1. 상단 `<select>`에서 지원 항목 선택 (`?applicationId=` 딥링크 시 자동 선택, `interview` 단계가 정렬 우선)
2. 질문이 없으면 "예상 질문 만들기" → `MockAI.generateInterviewQuestions(posting)` → `Store.interview.bulkCreate()`
3. 질문별로 답변 작성(blur 시 자동 저장) + "AI 피드백 받기" → `MockAI.generateFeedback(answer)`

## 알아야 할 것

- 지원 항목이 하나도 없으면(=아직 어떤 공고도 지원 목록에 저장하지 않음) 전체 화면이 empty-state로 대체되고
  `<select>`는 비활성화된다.
- 질문·답변·피드백 카드는 이벤트 위임(`$(document).on(...)`)으로 바인딩돼 있어 `showQuestions()`가 목록을
  다시 그려도 핸들러를 다시 걸 필요가 없다.
- "질문 다시 만들기"는 기존 질문을 지우지 않고 새로 추가한다(`Store.interview.bulkCreate`는 append) —
  즉, 재생성할 때마다 질문이 누적된다. 의도된 동작이며, 데모에서 이전 준비 기록을 보존하기 위함이다.

## 수정 시 체크리스트

- [ ] `InterviewQA` 필드를 바꾸면 `docs/ai/10_data_model`과 `store.js`의 `interview.*`를 함께 갱신
- [ ] 새 질문 생성 로직을 바꾸면 `mock-ai.js`의 `generateInterviewQuestions`만 수정 (이 페이지는 그대로)
