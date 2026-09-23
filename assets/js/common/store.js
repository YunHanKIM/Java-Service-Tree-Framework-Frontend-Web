// localStorage 목 데이터 계층 — 실제 백엔드 대신 사용 (docs/ai/09_api_contract, 10_data_model 참조)
// 함수 시그니처는 향후 실제 API로 교체해도 호출부가 최소 변경되도록 설계.
const STORAGE_KEYS = {
  user: 'jiwonnote.user',
  resume: 'jiwonnote.resume',
  postings: 'jiwonnote.postings',
  applications: 'jiwonnote.applications',
  interviewAnswers: 'jiwonnote.interviewAnswers'
};

const STAGES = ['interested', 'planned', 'applied', 'interview', 'result'];
const STAGE_LABELS = {
  interested: '관심',
  planned: '지원예정',
  applied: '지원완료',
  interview: '면접',
  result: '결과'
};

function readJson(key, fallback) {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch (e) {
    console.warn(`[store] ${key} 파싱 실패, 기본값 사용`, e);
    return fallback;
  }
}

function writeJson(key, value) {
  window.localStorage.setItem(key, JSON.stringify(value));
}

const Store = {
  STAGES,
  STAGE_LABELS,

  auth: {
    getUser() {
      return readJson(STORAGE_KEYS.user, null);
    },
    login(user) {
      writeJson(STORAGE_KEYS.user, user);
      return user;
    },
    loginAsDemo() {
      const demoUser = { id: 'user_demo', name: '김지원', email: 'demo@jiwonnote.app' };
      return this.login(demoUser);
    },
    logout() {
      window.localStorage.removeItem(STORAGE_KEYS.user);
    }
  },

  resume: {
    get() {
      return readJson(STORAGE_KEYS.resume, {
        summary: '',
        skills: [],
        experienceSummary: ''
      });
    },
    update(patch) {
      const next = { ...this.get(), ...patch };
      writeJson(STORAGE_KEYS.resume, next);
      return next;
    }
  },

  postings: {
    list() {
      return readJson(STORAGE_KEYS.postings, []);
    },
    get(id) {
      return this.list().find((p) => p.id === id) || null;
    },
    create(data) {
      const posting = {
        id: Util.generateId('posting'),
        source: data.source || 'paste',
        company: data.company || '',
        title: data.title || '',
        location: data.location || '',
        employmentType: data.employmentType || '',
        deadline: data.deadline || null,
        requiredSkills: data.requiredSkills || [],
        preferredSkills: data.preferredSkills || [],
        responsibilities: data.responsibilities || [],
        originalUrl: data.originalUrl || null,
        bookmarked: false,
        createdAt: Util.nowIso(),
        analysis: null
      };
      const list = this.list();
      list.unshift(posting);
      writeJson(STORAGE_KEYS.postings, list);
      return posting;
    },
    update(id, patch) {
      const list = this.list();
      const idx = list.findIndex((p) => p.id === id);
      if (idx === -1) return null;
      list[idx] = { ...list[idx], ...patch };
      writeJson(STORAGE_KEYS.postings, list);
      return list[idx];
    },
    remove(id) {
      writeJson(STORAGE_KEYS.postings, this.list().filter((p) => p.id !== id));
    },
    toggleBookmark(id) {
      const posting = this.get(id);
      if (!posting) return null;
      return this.update(id, { bookmarked: !posting.bookmarked });
    },
    saveAnalysis(id, analysis) {
      return this.update(id, { analysis });
    }
  },

  applications: {
    list() {
      return readJson(STORAGE_KEYS.applications, []);
    },
    get(id) {
      return this.list().find((a) => a.id === id) || null;
    },
    getByPosting(postingId) {
      return this.list().find((a) => a.postingId === postingId) || null;
    },
    create({ postingId, stage }) {
      const existing = this.getByPosting(postingId);
      if (existing) return existing;
      const application = {
        id: Util.generateId('app'),
        postingId,
        stage: stage || 'interested',
        resultNote: '',
        updatedAt: Util.nowIso()
      };
      const list = this.list();
      list.unshift(application);
      writeJson(STORAGE_KEYS.applications, list);
      return application;
    },
    updateStage(id, stage) {
      const list = this.list();
      const idx = list.findIndex((a) => a.id === id);
      if (idx === -1) return null;
      list[idx] = { ...list[idx], stage, updatedAt: Util.nowIso() };
      writeJson(STORAGE_KEYS.applications, list);
      return list[idx];
    },
    updateResultNote(id, resultNote) {
      const list = this.list();
      const idx = list.findIndex((a) => a.id === id);
      if (idx === -1) return null;
      list[idx] = { ...list[idx], resultNote, updatedAt: Util.nowIso() };
      writeJson(STORAGE_KEYS.applications, list);
      return list[idx];
    },
    remove(id) {
      writeJson(STORAGE_KEYS.applications, this.list().filter((a) => a.id !== id));
    },
    counts() {
      const list = this.list();
      return STAGES.reduce((acc, stage) => {
        acc[stage] = list.filter((a) => a.stage === stage).length;
        return acc;
      }, {});
    },
    listWithPostings() {
      const postings = Store.postings.list();
      return this.list().map((app) => ({
        ...app,
        posting: postings.find((p) => p.id === app.postingId) || null
      }));
    }
  },

  interview: {
    list() {
      return readJson(STORAGE_KEYS.interviewAnswers, []);
    },
    listByApplication(applicationId) {
      return this.list().filter((q) => q.applicationId === applicationId);
    },
    bulkCreate(applicationId, questions) {
      const list = this.list();
      const created = questions.map((question) => ({
        id: Util.generateId('qa'),
        applicationId,
        question,
        answer: '',
        feedback: null
      }));
      writeJson(STORAGE_KEYS.interviewAnswers, [...created, ...list]);
      return created;
    },
    updateAnswer(id, answer) {
      const list = this.list();
      const idx = list.findIndex((q) => q.id === id);
      if (idx === -1) return null;
      list[idx] = { ...list[idx], answer };
      writeJson(STORAGE_KEYS.interviewAnswers, list);
      return list[idx];
    },
    setFeedback(id, feedback) {
      const list = this.list();
      const idx = list.findIndex((q) => q.id === id);
      if (idx === -1) return null;
      list[idx] = { ...list[idx], feedback };
      writeJson(STORAGE_KEYS.interviewAnswers, list);
      return list[idx];
    }
  }
};
