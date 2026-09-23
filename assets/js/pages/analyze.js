$(function () {
  if (!Auth.requireLogin('login.html')) return;
  Seed.ensure();
  Nav.init();

  const PIPELINE_ICONS = {
    interested: 'bi-heart',
    planned: 'bi-clock',
    applied: 'bi-send',
    interview: 'bi-people',
    result: 'bi-trophy'
  };

  const $resultArea = $('#resultArea');
  const $inputNotice = $('#inputNotice');
  let activeTab = 'paste';
  let currentPosting = null;

  // ---------- 입력 탭 ----------

  function setActiveTab(tab) {
    activeTab = tab;
    $('.input-tab').removeClass('active').attr('aria-selected', 'false');
    $(`.input-tab[data-tab="${tab}"]`).addClass('active').attr('aria-selected', 'true');
    $('.input-panel').addClass('d-none');
    $(`#panel-${tab}`).removeClass('d-none');
    $inputNotice.addClass('d-none');
  }

  $('.input-tab').on('click', function () {
    setActiveTab($(this).data('tab'));
  });

  $('#pdfFile').on('change', function () {
    const file = this.files[0];
    if (!file) {
      $('#pdfFileInfo').addClass('d-none');
      return;
    }
    $('#pdfFileName').text(file.name);
    $('#pdfFileSize').text(`${(file.size / (1024 * 1024)).toFixed(1)} MB`);
    $('#pdfFileInfo').removeClass('d-none');
  });

  function showNotice(message) {
    $inputNotice.text(message).removeClass('d-none');
  }

  // ---------- 결과 영역 렌더 ----------

  function renderLoading(message) {
    $resultArea.html(`
      <div class="card-surface p-4">
        <p class="small text-muted-2 mb-3"><i class="bi bi-stars"></i> ${Util.escapeHtml(message)}</p>
        <div class="skeleton-line mb-2" style="width:60%;"></div>
        <div class="skeleton-line mb-2" style="width:90%;"></div>
        <div class="skeleton-line mb-2" style="width:75%;"></div>
        <div class="skeleton-line" style="width:40%;"></div>
      </div>
    `);
  }

  function parseCommaList(str) {
    return (str || '').split(',').map((s) => s.trim()).filter(Boolean);
  }

  function parseLineList(str) {
    return (str || '').split('\n').map((s) => s.trim()).filter(Boolean);
  }

  function renderExtractionForm(extracted) {
    $resultArea.html(`
      <div class="card-surface p-4">
        <div class="d-flex align-items-center justify-content-between mb-3">
          <h2 class="h6 mb-0"><i class="bi bi-pencil-square"></i> 추출 결과 확인·수정</h2>
          <span class="skill-pill skill-pill--neutral">AI 자동 추출</span>
        </div>
        <form id="extractionForm">
          <div class="row g-2 mb-2">
            <div class="col-6">
              <label class="form-label small fw-semibold">회사명</label>
              <input type="text" class="form-control form-control-sm" id="fCompany" value="${Util.escapeHtml(extracted.company)}" required>
            </div>
            <div class="col-6">
              <label class="form-label small fw-semibold">직무명</label>
              <input type="text" class="form-control form-control-sm" id="fTitle" value="${Util.escapeHtml(extracted.title)}" required>
            </div>
          </div>
          <div class="row g-2 mb-2">
            <div class="col-6">
              <label class="form-label small fw-semibold">근무지</label>
              <input type="text" class="form-control form-control-sm" id="fLocation" value="${Util.escapeHtml(extracted.location || '')}">
            </div>
            <div class="col-6">
              <label class="form-label small fw-semibold">경력·고용형태</label>
              <input type="text" class="form-control form-control-sm" id="fEmploymentType" value="${Util.escapeHtml(extracted.employmentType || '')}">
            </div>
          </div>
          <div class="mb-2">
            <label class="form-label small fw-semibold">마감일</label>
            <input type="date" class="form-control form-control-sm" id="fDeadline">
          </div>
          <div class="mb-2">
            <label class="form-label small fw-semibold">필수 기술 <span class="text-faint fw-normal">(쉼표로 구분)</span></label>
            <input type="text" class="form-control form-control-sm" id="fRequiredSkills" value="${Util.escapeHtml((extracted.requiredSkills || []).join(', '))}">
          </div>
          <div class="mb-2">
            <label class="form-label small fw-semibold">우대 기술 <span class="text-faint fw-normal">(쉼표로 구분)</span></label>
            <input type="text" class="form-control form-control-sm" id="fPreferredSkills" value="${Util.escapeHtml((extracted.preferredSkills || []).join(', '))}">
          </div>
          <div class="mb-3">
            <label class="form-label small fw-semibold">주요 업무 <span class="text-faint fw-normal">(줄바꿈으로 구분)</span></label>
            <textarea class="form-control form-control-sm" id="fResponsibilities" rows="3">${Util.escapeHtml((extracted.responsibilities || []).join('\n'))}</textarea>
          </div>
          <button type="submit" class="btn btn-primary w-100">
            <i class="bi bi-check2-circle"></i> 저장하고 이력서와 비교분석
          </button>
        </form>
      </div>
    `);

    $('#extractionForm').on('submit', function (e) {
      e.preventDefault();
      const data = {
        source: extracted.source || activeTab,
        company: $('#fCompany').val().trim(),
        title: $('#fTitle').val().trim(),
        location: $('#fLocation').val().trim(),
        employmentType: $('#fEmploymentType').val().trim(),
        deadline: $('#fDeadline').val() ? new Date($('#fDeadline').val()).toISOString() : null,
        requiredSkills: parseCommaList($('#fRequiredSkills').val()),
        preferredSkills: parseCommaList($('#fPreferredSkills').val()),
        responsibilities: parseLineList($('#fResponsibilities').val()),
        originalUrl: extracted.originalUrl || null
      };
      currentPosting = Store.postings.create(data);
      runComparison(currentPosting);
    });
  }

  function runComparison(posting) {
    renderLoading('이력서와 비교해 적합도를 분석하고 있어요...');
    MockAI.compareWithResume(posting, Store.resume.get()).then((analysis) => {
      Store.postings.saveAnalysis(posting.id, analysis);
      currentPosting = Store.postings.get(posting.id);
      renderPostingResult(currentPosting);
      renderPipelineStrip();
    });
  }

  function skillPillsHtml(skills, variant) {
    if (!skills.length) return `<span class="text-faint small">없음</span>`;
    return skills.map((s) => `<span class="skill-pill skill-pill--${variant}">${Util.escapeHtml(s)}</span>`).join(' ');
  }

  function renderPostingResult(posting) {
    const analysis = posting.analysis;
    const application = Store.applications.getByPosting(posting.id);
    const daysLeft = Util.daysUntil(posting.deadline);
    const deadlineHtml = posting.deadline
      ? `<span class="${daysLeft !== null && daysLeft <= 7 ? 'deadline-badge' : 'deadline-badge deadline-badge--normal'}"><i class="bi bi-calendar-event"></i> ${daysLeft >= 0 ? `D-${daysLeft}` : '마감'}</span>`
      : '';

    let matchingHtml = '';
    let missingHtml = '';
    let prepHtml = '';

    if (analysis) {
      matchingHtml = analysis.matchingSkills.length
        ? analysis.matchingSkills.map((s) => `
            <div class="mb-2 pb-2 border-bottom">
              <span class="skill-pill skill-pill--match mb-1"><i class="bi bi-check-circle"></i> ${Util.escapeHtml(s.name)}</span>
              <div class="small text-muted-2 mt-1">
                <div><span class="text-faint">공고:</span> ${Util.escapeHtml(s.postingEvidence)}</div>
                <div><span class="text-faint">내 이력서:</span> ${Util.escapeHtml(s.resumeEvidence)}</div>
              </div>
            </div>`).join('')
        : '<p class="small text-faint mb-0">일치하는 경험을 찾지 못했어요.</p>';

      missingHtml = analysis.missingSkills.length
        ? analysis.missingSkills.map((s) => `
            <div class="mb-2 pb-2 border-bottom">
              <span class="skill-pill skill-pill--gap mb-1"><i class="bi bi-exclamation-circle"></i> ${Util.escapeHtml(s.name)}</span>
              <div class="small text-muted-2 mt-1">${Util.escapeHtml(s.reason)}</div>
            </div>`).join('')
        : '<p class="small text-faint mb-0">보완할 경험이 없어요. 훌륭해요!</p>';

      prepHtml = analysis.prepItems.map((item) => `
        <div class="form-check mb-1">
          <input class="form-check-input prep-check" type="checkbox" id="${item.id}" data-prep-id="${item.id}" ${item.done ? 'checked' : ''}>
          <label class="form-check-label small ${item.done ? 'text-decoration-line-through text-faint' : ''}" for="${item.id}">${Util.escapeHtml(item.label)}</label>
        </div>
      `).join('');
    }

    const saveButtonHtml = application
      ? `<span class="skill-pill skill-pill--neutral"><i class="bi bi-bookmark-check"></i> 지원 현황: ${Util.escapeHtml(Store.STAGE_LABELS[application.stage])}</span>
         <a href="applications.html" class="btn btn-sm btn-outline-primary ms-2">칸반에서 관리</a>`
      : `<button type="button" id="saveApplicationBtn" class="btn btn-primary btn-sm"><i class="bi bi-bookmark-plus"></i> 지원 목록에 저장</button>`;

    $resultArea.html(`
      <div class="card-surface p-4 mb-3">
        <div class="d-flex justify-content-between align-items-start flex-wrap gap-2 mb-2">
          <div>
            <div class="text-faint small mb-1">${Util.escapeHtml(posting.company || '회사명 미입력')}</div>
            <h2 class="h5 mb-1">${Util.escapeHtml(posting.title || '직무명 미입력')}</h2>
            <div class="d-flex flex-wrap gap-2 small text-muted-2">
              ${posting.location ? `<span><i class="bi bi-geo-alt"></i> ${Util.escapeHtml(posting.location)}</span>` : ''}
              ${posting.employmentType ? `<span><i class="bi bi-briefcase"></i> ${Util.escapeHtml(posting.employmentType)}</span>` : ''}
              ${deadlineHtml}
            </div>
          </div>
          ${posting.originalUrl ? `<a href="${Util.escapeHtml(posting.originalUrl)}" target="_blank" rel="noopener" class="btn btn-sm btn-light"><i class="bi bi-box-arrow-up-right"></i> 원문 보기</a>` : ''}
        </div>
        <div class="mt-2">
          <div class="small fw-semibold mb-1">필수 기술</div>
          <div class="mb-2">${skillPillsHtml(posting.requiredSkills || [], 'neutral')}</div>
          <div class="small fw-semibold mb-1">우대 기술</div>
          <div>${skillPillsHtml(posting.preferredSkills || [], 'neutral')}</div>
        </div>
        <div class="mt-3 pt-3 border-top">${saveButtonHtml}</div>
      </div>

      ${analysis ? `
      <div class="row g-3">
        <div class="col-md-6">
          <div class="card-surface p-3 h-100">
            <h3 class="h6 mb-2"><i class="bi bi-check-circle text-success"></i> 일치하는 경험 <span class="text-faint fw-normal">(${analysis.matchingSkills.length}개)</span></h3>
            ${matchingHtml}
          </div>
        </div>
        <div class="col-md-6">
          <div class="card-surface p-3 h-100">
            <h3 class="h6 mb-2"><i class="bi bi-exclamation-circle" style="color:var(--color-warning);"></i> 보완할 경험 <span class="text-faint fw-normal">(${analysis.missingSkills.length}개)</span></h3>
            ${missingHtml}
          </div>
        </div>
      </div>
      <div class="card-surface p-3 mt-3">
        <h3 class="h6 mb-2"><i class="bi bi-list-check"></i> 추천 준비 항목</h3>
        ${prepHtml}
        <a href="interview.html${application ? `?applicationId=${application.id}` : ''}" class="btn btn-sm btn-outline-primary mt-2">
          <i class="bi bi-chat-square-text"></i> 예상 면접 질문 준비하기
        </a>
      </div>` : ''}
    `);

    if (!application) {
      $('#saveApplicationBtn').on('click', function () {
        Store.applications.create({ postingId: posting.id, stage: 'interested' });
        renderPostingResult(Store.postings.get(posting.id));
        renderPipelineStrip();
      });
    }

    $('.prep-check').on('change', function () {
      const id = $(this).data('prep-id');
      const p = Store.postings.get(posting.id);
      const item = p.analysis.prepItems.find((i) => i.id === id);
      item.done = this.checked;
      Store.postings.saveAnalysis(posting.id, p.analysis);
      $(this).next('label').toggleClass('text-decoration-line-through text-faint', item.done);
    });
  }

  function renderPipelineStrip() {
    const counts = Store.applications.counts();
    const $strip = $('#pipelineStrip').empty();
    Store.STAGES.forEach((stage, idx) => {
      $strip.append(`
        <div class="pipeline-step">
          <div class="pipeline-step-icon"><i class="bi ${PIPELINE_ICONS[stage]}"></i></div>
          <div class="small fw-semibold">${counts[stage] || 0}</div>
          <div class="text-faint" style="font-size:11px;">${Util.escapeHtml(Store.STAGE_LABELS[stage])}</div>
        </div>
      `);
      if (idx < Store.STAGES.length - 1) {
        $strip.append('<i class="bi bi-chevron-right pipeline-arrow"></i>');
      }
    });
  }

  // ---------- 분석 실행 ----------

  $('#analyzeBtn').on('click', function () {
    $inputNotice.addClass('d-none');

    if (activeTab === 'link') {
      const url = $('#linkUrl').val().trim();
      renderLoading('링크를 불러오고 있어요...');
      MockAI.importFromUrl(url)
        .then((extracted) => renderExtractionForm({ ...extracted, source: 'link' }))
        .catch((err) => {
          $resultArea.html(`
            <div class="empty-state card-surface">
              <div class="empty-state-icon"><i class="bi bi-search"></i></div>
              <p class="mb-0">왼쪽에서 공고를 입력하고 분석을 시작해보세요.</p>
            </div>
          `);
          showNotice(err.message);
          if (err.code === 'manual_input_required') {
            setActiveTab('paste');
            $('#pasteText').trigger('focus');
          }
        });
      return;
    }

    if (activeTab === 'pdf') {
      const file = $('#pdfFile')[0].files[0];
      if (!file) {
        showNotice('분석할 PDF 파일을 선택해주세요.');
        return;
      }
      if (file.size > 10 * 1024 * 1024) {
        showNotice('PDF 파일은 최대 10MB까지 업로드할 수 있어요.');
        return;
      }
      renderLoading('PDF에서 텍스트를 추출하고 있어요...');
      MockAI.parsePosting({ source: 'pdf', fileName: file.name }).then((extracted) => renderExtractionForm(extracted));
      return;
    }

    // paste
    const text = $('#pasteText').val().trim();
    if (!text) {
      showNotice('공고 본문을 붙여넣어주세요.');
      return;
    }
    renderLoading('공고 내용을 분석하고 있어요...');
    MockAI.parsePosting({ source: 'paste', text }).then((extracted) => renderExtractionForm(extracted));
  });

  // ---------- 딥링크 (postingId로 바로 결과 보기) ----------

  const postingId = new URLSearchParams(window.location.search).get('postingId');
  if (postingId) {
    const posting = Store.postings.get(postingId);
    if (posting) {
      currentPosting = posting;
      if (posting.analysis) {
        renderPostingResult(posting);
      } else {
        runComparison(posting);
      }
    }
  }

  renderPipelineStrip();
});
