$(function () {
  if (!Auth.requireLogin('pages/login.html')) return;
  Seed.ensure();
  Nav.init();

  // 순서형(ordinal) 단계 차트용 sequential blue 램프 — dataviz 스킬 palette.md 참조 (light 모드, step 250~650)
  const STAGE_RAMP = {
    interested: '#86b6ef',
    planned: '#5598e7',
    applied: '#2a78d6',
    interview: '#1c5cab',
    result: '#104281'
  };

  function renderStats() {
    const postings = Store.postings.list();
    const applications = Store.applications.list();
    const counts = Store.applications.counts();

    $('#statTotalPostings').text(postings.length);
    $('#statInProgress').text(applications.filter((a) => a.stage !== 'result').length);
    $('#statDeadlineSoon').text(
      postings.filter((p) => {
        const d = Util.daysUntil(p.deadline);
        return d !== null && d >= 0 && d <= 7;
      }).length
    );
    $('#statAdvanced').text((counts.interview || 0) + (counts.result || 0));
  }

  function renderFunnel() {
    const counts = Store.applications.counts();
    const max = Math.max(1, ...Store.STAGES.map((s) => counts[s] || 0));
    const $chart = $('#funnelChart').empty();

    Store.STAGES.forEach((stage) => {
      const value = counts[stage] || 0;
      const widthPct = Math.round((value / max) * 100);
      const $row = $(`
        <div class="funnel-row" tabindex="0" title="${Util.escapeHtml(Store.STAGE_LABELS[stage])}: ${value}건">
          <div class="funnel-label">${Util.escapeHtml(Store.STAGE_LABELS[stage])}</div>
          <div class="funnel-track">
            <div class="funnel-fill" style="width:${widthPct}%; background:${STAGE_RAMP[stage]};"></div>
          </div>
          <div class="funnel-value">${value}</div>
        </div>
      `);
      $chart.append($row);
    });
  }

  function renderDeadlines() {
    const postings = Store.postings.list()
      .filter((p) => p.deadline)
      .map((p) => ({ posting: p, days: Util.daysUntil(p.deadline) }))
      .filter((x) => x.days !== null && x.days >= 0)
      .sort((a, b) => a.days - b.days)
      .slice(0, 5);

    const $list = $('#deadlineList').empty();
    if (postings.length === 0) {
      $list.append('<div class="empty-state py-3"><div class="empty-state-icon"><i class="bi bi-calendar-check"></i></div><p class="mb-0 small">마감이 임박한 공고가 없어요.</p></div>');
      return;
    }
    postings.forEach(({ posting, days }) => {
      const badgeClass = days <= 3 ? 'deadline-badge' : 'deadline-badge deadline-badge--normal';
      const $item = $(`
        <div class="d-flex align-items-center justify-content-between py-2 border-bottom">
          <div class="text-truncate me-2">
            <div class="fw-semibold small text-truncate">${Util.escapeHtml(posting.title || '(제목 미입력)')}</div>
            <div class="text-muted-2" style="font-size:12px;">${Util.escapeHtml(posting.company || '회사명 미입력')}</div>
          </div>
          <span class="${badgeClass}">D-${days}</span>
        </div>
      `);
      $list.append($item);
    });
  }

  function renderRecentPostings() {
    const postings = Store.postings.list().slice(0, 5);
    const $list = $('#recentPostings').empty();

    if (postings.length === 0) {
      $list.append(`
        <div class="empty-state">
          <div class="empty-state-icon"><i class="bi bi-inbox"></i></div>
          <p class="mb-2">아직 등록한 공고가 없어요.</p>
          <a href="pages/analyze.html" class="btn btn-primary btn-sm">첫 공고 분석하기</a>
        </div>
      `);
      return;
    }

    const applications = Store.applications.list();
    postings.forEach((posting) => {
      const app = applications.find((a) => a.postingId === posting.id);
      const stageLabel = app ? Store.STAGE_LABELS[app.stage] : '미등록';
      const $item = $(`
        <div class="d-flex align-items-center justify-content-between py-2 border-bottom">
          <div class="text-truncate me-2">
            <div class="fw-semibold small text-truncate">${Util.escapeHtml(posting.title || '(제목 미입력)')} · ${Util.escapeHtml(posting.company || '')}</div>
            <div class="text-muted-2" style="font-size:12px;">${Util.escapeHtml(Util.formatRelativeTime(posting.createdAt))}</div>
          </div>
          <span class="skill-pill skill-pill--neutral flex-shrink-0">${Util.escapeHtml(stageLabel)}</span>
        </div>
      `);
      $list.append($item);
    });
  }

  renderStats();
  renderFunnel();
  renderDeadlines();
  renderRecentPostings();
});
