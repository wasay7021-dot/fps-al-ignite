/* FPS IGNITE XIII - login page */
(function () {
  'use strict';
  IG.renderChrome('login');
  var role = 'delegate', busy = false;
  var err = IG.$('err');

  var flash = IG.takeFlash();
  if (flash) { err.textContent = flash; }

  // already signed in on this device? offer to continue
  var s = IG.session();
  if (s) {
    var box = IG.$('already');
    box.style.display = 'block';
    box.innerHTML = 'You are signed in as <b>' + IG.esc(s.name || s.email || 'this account') + '</b>. <a class="red" href="' + (IG.isStaff(s) ? 'admin.html' : 'events.html') + '"><b>Continue</b></a> &nbsp;or&nbsp; <a href="#" id="so" class="red"><b>sign out</b></a>';
    IG.$('so').addEventListener('click', function (e) { e.preventDefault(); IG.logout(); });
  }

  var tabs = document.querySelectorAll('.tabs button');
  Array.prototype.forEach.call(tabs, function (b) {
    b.addEventListener('click', function () {
      role = b.getAttribute('data-role');
      Array.prototype.forEach.call(tabs, function (x) { x.classList.toggle('on', x === b); });
      err.textContent = '';
    });
  });

  IG.$('loginform').addEventListener('submit', function (e) {
    e.preventDefault();
    if (busy) return;
    var email = IG.$('email').value.trim(), pw = IG.$('password').value;
    if (!email || !pw) { err.textContent = 'Enter your email and password.'; return; }
    busy = true; err.textContent = ''; var btn = IG.$('submit'); btn.disabled = true; btn.textContent = 'Signing in...';
    IG.rpc('login', { p_email: email, p_password: pw, p_device: IG.deviceId(), p_portal: role }).then(function (r) {
      if (r && r.error) { err.textContent = IG.errMsg({ code: r.error }); return; }
      IG.setSession({ token: r.token, role: r.role, name: r.name, email: email.toLowerCase() });
      location.href = (r.role === 'admin' || r.role === 'viewer') ? 'admin.html' : 'events.html';
    }).catch(function (e2) {
      err.textContent = IG.errMsg(e2);
    }).then(function () { busy = false; btn.disabled = false; btn.textContent = 'Sign in ↗'; });
  });
})();
