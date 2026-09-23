$(function () {
  if (!Auth.requireLogin('login.html')) return;
  Seed.ensure();
  Nav.init();

  const $select = $('#applicationSelect');
  const $area = $('#interviewArea');

  function populateSelect(preferredId) {
    const apps = Store.applications.listWithPostings().filter((a) => a.posting);
    apps.sort((a, b) => {
      if (a.stage === 'interview' && b.stage !== 'interview') return -1;
      if (b.stage === 'interview' && a.stage !== 'interview') return 1;
      return new Date(b.updatedAt) - new Date(a.updatedAt);
    });

    $select.empty();
    if (apps.length === 0) {
      $select.append('<option value="">등록된 지원 항목이 없어요</option>').prop('disabled', true);
      return apps;
    }
    $select.prop('disabled', false);
    apps.forEach((a) => {
      $select.append(`<option value="${a.id}">${Util.escapeHtml(a.posting.company)} · ${Util.escapeHtml(a.posting.title)} (${Store.STAGE_LABELS[a.stage]})</option>`);
    });
    if (preferredId && apps.some((a) => a.id === preferredId)) {
      $select.val(preferredId);
    }
    return apps;
  }

  function renderEmptyNoApplications() {
    $area.html(`
      <div class="empty-state card-surface">
        <div class="empty-state-icon"><i class="bi bi-chat-square-text"></i></div>
        <p class="mb-2">아직 지원 목록에 저장된 공고가 없어요.</p>
        <a href="analyze.html" class="btn btn-primary btn-sm">공고 분석하러 가기</a>
      </div>
    `);
  }

  function qaCardHtml(qa) {
    return `
      <div class="card-surface p-3 mb-3" data-qa-id="${qa.id}">
        <p class="fw-semibold small mb-2"><i class="bi bi-question-circle"></i> ${Util.escapeHtml(qa.question)}</p>
        <textarea class="form-control form-control-sm answer-input" rows="3" placeholder="답변을 작성해보세요 (상황-과제-행동-결과 순서를 추천해요)">${Util.escapeHtml(qa.answer)}</textarea>
        <div class="d-flex justify-content-between align-items-center mt-2">
          <button type="button" class="btn btn-sm btn-outline-primary feedback-btn"><i class="bi bi-stars"></i> AI 피드백 받기</button>
        </div>
        <div class="feedback-box mt-2 ${qa.feedback ? '' : 'd-none'}">
          <div class="small" style="background:var(--color-accent-soft); color:var(--color-accent); border-radius:8px; padding:10px 12px;">
            <i class="bi bi-lightbulb"></i> <span class="feedback-text">${Util.escapeHtml(qa.feedback || '')}</span>
          </div>
        </div>
      </div>
    `;
  }

  function renderApplication(applicationId) {
    const application = Store.applications.get(applicationId);
    if (!application) {
      renderEmptyNoApplications();
      return;
    }
    const posting = Store.postings.get(application.postingId);

    $area.html(`
      <div class="card-surface p-3 mb-3 d-flex justify-content-between align-items-center flex-wrap gap-2">
        <div>
          <div class="text-faint small">${Util.escapeHtml(posting.company || '')}</div>
          <div class="fw-semibold">${Util.escapeHtml(posting.title || '')}</div>
        </div>
        <button type="button" id="regenerateBtn" class="btn btn-sm btn-outline-primary"></button>
      </div>
      <div id="questionsList"></div>
    `);

    function showQuestions() {
      const questions = Store.interview.listByApplication(application.id);
      $('#regenerateBtn').html(`<i class="bi bi-arrow-clockwise"></i> ${questions.length ? '질문 다시 만들기' : '예상 질문 만들기'}`);
      if (questions.length === 0) {
        $('#questionsList').html(`
          <div class="empty-state card-surface">
            <div class="empty-state-icon"><i class="bi bi-chat-square-text"></i></div>
            <p class="mb-0">아직 만든 질문이 없어요. 위 버튼으로 예상 면접 질문을 생성해보세요.</p>
          </div>
        `);
      } else {
        $('#questionsList').html(questions.map(qaCardHtml).join(''));
      }
    }

    $('#regenerateBtn').on('click', function () {
      $('#questionsList').html(`
        <div class="card-surface p-4">
          <p class="small text-muted-2 mb-3"><i class="bi bi-stars"></i> 예상 면접 질문을 만들고 있어요...</p>
          <div class="skeleton-line mb-2" style="width:80%;"></div>
          <div class="skeleton-line mb-2" style="width:65%;"></div>
          <div class="skeleton-line" style="width:70%;"></div>
        </div>
      `);
      MockAI.generateInterviewQuestions(posting).then((questions) => {
        Store.interview.bulkCreate(application.id, questions);
        showQuestions();
      });
    });

    showQuestions();
  }

  $(document).on('blur', '.answer-input', function () {
    const qaId = $(this).closest('[data-qa-id]').data('qa-id');
    Store.interview.updateAnswer(qaId, $(this).val());
  });

  $(document).on('click', '.feedback-btn', function () {
    const $card = $(this).closest('[data-qa-id]');
    const qaId = $card.data('qa-id');
    const answer = $card.find('.answer-input').val();
    const $btn = $(this);

    Store.interview.updateAnswer(qaId, answer);
    $btn.prop('disabled', true).html('<span class="spinner-border spinner-border-sm"></span> 분석 중...');

    MockAI.generateFeedback(answer).then((feedback) => {
      Store.interview.setFeedback(qaId, feedback);
      $card.find('.feedback-box').removeClass('d-none');
      $card.find('.feedback-text').text(feedback);
      $btn.prop('disabled', false).html('<i class="bi bi-stars"></i> AI 피드백 받기');
    });
  });

  $select.on('change', function () {
    if (!this.value) return;
    window.history.replaceState(null, '', `interview.html?applicationId=${this.value}`);
    renderApplication(this.value);
  });

  const apps = populateSelect(new URLSearchParams(window.location.search).get('applicationId'));
  if (apps.length === 0) {
    renderEmptyNoApplications();
  } else {
    renderApplication($select.val());
  }
});
