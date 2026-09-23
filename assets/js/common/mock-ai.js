// 목 AI 엔진 — 실제 LLM 호출 없이 규칙 기반으로 "AI 분석"을 흉내 낸다 (docs/ai/09_api_contract 참조).
// 모든 함수는 Promise를 반환하고 인위적 지연을 둬서 실제 비동기 API 호출과 동일한 로딩/실패 UX를 연습할 수 있게 한다.
const MockAI = {
  SKILL_KEYWORDS: [
    'React', 'TypeScript', 'JavaScript', 'HTML/CSS', 'HTML', 'CSS', 'jQuery', 'Vue.js', 'Vue',
    'Node.js', 'Next.js', 'Redux', 'React Query', 'Git', 'REST API', 'GraphQL', 'Figma',
    'Sass', 'Webpack', '테스트 코드', '웹 접근성', '반응형 웹'
  ],

  // URL 가져오기는 실제 크롤러가 없어 항상 "수동 입력 필요"로 안내한다 — 실패 시 대체 흐름을 보여주는 것이 목적.
  importFromUrl(url) {
    return Util.delay(900).then(() => {
      if (!url || !url.trim()) {
        return Promise.reject({ code: 'invalid_url', message: '채용공고 URL을 입력해주세요.' });
      }
      return Promise.reject({
        code: 'manual_input_required',
        message: '이 링크는 자동으로 불러올 수 없어요. 공고 내용을 복사해서 붙여넣어 주세요.'
      });
    });
  },

  parsePosting({ source, text, fileName }) {
    const raw = (text || fileName || '').trim();
    return Util.delay(1200).then(() => this._extract(raw, source));
  },

  _extract(raw, source) {
    const pick = (regex) => {
      const m = raw.match(regex);
      return m ? m[1].trim().slice(0, 60) : '';
    };

    const company = pick(/(?:회사명|회사|기업명|기업)\s*[:\-]\s*(.+)/) || (source === 'pdf' ? '회사명 미확인 (직접 입력)' : '');
    const title = pick(/(?:직무|포지션|채용\s*포지션|모집\s*분야)\s*[:\-]\s*(.+)/) || (raw.split('\n')[0] || '').slice(0, 40);
    const location = pick(/(?:근무지|지역)\s*[:\-]\s*(.+)/);
    const employmentType = pick(/(?:경력|고용\s*형태|자격\s*요건)\s*[:\-]\s*(.+)/);
    const deadlineText = pick(/(?:마감일?|접수\s*마감)\s*[:\-]\s*(.+)/);

    const detected = this.SKILL_KEYWORDS.filter((kw) => raw.includes(kw));
    const preferredIdx = raw.search(/우대/);
    const requiredSkills = preferredIdx === -1 ? detected : detected.filter((kw) => raw.indexOf(kw) < preferredIdx || raw.indexOf(kw) === -1);
    const preferredSkills = preferredIdx === -1 ? [] : detected.filter((kw) => raw.indexOf(kw) >= preferredIdx);

    const responsibilities = raw
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => /^[-•\d]/.test(line))
      .map((line) => line.replace(/^[-•\d.)\s]+/, ''))
      .slice(0, 5);

    return {
      company: company || '',
      title: title || (source === 'pdf' ? 'PDF에서 자동 인식하지 못했어요 — 직접 입력해주세요' : ''),
      location,
      employmentType,
      deadline: null,
      deadlineHint: deadlineText,
      requiredSkills: requiredSkills.length ? requiredSkills : detected,
      preferredSkills,
      responsibilities: responsibilities.length ? responsibilities : []
    };
  },

  compareWithResume(posting, resume) {
    return Util.delay(1500).then(() => {
      const allPostingSkills = [...new Set([...(posting.requiredSkills || []), ...(posting.preferredSkills || [])])];
      const resumeSkills = resume.skills || [];

      const matchingSkills = allPostingSkills
        .filter((skill) => resumeSkills.includes(skill))
        .map((skill) => ({
          name: skill,
          evidence: `내 이력서에서 발췌: "${resume.experienceSummary ? resume.experienceSummary.slice(0, 40) : skill + ' 관련 경험'}..."`
        }));

      const missingSkills = allPostingSkills
        .filter((skill) => !resumeSkills.includes(skill))
        .map((skill) => ({
          name: skill,
          reason: `공고에서 발췌: "${posting.title || '이 직무'}에는 ${skill} 경험이 필요합니다."`,
          evidence: '이력서에서 관련 경험을 찾지 못했습니다.'
        }));

      const prepItems = [
        missingSkills[0] ? `${missingSkills[0].name}의 기본 개념과 주요 사용 패턴 복습하기` : '최근 프로젝트에서 사용한 기술 스택 복습하기',
        '최근 진행한 프로젝트를 STAR 기법(상황-과제-행동-결과)으로 정리하기',
        `${posting.company || '지원 회사'}의 서비스와 기술 블로그를 살펴보고 관심 있는 주제 정리하기`
      ].map((label) => ({ id: Util.generateId('prep'), label, done: false }));

      return { matchingSkills, missingSkills, prepItems };
    });
  },

  generateInterviewQuestions(posting) {
    return Util.delay(1000).then(() => {
      const skills = (posting.requiredSkills || []).slice(0, 2);
      const questions = [
        `${posting.company || '저희 회사'}에 지원하게 된 계기를 말씀해주세요.`,
        ...skills.map((skill) => `${posting.title || '지원 직무'} 업무에서 ${skill}를 활용했던 경험을 설명해주세요.`),
        '협업 중 의견 충돌이 있었던 경험과 해결 방법을 말씀해주세요.',
        '가장 어려웠던 기술적 문제와 해결 과정을 설명해주세요.',
        `${posting.company || '저희 회사'}의 서비스를 사용해본 경험과 개선하고 싶은 점이 있다면 말씀해주세요.`
      ];
      return questions;
    });
  },

  generateFeedback(answer) {
    return Util.delay(800).then(() => {
      const text = (answer || '').trim();
      if (!text) return '답변을 작성하면 AI가 피드백을 드려요.';
      if (text.length < 50) return '조금 더 구체적인 상황과 결과 수치를 포함하면 답변이 훨씬 설득력 있어질 거예요.';
      return 'STAR 기법(상황-과제-행동-결과)이 잘 드러나는 답변이에요. 결과를 정량적인 수치로 보여주면 더 강력해질 거예요.';
    });
  }
};
