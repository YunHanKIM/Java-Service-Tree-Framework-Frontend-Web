// 목 인증 가드 — 실제 서버 인증 없음, localStorage 세션 유무만 확인한다 (docs/ai/12_known_issues 참조)
const Auth = {
  // 보호된 페이지 상단에서 호출: 로그인 없으면 loginPath로 즉시 이동
  requireLogin(loginPath) {
    const user = Store.auth.getUser();
    if (!user) {
      window.location.href = loginPath;
      return null;
    }
    return user;
  },

  // 로그인 페이지에서 호출: 이미 로그인돼 있으면 homePath로 이동
  redirectIfLoggedIn(homePath) {
    if (Store.auth.getUser()) {
      window.location.href = homePath;
      return true;
    }
    return false;
  },

  logout(homePath) {
    Store.auth.logout();
    window.location.href = homePath;
  }
};
