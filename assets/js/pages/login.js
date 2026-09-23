$(function () {
  if (Auth.redirectIfLoggedIn('../index.html')) return;

  const $form = $('#loginForm');
  const $error = $('#loginError');
  const $errorText = $('#loginErrorText');

  function showError(message) {
    $errorText.text(message);
    $error.removeClass('d-none');
  }

  $('#demoLoginBtn').on('click', function () {
    Store.auth.loginAsDemo();
    window.location.href = '../index.html';
  });

  $form.on('submit', function (e) {
    e.preventDefault();
    $error.addClass('d-none');

    const $email = $('#loginEmail');
    const $password = $('#loginPassword');
    const email = $email.val().trim();
    const password = $password.val();
    let valid = true;

    const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    $email.toggleClass('is-invalid', !emailOk);
    if (!emailOk) valid = false;

    const passwordOk = password.length >= 8;
    $password.toggleClass('is-invalid', !passwordOk);
    if (!passwordOk) valid = false;

    if (!valid) {
      showError('입력한 내용을 다시 확인해주세요.');
      return;
    }

    // 실제 인증 서버가 없어 입력값으로 목 세션을 생성한다 (docs/ai/12_known_issues 참조)
    Store.auth.login({
      id: Util.generateId('user'),
      name: email.split('@')[0],
      email
    });
    window.location.href = '../index.html';
  });
});
