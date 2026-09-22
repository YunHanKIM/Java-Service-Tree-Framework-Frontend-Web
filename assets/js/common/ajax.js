// Backend-Core 호출 공통 래퍼 — /arms/... 관례 (docs/ai/09_api_contract 참조)
const Api = {
  get(path, params) {
    return $.ajax({
      url: window.APP_CONFIG.apiBaseUrl + path,
      method: 'GET',
      data: params
    });
  },
  post(path, body) {
    return $.ajax({
      url: window.APP_CONFIG.apiBaseUrl + path,
      method: 'POST',
      contentType: 'application/json',
      data: JSON.stringify(body)
    });
  }
};
