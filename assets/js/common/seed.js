// 데모용 시드 데이터 — localStorage가 비어 있을 때 1회만 채운다 (포트폴리오 시연용)
const Seed = {
  ensure() {
    if (Store.postings.list().length > 0) return;

    Store.resume.update({
      summary: '프론트엔드 개발자 지망, React 기반 프로젝트 3건 경험',
      skills: ['React', 'TypeScript', 'JavaScript', 'HTML/CSS', 'Git', 'REST API', 'jQuery'],
      experienceSummary:
        'React와 TypeScript를 활용해 팀 프로젝트에서 컴포넌트 설계와 상태 관리를 담당했습니다. ' +
        'REST API 연동과 반응형 UI 구현 경험이 있고, Git을 이용한 협업에 익숙합니다.'
    });

    const inDays = (n) => new Date(Date.now() + n * 86400000).toISOString();

    const postingDefs = [
      { company: 'ABC테크', title: '프론트엔드 개발자', location: '서울 강남구', employmentType: '경력 2년 이상', deadline: inDays(22), requiredSkills: ['React', 'TypeScript'], preferredSkills: ['React Query', 'Next.js'], responsibilities: ['웹 서비스 프론트엔드 개발', '컴포넌트 설계 및 상태 관리'], stage: 'interested' },
      { company: '브라이트랩스', title: '웹 퍼블리셔', location: '서울 마포구', employmentType: '경력무관', deadline: inDays(14), requiredSkills: ['HTML/CSS', 'JavaScript'], preferredSkills: ['Sass', '반응형 웹'], responsibilities: ['마크업 퍼블리싱', '반응형 페이지 제작'], stage: 'interested' },
      { company: '넥스트웨이브', title: '주니어 프론트엔드 엔지니어', location: '판교', employmentType: '신입', deadline: inDays(9), requiredSkills: ['JavaScript', 'Git'], preferredSkills: ['TypeScript', 'Vue.js'], responsibilities: ['서비스 신규 화면 개발', 'QA 협업'], stage: 'interested' },
      { company: '그린테크놀로지', title: 'UI 개발자', location: '서울 성동구', employmentType: '경력 1년 이상', deadline: inDays(30), requiredSkills: ['HTML/CSS', 'jQuery'], preferredSkills: ['React', '웹 접근성'], responsibilities: ['UI 컴포넌트 개발', '접근성 개선'], stage: 'planned' },
      { company: '클라우드나인', title: '풀스택 신입 개발자', location: '서울 구로구', employmentType: '신입', deadline: inDays(18), requiredSkills: ['JavaScript', 'REST API'], preferredSkills: ['Node.js', 'TypeScript'], responsibilities: ['프론트/백엔드 기능 개발', 'API 연동'], stage: 'planned' },
      { company: '스퀘어모먼트', title: '프론트엔드 인턴', location: '서울 종로구', employmentType: '인턴', deadline: inDays(5), requiredSkills: ['HTML/CSS', 'JavaScript'], preferredSkills: ['Git', 'Figma'], responsibilities: ['랜딩 페이지 제작', '디자인 시안 구현'], stage: 'applied' },
      { company: '파인트리랩', title: 'React 개발자', location: '서울 서초구', employmentType: '경력 3년 이상', deadline: inDays(27), requiredSkills: ['React', 'JavaScript'], preferredSkills: ['TypeScript', 'Redux'], responsibilities: ['대시보드 서비스 개발', '성능 최적화'], stage: 'applied' },
      { company: '오로라시스템즈', title: '웹 프론트엔드 개발자', location: '서울 영등포구', employmentType: '경력무관', deadline: inDays(11), requiredSkills: ['HTML/CSS', 'JavaScript', 'Git'], preferredSkills: ['React'], responsibilities: ['사내 관리자 페이지 개발'], stage: 'interview' },
      { company: '문라이트소프트', title: '프론트엔드 개발자', location: '서울 강남구', employmentType: '경력 2년 이상', deadline: inDays(-3), requiredSkills: ['React', 'TypeScript', 'REST API'], preferredSkills: ['Next.js', '테스트 코드'], responsibilities: ['커머스 서비스 프론트엔드 개발', 'API 연동 및 상태 관리'], stage: 'result', resultNote: '최종 합격' }
    ];

    postingDefs.forEach((def) => {
      const posting = Store.postings.create({
        source: 'paste',
        company: def.company,
        title: def.title,
        location: def.location,
        employmentType: def.employmentType,
        deadline: def.deadline,
        requiredSkills: def.requiredSkills,
        preferredSkills: def.preferredSkills,
        responsibilities: def.responsibilities,
        originalUrl: null
      });
      const application = Store.applications.create({ postingId: posting.id, stage: def.stage });
      if (def.resultNote) {
        Store.applications.updateResultNote(application.id, def.resultNote);
      }
    });

    // 첫 번째 공고(ABC테크)는 이미 분석을 마친 상태로 시드 — 공고분석 화면 진입 시 바로 결과를 볼 수 있게 함
    const first = Store.postings.list().find((p) => p.company === 'ABC테크');
    if (first) {
      Store.postings.saveAnalysis(first.id, {
        matchingSkills: [
          { name: 'React', postingEvidence: '"React 기반의 웹 서비스 개발 경험이 있는 분을 찾습니다."', resumeEvidence: '"React를 사용한 웹 서비스 개발 경험이 있습니다."' },
          { name: 'TypeScript', postingEvidence: '"TypeScript를 활용한 안정적인 프론트엔드 개발이 필요합니다."', resumeEvidence: '"TypeScript를 활용하여 컴포넌트를 설계하고 개발했습니다."' }
        ],
        missingSkills: [
          { name: 'React Query', reason: '공고에서 발췌: "React Query, 상태 관리 라이브러리 사용 경험이 있으면 좋습니다."', evidence: '이력서에서 관련 경험을 찾지 못했습니다.' }
        ],
        prepItems: [
          { id: Util.generateId('prep'), label: 'React Query의 기본 개념과 주요 사용 패턴 복습하기', done: false },
          { id: Util.generateId('prep'), label: '최근 진행한 프로젝트를 STAR 기법으로 정리하기', done: false },
          { id: Util.generateId('prep'), label: 'ABC테크의 서비스와 기술 블로그를 살펴보고 관심 있는 주제 정리하기', done: false }
        ]
      });
    }
  }
};
