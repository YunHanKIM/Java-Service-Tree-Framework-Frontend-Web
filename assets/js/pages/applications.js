$(function () {
  if (!Auth.requireLogin('login.html')) return;
  Seed.ensure();
  Nav.init();

  const $board = $('#kanbanBoard');
  const detailModalEl = document.getElementById('detailModal');
  const bsModal = new bootstrap.Modal(detailModalEl);
  const bsToast = new bootstrap.Toast(document.getElementById('appToast'), { delay: 3000 });

  // ---------- 데이터 조회 (검색·정렬) ----------

  function getFilteredSorted() {
    const query = $('#searchInput').val().trim().toLowerCase();
    const sort = $('#sortSelect').val();
    let list = Store.applications.listWithPostings().filter((a) => a.posting);

    if (query) {
      list = list.filter((a) =>
        (a.posting.title || '').toLowerCase().includes(query) ||
        (a.posting.company || '').toLowerCase().includes(query)
      );
    }

    if (sort === 'deadline') {
      list.sort((a, b) => {
        const da = a.posting.deadline ? new Date(a.posting.deadline).getTime() : Infinity;
        const db = b.posting.deadline ? new Date(b.posting.deadline).getTime() : Infinity;
        return da - db;
      });
    } else {
      list.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
    }
    return list;
  }

  // ---------- 렌더 ----------

  function cardHtml(app, posting) {
    const days = Util.daysUntil(posting.deadline);
    const deadlineBadge = posting.deadline
      ? `<span class="${days !== null && days <= 7 ? 'deadline-badge' : 'deadline-badge deadline-badge--normal'}">D-${days}</span>`
      : '';
    const skillsPreview = (posting.requiredSkills || []).slice(0, 2)
      .map((s) => `<span class="skill-pill skill-pill--neutral">${Util.escapeHtml(s)}</span>`).join(' ');
    const stageOptions = Store.STAGES.map((s) => `<option value="${s}" ${s === app.stage ? 'selected' : ''}>${Store.STAGE_LABELS[s]}</option>`).join('');

    return `
      <div class="kanban-card" draggable="true" data-application-id="${app.id}" tabindex="0" role="listitem" aria-label="${Util.escapeHtml(posting.title || '')} · ${Util.escapeHtml(posting.company || '')}">
        <div class="kanban-card-title text-truncate">${Util.escapeHtml(posting.title || '(제목 없음)')}</div>
        <div class="kanban-card-company text-truncate mb-2">${Util.escapeHtml(posting.company || '')}</div>
        <div class="d-flex flex-wrap gap-1 mb-2">${skillsPreview}${deadlineBadge}</div>
        <select class="form-select form-select-sm stage-select" data-application-id="${app.id}" aria-label="지원 상태 변경">
          ${stageOptions}
        </select>
      </div>
    `;
  }

  function renderBoard() {
    const list = getFilteredSorted();
    $board.empty();

    Store.STAGES.forEach((stage) => {
      const items = list.filter((a) => a.stage === stage);
      const $col = $(`
        <div class="kanban-column" data-stage="${stage}" role="list" aria-label="${Store.STAGE_LABELS[stage]} 단계">
          <div class="kanban-column-header">
            <span>${Store.STAGE_LABELS[stage]}</span>
            <span class="kanban-column-count">${items.length}</span>
          </div>
          <div class="kanban-column-body"></div>
        </div>
      `);
      const $body = $col.find('.kanban-column-body');
      if (items.length === 0) {
        $body.append('<div class="text-faint small text-center py-4">카드 없음</div>');
      } else {
        items.forEach((a) => $body.append(cardHtml(a, a.posting)));
      }
      $board.append($col);
    });

    $('#resultCount').text(`${list.length}건`);
  }

  function updateColumnCounts() {
    Store.STAGES.forEach((stage) => {
      const count = $(`.kanban-column[data-stage="${stage}"] .kanban-card`).length;
      $(`.kanban-column[data-stage="${stage}"] .kanban-column-count`).text(count);
    });
  }

  function showToast(message, variant) {
    const bg = variant === 'success' ? 'bg-success' : variant === 'danger' ? 'bg-danger' : 'bg-secondary';
    $('#appToast').removeClass('bg-success bg-danger bg-secondary').addClass(bg);
    $('#appToastBody').text(message);
    bsToast.show();
  }

  // ---------- 낙관적 업데이트: 드래그·셀렉트로 단계 변경 ----------
  // 서버가 없어 진짜 실패는 없지만, 실패-복구 흐름을 보여주기 위해 12% 확률로 실패를 시뮬레이션한다.

  function simulateStageUpdate() {
    return Util.delay(450).then(() => {
      if (Math.random() < 0.12) throw new Error('mock_network_error');
    });
  }

  function changeStage(applicationId, newStage) {
    const cardEl = document.querySelector(`.kanban-card[data-application-id="${applicationId}"]`);
    const app = Store.applications.get(applicationId);
    if (!cardEl || !app || app.stage === newStage) return;

    const posting = Store.postings.get(app.postingId);
    const originalParent = cardEl.parentElement;
    const originalNext = cardEl.nextElementSibling;

    // 낙관적 업데이트: 서버 응답을 기다리지 않고 먼저 화면을 이동
    document.querySelector(`.kanban-column[data-stage="${newStage}"] .kanban-column-body`).appendChild(cardEl);
    $(cardEl).find('.stage-select').val(newStage);
    updateColumnCounts();

    simulateStageUpdate()
      .then(() => {
        Store.applications.updateStage(applicationId, newStage);
        showToast(`"${posting ? posting.title : '공고'}" → ${Store.STAGE_LABELS[newStage]}(으)로 이동했어요.`, 'success');
      })
      .catch(() => {
        // 실패 시 원래 위치로 복구
        if (originalNext) originalParent.insertBefore(cardEl, originalNext);
        else originalParent.appendChild(cardEl);
        $(cardEl).find('.stage-select').val(app.stage);
        updateColumnCounts();
        showToast('상태 변경에 실패했어요. 다시 시도해주세요.', 'danger');
      });
  }

  $(document).on('dragstart', '.kanban-card', function (e) {
    e.originalEvent.dataTransfer.setData('text/plain', $(this).data('application-id'));
    e.originalEvent.dataTransfer.effectAllowed = 'move';
    $(this).addClass('dragging');
  });
  $(document).on('dragend', '.kanban-card', function () {
    $(this).removeClass('dragging');
  });
  $(document).on('dragover', '.kanban-column', function (e) {
    e.preventDefault();
    $(this).addClass('drag-over');
  });
  $(document).on('dragleave', '.kanban-column', function () {
    $(this).removeClass('drag-over');
  });
  $(document).on('drop', '.kanban-column', function (e) {
    e.preventDefault();
    $(this).removeClass('drag-over');
    const appId = e.originalEvent.dataTransfer.getData('text/plain');
    changeStage(appId, $(this).data('stage'));
  });
  $(document).on('change', '.stage-select', function () {
    changeStage($(this).data('application-id'), this.value);
  });

  // ---------- 상세 모달 ----------

  $(document).on('click', '.kanban-card', function (e) {
    if ($(e.target).closest('.stage-select').length) return;
    openDetailModal($(this).data('application-id'));
  });
  $(document).on('keydown', '.kanban-card', function (e) {
    if ((e.key === 'Enter' || e.key === ' ') && !$(e.target).is('select')) {
      e.preventDefault();
      openDetailModal($(this).data('application-id'));
    }
  });

  function openDetailModal(applicationId) {
    const app = Store.applications.get(applicationId);
    const posting = app ? Store.postings.get(app.postingId) : null;
    if (!app || !posting) return;

    const stageOptions = Store.STAGES.map((s) => `<option value="${s}" ${s === app.stage ? 'selected' : ''}>${Store.STAGE_LABELS[s]}</option>`).join('');
    const skills = [...(posting.requiredSkills || []), ...(posting.preferredSkills || [])]
      .map((s) => `<span class="skill-pill skill-pill--neutral">${Util.escapeHtml(s)}</span>`).join(' ') || '<span class="text-faint small">없음</span>';

    $('#detailModalContent').html(`
      <div class="modal-header">
        <div>
          <div class="text-faint small">${Util.escapeHtml(posting.company || '')}</div>
          <h2 class="h5 modal-title mb-0">${Util.escapeHtml(posting.title || '(제목 없음)')}</h2>
        </div>
        <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="닫기"></button>
      </div>
      <div class="modal-body">
        <div class="d-flex flex-wrap gap-2 small text-muted-2 mb-3">
          ${posting.location ? `<span><i class="bi bi-geo-alt"></i> ${Util.escapeHtml(posting.location)}</span>` : ''}
          ${posting.employmentType ? `<span><i class="bi bi-briefcase"></i> ${Util.escapeHtml(posting.employmentType)}</span>` : ''}
          ${posting.deadline ? `<span><i class="bi bi-calendar-event"></i> ${Util.escapeHtml(Util.formatDate(posting.deadline))}</span>` : ''}
        </div>
        <div class="mb-3">${skills}</div>

        <label class="form-label small fw-semibold">지원 단계</label>
        <select id="modalStageSelect" class="form-select form-select-sm mb-3">${stageOptions}</select>

        <label class="form-label small fw-semibold">메모</label>
        <textarea id="modalResultNote" class="form-control form-control-sm mb-3" rows="2" placeholder="예: 1차 서류 합격, 최종 결과 대기 중">${Util.escapeHtml(app.resultNote || '')}</textarea>

        <div class="d-flex flex-wrap gap-2">
          <a href="analyze.html?postingId=${posting.id}" class="btn btn-sm btn-outline-primary"><i class="bi bi-file-earmark-text"></i> 공고 분석 다시 보기</a>
          <a href="interview.html?applicationId=${app.id}" class="btn btn-sm btn-outline-primary"><i class="bi bi-chat-square-text"></i> 면접 준비</a>
        </div>
      </div>
      <div class="modal-footer justify-content-between">
        <button type="button" id="modalRemoveBtn" class="btn btn-sm btn-outline-danger"><i class="bi bi-trash"></i> 지원 목록에서 제거</button>
        <button type="button" class="btn btn-sm btn-primary" data-bs-dismiss="modal">닫기</button>
      </div>
    `);

    $('#modalStageSelect').on('change', function () {
      changeStage(applicationId, this.value);
    });
    $('#modalResultNote').on('blur', function () {
      Store.applications.updateResultNote(applicationId, $(this).val());
    });
    $('#modalRemoveBtn').on('click', function () {
      if (!window.confirm('지원 목록에서 제거할까요? 등록된 공고와 분석 결과는 유지돼요.')) return;
      Store.applications.remove(applicationId);
      bsModal.hide();
      renderBoard();
      showToast('지원 목록에서 제거했어요.', 'secondary');
    });

    bsModal.show();
  }

  $('#searchInput').on('input', renderBoard);
  $('#sortSelect').on('change', renderBoard);

  renderBoard();
});
