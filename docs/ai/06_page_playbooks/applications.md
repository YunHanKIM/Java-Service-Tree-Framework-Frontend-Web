# 페이지 플레이북 — 지원 관리 (`src/app/(app)/applications/page.tsx`)

## 구성

5단 칸반(`STAGES` 순서). 드래그 앤 드롭은 `@dnd-kit/core`(`KanbanCard`=`useDraggable`,
`KanbanColumn`=`useDroppable`, 페이지의 `<DndContext>`가 `onDragEnd`에서 단계를 계산). 카드마다
드롭다운 메뉴(`⋮`)로도 동일하게 단계를 바꿀 수 있다 — 드래그가 불편한 환경(터치, 키보드)의 대체 경로.

## 낙관적 업데이트 (포트폴리오 핵심 포인트)

`changeStage()`가 React 상태로 직접 구현한다(예전 vanilla JS 버전의 DOM 노드 이동 방식보다 단순해짐):

1. `setEntries()`로 먼저 로컬 상태의 `stage`를 바꾼다 (커밋을 기다리지 않음)
2. `simulateCommit()`(450ms 지연 + 12% 확률 실패)으로 비동기 호출을 흉내 낸다
3. 성공: `applicationsStore.updateStage()`로 localStorage에 커밋 + 성공 토스트
4. 실패: `previousStage`로 되돌리고 실패 토스트

드래그, 카드 드롭다운, 상세 다이얼로그의 단계 선택 — 세 경로 모두 이 함수 하나를 호출한다.

## 알아야 할 것

- 단계 라벨 뒤에 붙는 조사(로/으로)는 하드코딩하지 말고 `src/lib/client/korean.ts`의 `roParticle()`을
  쓴다. "관심로"처럼 잘못된 한국어가 나가기 쉽다 — 받침 유무로 로/으로가 갈린다.
- `Select`의 표시 텍스트는 자동 매핑되지 않는다 — `SelectValue`에 children 렌더 함수 필요
  (`02_tech_stack` Base UI 주의사항 참조).
- 카드 삭제(`removeEntry`)는 `applicationsStore.remove()`만 호출 — `postingsStore`는 보존(분석 결과 유지).

## 수정 시 체크리스트

- [ ] 새 단계를 추가하면 `src/types/domain.ts`의 `STAGES`/`STAGE_LABELS`만 바꾸면 이 페이지는 자동 반영
- [ ] 드래그 관련 코드를 만질 땐 `changeStage`가 드래그/드롭다운/다이얼로그 세 경로에서 여전히
      공유되는지 확인 (낙관적 업데이트 로직 중복 금지)
