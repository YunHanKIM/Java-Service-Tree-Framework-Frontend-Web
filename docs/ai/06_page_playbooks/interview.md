# 페이지 플레이북 — 면접 준비 (`src/app/(app)/interview/page.tsx`)

## 흐름

1. 상단 `<Select>`에서 지원 항목 선택 (`?applicationId=` 딥링크 시 자동 선택, `interview` 단계가 정렬 우선.
   `useSearchParams` 때문에 `<Suspense>`로 감싼 `InterviewPageContent`가 실제 로직을 담당)
2. 질문이 없으면 "예상 질문 만들기" → `/api/ai/questions` 호출 → `interviewStore.bulkCreate()`
3. 질문별로 `<QuestionCard>`에서 답변 작성(blur 시 자동 저장) + "AI 피드백 받기" → `/api/ai/feedback`

## 알아야 할 것

- 지원 항목이 하나도 없으면 전체 화면이 empty-state로 대체된다(early return, `<Select>`조차 렌더하지 않음).
- `NO_API_KEY`는 질문 생성·피드백 요청 양쪽에서 각각 처리 — `apiKeyMissing` 상태 하나를 공유하지만,
  피드백 실패는 토스트로만 알리고(인라인 카드가 이미 많아 Alert를 또 띄우면 화면이 복잡해짐) 질문
  생성 실패는 지속 Alert로 보여준다. 이 비대칭은 의도적 — 화면 밀도 vs 발견 가능성 트레이드오프.
- "질문 다시 만들기"는 기존 질문을 지우지 않고 앞에 추가한다(`interviewStore.bulkCreate`가
  prepend) — 재생성할 때마다 이전 준비 기록이 남는다. 의도된 동작.
- `QuestionCard`는 로컬 `answer` state를 갖고 blur/피드백 요청 시점에만 `interviewStore.updateAnswer()`로
  저장한다 — 매 keystroke마다 localStorage에 쓰지 않는다.

## 수정 시 체크리스트

- [ ] `InterviewQA` 필드를 바꾸면 `10_data_model`과 `src/lib/client/store.ts`의 `interviewStore`를 함께 갱신
- [ ] 질문·피드백 생성 로직을 바꿀 땐 `src/lib/ai/provider.ts`의 프롬프트만 수정 — 이 페이지는 API
      응답 형태(`{questions: string[]}`, `{feedback: string}`)만 알면 된다
