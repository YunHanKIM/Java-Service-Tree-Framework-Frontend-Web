// 공통 네비게이션 동작 — 활성 메뉴 표시, 사용자 이름 렌더링, 로그아웃 버튼 (페이지마다 마크업은 복제, 동작만 공유)
const Nav = {
  init() {
    const currentPage = document.body.dataset.page;
    document.querySelectorAll(`.nav-item[data-page="${currentPage}"]`).forEach((el) => {
      el.classList.add('active');
      el.setAttribute('aria-current', 'page');
    });

    const user = Store.auth.getUser();
    document.querySelectorAll('[data-current-user-name]').forEach((el) => {
      el.textContent = user ? user.name : '게스트';
    });
    document.querySelectorAll('[data-current-user-initial]').forEach((el) => {
      el.textContent = user ? user.name.slice(0, 1) : '?';
    });

    document.querySelectorAll('[data-action="logout"]').forEach((btn) => {
      btn.addEventListener('click', () => Auth.logout(btn.dataset.homePath));
    });
  }
};
