# Frontend-Web — 데이터 모델

정본은 `src/types/domain.ts`(타입)와 `src/types/schemas.ts`(API 경계 zod 검증)다. 저장 위치가
둘로 나뉜다 — 인증·AI 설정은 서버, 나머지 도메인 데이터는 브라우저.

## 저장 위치

| 데이터 | 저장 위치 | 접근 모듈 |
|---|---|---|
| User(세션) | 서버 — HMAC 서명 쿠키 + `.data/users.json` | `src/lib/server/session.ts`, `users-store.ts` |
| AiSettings(프로바이더·API 키) | 서버 — `.data/ai-settings.json` | `src/lib/server/settings-store.ts` |
| ResumeProfile / JobPosting / Application / InterviewQA | 브라우저 `localStorage` | `src/lib/client/store.ts` |

## localStorage 키 (`src/lib/client/store.ts`)

| 키 | 내용 |
|----|------|
| `jiwonnote.resume` | 이력서 요약(ResumeProfile) |
| `jiwonnote.postings` | 채용공고 목록(JobPosting[]) |
| `jiwonnote.applications` | 지원 현황(Application[]) — postingId 참조 |
| `jiwonnote.interviewAnswers` | 면접 질문·답변(InterviewQA[]) — applicationId 참조 |

> `jiwonnote.user`는 더 이상 없다 — 인증은 서버 세션 쿠키로 바뀌었다(vanilla JS 버전과의 차이).

## User (서버, `.data/users.json`)

| 필드 | 타입 | 설명 |
|------|------|------|
| id | string | 사용자 ID |
| name | string | 표시 이름 |
| email | string | 이메일 |
| passwordHash | string | bcrypt 해시 (`toPublicUser()`로 클라이언트 응답에서는 제외) |

## AiSettings (서버, `.data/ai-settings.json` — `userId`를 키로 하는 맵, 계정별 격리)

계정마다 별도 레코드다 — 데모 계정은 기본적으로 키가 없고, 다른 계정의 키를 대신 쓰지 않는다
(`12_known_issues` 참조). 클라이언트에는 항상 마스킹된 형태만 노출된다.

| 필드 | 타입 | 설명 |
|------|------|------|
| provider | `"openai"` \| `"anthropic"` \| `"local"` | 선택된 AI 프로바이더 (`local` = Ollama, 키 불필요) |
| hasKey | boolean | 키 등록 여부 (원문 키는 응답에 포함 안 됨) |
| maskedKey | string \| null | `sk-a***...***1234` 형태 마스킹 |
| shareAsDemoPool | boolean | 켜면 이 키를 키 없는 방문자에게 한도 내(`demo-pool.ts`) 공유 |
| model | string | 사용 모델 (기본값은 `src/lib/ai/index.ts`의 `DEFAULT_MODEL_BY_PROVIDER`) |
| baseUrl | string | 로컬 LLM 주소 (루프백만 허용, 기본 `http://localhost:11434`) |
| visionModel | string | 이미지·스캔 PDF용 로컬 비전 모델 (빈 문자열이면 OCR) |

서버 저장본에는 공개 응답에 없는 `keyProvider`(저장된 `apiKey`가 어느 클라우드 프로바이더의 키인지)가 있다 —
openai → local → anthropic처럼 로컬을 거쳐 다른 프로바이더로 바꿀 때 OpenAI 키가 Anthropic 키로 잘못
쓰이지 않게 하기 위함. 로컬로 바꿔도 클라우드 키는 지우지 않고, 같은 프로바이더로 돌아오면 다시 쓴다.

## NotionSettings (서버, `.data/notion-settings.json` — `userId` 맵)

| 필드 | 타입 | 설명 |
|------|------|------|
| hasToken / maskedToken | boolean / string \| null | 통합 토큰 등록 여부·마스킹 (원문은 응답에 없음) |
| databaseId | string \| null | 하이픈 없는 32자리 DB ID (링크를 넣으면 서버가 추출) |

## ResumeProfile

| 필드 | 타입 | 설명 |
|------|------|------|
| summary | string | 한 줄 소개 |
| skills | string[] | 보유 기술 태그 |
| experienceSummary | string | 경력 요약 텍스트 (AI 비교의 입력으로 사용) |
| resumeText | string | 이력서 원문 (파일 업로드/붙여넣기, 최대 20,000자 — 프롬프트에는 앞 6,000자) |
| coverLetterText | string | 자기소개서 원문 (있으면 `coverLetterReview` 생성) |

두 원문 필드는 나중에 추가됐다 — `resumeStore.get()`이 `EMPTY_RESUME`과 병합해서 돌려주고, 서버
`resumeProfileSchema`도 `.default("")`로 받아 이전 버전 localStorage 데이터와 호환된다.

## JobPosting

| 필드 | 타입 | 설명 |
|------|------|------|
| id | string | 공고 ID |
| source | `"link"` \| `"paste"` \| `"pdf"` \| `"image"` | 입력 방식 |
| company / title / location / employmentType | string | 공고 기본 정보 |
| deadline | string \| null | 마감일 (ISO date) |
| requiredSkills / preferredSkills | string[] | 필수/우대 기술 |
| responsibilities | string[] | 주요 업무 |
| originalUrl | string \| null | 원본 링크 (link 입력 시) |
| bookmarked | boolean | 북마크 여부 (현재 UI에서는 미사용, 필드만 보존) |
| createdAt | string | 등록 시각 (ISO datetime) |
| analysis | AnalysisResult \| null | AI 비교분석 결과 (없으면 아직 비교 전) |
| notionPageUrl | string \| null (optional) | Notion에 저장한 페이지 주소 |

## AnalysisResult (JobPosting.analysis)

| 필드 | 타입 | 설명 |
|------|------|------|
| fitScore | number (optional) | 0~100 적합도. 이 필드 추가 이전에 저장된 분석에는 없다 |
| matchingSkills | `{name, postingEvidence, resumeEvidence}[]` | 일치하는 경험 — 공고/이력서 양쪽 근거를 각각 인용 |
| missingSkills | `{name, reason}[]` | 보완할 경험 + 판단 근거 |
| prepItems | `{id, label, done}[]` | 추천 준비 항목 체크리스트 (id는 `/api/ai/compare`가 서버에서 부여) |
| coverLetterReview | `{alignment, suggestions[]}` \| null (optional) | 자기소개서 피드백 — 자소서 미등록이면 null |

`/api/ai/compare`가 받는 AI 원시 응답은 `prepLabels: string[]`(라벨만) 형태이고, 라우트가 id/done을
붙여 `AnalysisResult`로 변환한다 — `src/lib/ai/provider.ts`의 `CompareResumeResult` 참조.

## Application (칸반 카드)

| 필드 | 타입 | 설명 |
|------|------|------|
| id | string | 지원 ID |
| postingId | string | JobPosting 참조 |
| stage | `Stage` (`interested`\|`planned`\|`applied`\|`interview`\|`result`) | 파이프라인 단계 |
| resultNote | string | 결과 메모 (합격/불합격/보류 등) |
| updatedAt | string | 최근 변경 시각 |

## InterviewQA

| 필드 | 타입 | 설명 |
|------|------|------|
| id | string | 질문 ID |
| applicationId | string | Application 참조 |
| question | string | 예상 면접 질문 |
| answer | string | 사용자 작성 답변 |
| feedback | string \| null | AI 피드백 |
