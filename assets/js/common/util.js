// 공통 유틸 — ID 생성, 날짜 포맷, 안전한 문자열 삽입, 지연(delay) 헬퍼
const Util = {
  generateId(prefix) {
    const rand = Math.random().toString(36).slice(2, 8);
    return `${prefix || 'id'}_${Date.now().toString(36)}_${rand}`;
  },

  nowIso() {
    return new Date().toISOString();
  },

  formatDate(isoString) {
    if (!isoString) return '';
    const d = new Date(isoString);
    if (Number.isNaN(d.getTime())) return '';
    return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
  },

  formatRelativeTime(isoString) {
    if (!isoString) return '';
    const diffMs = Date.now() - new Date(isoString).getTime();
    const diffMin = Math.floor(diffMs / 60000);
    if (diffMin < 1) return '방금 전';
    if (diffMin < 60) return `${diffMin}분 전`;
    const diffHour = Math.floor(diffMin / 60);
    if (diffHour < 24) return `${diffHour}시간 전`;
    const diffDay = Math.floor(diffHour / 24);
    if (diffDay < 7) return `${diffDay}일 전`;
    return Util.formatDate(isoString);
  },

  daysUntil(isoDateString) {
    if (!isoDateString) return null;
    const target = new Date(isoDateString);
    if (Number.isNaN(target.getTime())) return null;
    const diffMs = target.setHours(0, 0, 0, 0) - new Date().setHours(0, 0, 0, 0);
    return Math.round(diffMs / 86400000);
  },

  escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, (ch) => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    }[ch]));
  },

  delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
};
