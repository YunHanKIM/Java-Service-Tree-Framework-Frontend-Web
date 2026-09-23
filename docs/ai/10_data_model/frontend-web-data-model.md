# Frontend-Web — 화면 상태 / 뷰모델

DB 스키마가 아니라 `localStorage`에 저장되는 지원노트 목데이터 구조다. 실제 필드는
`assets/js/common/store.js`가 정본이며, 아래는 그 요약이다.

## localStorage 키

| 키 | 내용 |
|----|------|
| `jiwonnote.user` | 현재 로그인 사용자(User) 또는 `null` |
| `jiwonnote.resume` | 이력서 요약(ResumeProfile) |
| `jiwonnote.postings` | 채용공고 목록(JobPosting[]) |
| `jiwonnote.applications` | 지원 현황(Application[]) — postingId 참조 |
| `jiwonnote.interviewAnswers` | 면접 질문·답변(InterviewQA[]) — applicationId 참조 |

## User

| 필드 | 타입 | 설명 |
|------|------|------|
| id | string | 사용자 ID |
| name | string | 표시 이름 |
| email | string | 이메일 |

## ResumeProfile

| 필드 | 타입 | 설명 |
|------|------|------|
| summary | string | 한 줄 소개 |
| skills | string[] | 보유 기술 태그 |
| experienceSummary | string | 경력 요약 텍스트 (AI 비교의 입력으로 사용) |

## JobPosting

| 필드 | 타입 | 설명 |
|------|------|------|
| id | string | 공고 ID |
| source | `"link"` \| `"paste"` \| `"pdf"` | 입력 방식 |
| company | string | 회사명 |
| title | string | 직무명 |
| location | string | 근무지 |
| employmentType | string | 고용 형태 |
| deadline | string \| null | 마감일 (ISO date) |
| requiredSkills | string[] | 필수 기술 |
| preferredSkills | string[] | 우대 기술 |
| responsibilities | string[] | 주요 업무 |
| originalUrl | string \| null | 원본 링크 |
| bookmarked | boolean | 북마크 여부 |
| createdAt | string | 등록 시각 (ISO datetime) |

## AnalysisResult (JobPosting에 부속, AI 목분석 결과)

| 필드 | 타입 | 설명 |
|------|------|------|
| matchingSkills | `{name, evidence}[]` | 이력서와 일치하는 경험 + 근거 문장 |
| missingSkills | `{name, reason, evidence}[]` | 보완할 경험 + 근거 |
| prepItems | `{id, label, done}[]` | 추천 준비 항목 체크리스트 |

## Application (칸반 카드)

| 필드 | 타입 | 설명 |
|------|------|------|
| id | string | 지원 ID |
| postingId | string | JobPosting 참조 |
| stage | `"interested"` \| `"planned"` \| `"applied"` \| `"interview"` \| `"result"` | 파이프라인 단계 |
| resultNote | string | 결과 메모 (합격/불합격/보류 등) |
| updatedAt | string | 최근 변경 시각 |

## InterviewQA

| 필드 | 타입 | 설명 |
|------|------|------|
| id | string | 질문 ID |
| applicationId | string | Application 참조 |
| question | string | 예상 면접 질문 |
| answer | string | 사용자 작성 답변 |
| feedback | string \| null | AI 목피드백 |
