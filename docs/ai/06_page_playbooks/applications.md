# 페이지 플레이북 — 지원 관리 (`pages/applications.html`)

## 구성

5단 칸반(`Store.STAGES` 순서: 관심 → 지원예정 → 지원완료 → 면접 → 결과). 카드는 HTML5 드래그 앤 드롭과
카드 내부 `<select>`(키보드·터치 접근성용, PDF 자료의 "키보드로 조작 가능한 칸반" 요구 대응) 두 가지 방식으로
단계를 바꿀 수 있다. 검색(회사·직무)과 정렬(최신순/마감임박순)은 `getFilteredSorted()`에서 처리.

## 낙관적 업데이트 (포트폴리오 핵심 포인트)

`changeStage()`가 실제 패턴을 구현한다:

1. 서버 응답을 기다리지 않고 카드 DOM을 먼저 목표 컬럼으로 옮긴다(`originalParent`/`originalNext` 기억)
2. `simulateStageUpdate()`(450ms 지연 + 12% 확률 실패)로 실제 비동기 호출을 흉내 낸다
3. 성공: `Store.applications.updateStage()`로 커밋 + 성공 토스트
4. 실패: 기억해둔 위치로 카드를 되돌리고 `<select>` 값도 원복 + 실패 토스트

드래그와 `<select>` 변경, 상세 모달의 단계 변경 셀렉트까지 모두 이 함수 하나로 처리한다 — 경로가
여러 개라고 낙관적 업데이트 로직을 복제하지 말 것.

## 수정 시 체크리스트

- [ ] 새 단계를 추가하면 `Store.STAGES`/`STAGE_LABELS`(store.js)만 바꾸면 이 페이지는 자동 반영된다
- [ ] 카드 클릭과 `<select>` 클릭이 겹치지 않도록 `closest('.stage-select')` 가드 유지
- [ ] 카드 삭제는 `Store.applications.remove()`만 호출 — `Store.postings`는 보존(분석 결과 유지)
