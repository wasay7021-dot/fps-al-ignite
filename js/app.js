/* =====================================================================
   FPS IGNITE XIII - core script (loaded by every page)
   Gives every page:  IG.rpc / IG.call   talk to the database
                      IG.live            screens that update by themselves
                      IG.boot            header, footer, sign-in checks
   Nothing in here needs editing. Settings are in js/config.js.
   ===================================================================== */
(function () {
  'use strict';
  var CFG = window.IGNITE_CONFIG || {};
  /* keep only https://xxxx.supabase.co even if extra path/quotes/spaces were pasted */
  (function () { var m = String(CFG.SUPABASE_URL || "").trim().match(/^(https?:\/\/[^\/\s"']+)/i); if (m) CFG.SUPABASE_URL = m[1]; CFG.SUPABASE_ANON_KEY = String(CFG.SUPABASE_ANON_KEY || "").replace(/\s+/g, ""); })();
  var SKEY = 'ignite_session_v2', DKEY = 'ignite_device_v2', FKEY = 'ignite_flash_v2';
  var IG = (window.IG = {});
  IG.cfg = CFG;
  IG.CUR = [['usd', 'Dollar'], ['eur', 'Euro'], ['cny', 'Yuan'], ['jpy', 'Yen'], ['rub', 'Ruble'], ['sar', 'Riyal']];
  IG.curName = function (c) { for (var i = 0; i < IG.CUR.length; i++) if (IG.CUR[i][0] === c) return IG.CUR[i][1]; return c; };

  /* ---------------------------------------------------------- tiny helpers */
  IG.$ = function (id) { return document.getElementById(id); };
  IG.esc = function (s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; });
  };
  IG.fmt = function (n) { return n == null || isNaN(n) ? '-' : Number(n).toLocaleString('en-US'); };
  IG.signed = function (n) { n = Number(n) || 0; return (n > 0 ? '+' : n < 0 ? '-' : '') + IG.fmt(Math.abs(n)); };
  IG.cls = function (n) { n = Number(n) || 0; return n > 0 ? 'pos' : n < 0 ? 'neg' : ''; };
  /* "+102 ICs" in green, "-230 ICs" in red */
  IG.pnl = function (n, suffix) { return '<span class="' + IG.cls(n) + '">' + IG.signed(n) + (suffix === undefined ? ' ICs' : suffix) + '</span>'; };
  IG.mmss = function (sec) { sec = Math.max(0, Math.round(sec)); var h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60), s = sec % 60; return (h ? h + ':' + ('0' + m).slice(-2) : m) + ':' + ('0' + s).slice(-2); };
  IG.clock = function (ts) { var d = new Date(ts); return isNaN(d) ? '' : d.toLocaleTimeString('en-GB'); };
  IG.setText = function (id, v) { var e = IG.$(id); if (e && e.textContent !== String(v)) e.textContent = v; };
  /* only touch the page when the HTML really changed (keeps typing, focus and scroll untouched) */
  IG.setHtml = function (id, html) { var e = typeof id === 'string' ? IG.$(id) : id; if (e && e.__h !== html) { e.__h = html; e.innerHTML = html; } };
  IG.mediaUrl = function (path) { return (CFG.SUPABASE_URL || '').replace(/\/+$/, '') + '/storage/v1/object/public/crisis/' + encodeURI(path); };

  /* amount boxes: digits only, no minus / e / decimals, Enter submits */
  IG.numeric = function (input, opts) {
    opts = opts || {};
    input.setAttribute('type', 'text');
    input.setAttribute('inputmode', 'numeric');
    input.setAttribute('pattern', '[0-9]*');
    input.setAttribute('autocomplete', 'off');
    input.setAttribute('autocapitalize', 'off');
    input.setAttribute('spellcheck', 'false');
    input.addEventListener('input', function () {
      var v = input.value.replace(/[^0-9]/g, '').replace(/^0+(?=[0-9])/, '').slice(0, 9);
      if (v !== input.value) input.value = v;
      if (opts.onInput) opts.onInput(v === '' ? null : parseInt(v, 10));
    });
    input.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' && opts.onEnter) { e.preventDefault(); opts.onEnter(); }
    });
  };
  IG.val = function (input) { var v = String(input.value || '').replace(/[^0-9]/g, ''); return v === '' ? null : parseInt(v, 10); };

  var toastTimer;
  IG.toast = function (msg, kind) {
    var t = IG.$('toast');
    if (!t) { t = document.createElement('div'); t.id = 'toast'; t.className = 'toast'; t.setAttribute('role', 'status'); document.body.appendChild(t); }
    t.textContent = msg; t.className = 'toast show ' + (kind || '');
    clearTimeout(toastTimer); toastTimer = setTimeout(function () { t.className = 'toast ' + (kind || ''); }, kind === 'err' ? 5200 : 2600);
  };

  /* -------------------------------------------------- device + sign-in memory */
  function store(k, v) { try { if (v === undefined) return localStorage.getItem(k); if (v === null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch (e) { return null; } }
  IG.deviceId = function () {
    var d = store(DKEY);
    if (!d || d.length < 8) {
      d = (window.crypto && crypto.randomUUID) ? crypto.randomUUID() : 'd' + Math.random().toString(36).slice(2) + Date.now().toString(36) + Math.random().toString(36).slice(2);
      store(DKEY, d);
    }
    return d;
  };
  IG.session = function () { try { return JSON.parse(store(SKEY)) || null; } catch (e) { return null; } };
  IG.setSession = function (s) { store(SKEY, s ? JSON.stringify(s) : null); };
  IG.flash = function (msg) { try { sessionStorage.setItem(FKEY, msg); } catch (e) {} };
  IG.takeFlash = function () { try { var m = sessionStorage.getItem(FKEY); sessionStorage.removeItem(FKEY); return m; } catch (e) { return null; } };
  IG.isStaff = function (s) { s = s || IG.session(); return !!s && (s.role === 'admin' || s.role === 'viewer'); };

  /* ------------------------------------------------------------ talking to the database */
  var MESSAGES = {
    ALREADY_LOGGED_IN: 'Already Logged in From Another Device',
    DEVICE_BUSY: 'Another account is already signed in on this device. Sign out of it first.',
    BAD_LOGIN: 'Incorrect email or password.',
    BAD_DEVICE: 'This browser could not be identified. Allow site storage and try again.',
    TOO_MANY_ATTEMPTS: 'Too many failed attempts. Wait a few minutes and try again.',
    USE_ADMIN_PORTAL: 'This is an organizer account. Use the Admin portal tab.',
    USE_DELEGATE_PORTAL: 'This is a delegation account. Use the Delegate portal tab.',
    SESSION_ENDED: 'You were signed out. Please sign in again.',
    ADMIN_ONLY: 'Only an admin can do that.',
    STAFF_ONLY: 'Organizers only.',
    DELEGATE_ONLY: 'Only delegation accounts can do that.',
    ROUND_CHANGED: 'The round just changed. Check the new prices and try again.',
    NETWORK: 'Cannot reach the server. Check your internet connection.',
    NOT_CONFIGURED: 'The website is not connected to its database yet (see SETUP.md).'
  };
  IG.errMsg = function (e) { var c = e && (e.code || e.message); return MESSAGES[c] || (e && e.message) || 'Something went wrong.'; };
  function mkErr(code) { var e = new Error(code); e.code = code; return e; }

  IG.configured = function () {
    return /^https?:\/\/[^ ]+$/.test(CFG.SUPABASE_URL || '') && (CFG.SUPABASE_URL || '').indexOf('PASTE') < 0 && (CFG.SUPABASE_ANON_KEY || '').length > 30 && (CFG.SUPABASE_ANON_KEY || '').indexOf('PASTE') < 0;
  };

  IG.rpc = function (fn, args) {
    if (!IG.configured()) return Promise.reject(mkErr('NOT_CONFIGURED'));
    var ctl = window.AbortController ? new AbortController() : null;
    var to = ctl ? setTimeout(function () { ctl.abort(); }, 20000) : null;
    return fetch(CFG.SUPABASE_URL.replace(/\/+$/, '') + '/rest/v1/rpc/' + fn, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', apikey: CFG.SUPABASE_ANON_KEY, Authorization: 'Bearer ' + CFG.SUPABASE_ANON_KEY },
      body: JSON.stringify(args || {}),
      signal: ctl ? ctl.signal : undefined,
      cache: 'no-store'
    }).then(function (r) {
      if (to) clearTimeout(to);
      return r.text().then(function (t) {
        var j = null; try { j = t ? JSON.parse(t) : null; } catch (e) {}
        if (!r.ok) throw mkErr((j && j.message) || 'HTTP ' + r.status);
        return j;
      });
    }, function () { if (to) clearTimeout(to); throw mkErr('NETWORK'); });
  };

  /* same as rpc, but adds your sign-in token and handles "you were signed out" */
  IG.call = function (fn, args) {
    var s = IG.session(); args = Object.assign({}, args || {});
    if (s && !('p_token' in args)) args.p_token = s.token;
    return IG.rpc(fn, args).catch(function (e) {
      if (e.code === 'SESSION_ENDED' && fn !== 'login') IG.endSession('SESSION_ENDED');
      throw e;
    });
  };
  IG.endSession = function (reason) {
    IG.setSession(null);
    if (reason) IG.flash(MESSAGES[reason] || reason);
    if (!/login\.html$/.test(location.pathname)) location.href = 'login.html';
  };
  IG.logout = function () {
    var s = IG.session();
    var done = function () { IG.setSession(null); location.href = 'index.html'; };
    if (!s) return done();
    IG.rpc('logout', { p_token: s.token }).then(done, done);
  };

  /* ---------------------------------------------------------- live screens */
  IG._off = 0;
  IG.serverNow = function () { return Date.now() + IG._off; };
  IG.setConn = function (ok) {
    var e = IG.$('conn'); if (!e) return;
    e.className = 'live' + (ok ? '' : ' off'); e.textContent = ok ? 'Live' : 'Reconnecting...';
  };

  /* IG.live('forex_state', function(){return {};}, function(data){ ...draw... })
     Asks the database every couple of seconds. If nothing changed the answer is
     a few bytes; if something changed, onData(data) runs. No refreshing needed. */
  IG.live = function (fn, getArgs, onData, opts) {
    opts = opts || {};
    var known = null, timer = null, stopped = false, busy = false, again = false;
    function gap() { return document.hidden ? (CFG.POLL_HIDDEN_MS || 15000) : (CFG.POLL_MS || 2500); }
    function schedule() { clearTimeout(timer); if (!stopped) timer = setTimeout(function () { tick(false); }, gap()); }
    function tick(force) {
      if (stopped) return;
      if (busy) { if (force) again = true; return; }
      busy = true; clearTimeout(timer);
      var args = Object.assign({}, getArgs ? getArgs() : {});
      args.p_known = force ? null : known;
      IG.call(fn, args).then(function (r) {
        IG.setConn(true);
        if (r && r.now) IG._off = r.now - Date.now();
        if (r && !r.same) { known = r.h; onData(r.data, r); }
        else if (opts.onSame) opts.onSame(r);
      }, function (e) {
        IG.setConn(e.code !== 'NETWORK');
        if (e.code !== 'SESSION_ENDED' && opts.onError) opts.onError(e);
      }).then(function () {
        busy = false;
        if (again) { again = false; tick(true); } else schedule();
      });
    }
    var vis = function () { if (!document.hidden) tick(false); };
    document.addEventListener('visibilitychange', vis);
    tick(true);
    return {
      refresh: function () { tick(true); },
      stop: function () { stopped = true; clearTimeout(timer); document.removeEventListener('visibilitychange', vis); }
    };
  };

  /* a ticking mm:ss countdown that follows the server's clock */
  IG.countdown = function (el, endsMs, onZero) {
    if (el.__cd) clearInterval(el.__cd);
    if (!endsMs) { el.textContent = ''; return; }
    var fired = false;
    function f() {
      var s = Math.max(0, (endsMs - IG.serverNow()) / 1000);
      el.textContent = IG.mmss(Math.ceil(s));
      if (s <= 0 && !fired) { fired = true; if (onZero) onZero(); }
    }
    f(); el.__cd = setInterval(f, 500);
  };

  /* ------------------------------------------------------------ page frame */
  var NAV = [['index.html', 'Home', 'home'], ['index.html#about', 'About', 'about'], ['events.html', 'Events', 'events'], ['council.html', 'Council', 'council']];
  function activeKey(page) { return { auction: 'events', rooms: 'events', forex: 'events', events: 'events', home: 'home', council: 'council' }[page] || page; }

  IG.renderChrome = function (page) {
    var s = IG.session(), act = activeKey(page), h = '';
    if (!IG.configured()) h += '<div class="setupbar">The website is not connected to its database yet. Open SETUP.md and paste your two Supabase keys into js/config.js.</div>';
    h += '<header class="site" id="siteheader"><div class="container"><a class="logo" href="index.html"><img src="images/logo.png" alt="FPS IGNITE XIII"></a>';
    h += '<button class="burger" id="burger" aria-label="Menu"><span></span><span></span></button><nav class="main" id="mainnav">';
    NAV.forEach(function (n) { h += '<a href="' + n[0] + '"' + (act === n[2] && n[2] !== 'about' ? ' class="active"' : '') + ' data-nav="' + n[2] + '">' + n[1] + '</a>'; });
    if (s) {
      if (s.role === 'delegate') h += '<a href="profile.html"' + (page === 'profile' ? ' class="active"' : '') + '>' + IG.esc(s.name || 'My delegation') + '</a>';
      else h += '<a href="admin.html"' + (page === 'admin' ? ' class="active"' : '') + '>Admin panel</a>';
      h += '<a href="#" id="signout">Sign out</a>';
    } else {
      h += '<a href="login.html" class="cta">Login portal &#8599;</a>';
    }
    h += '</nav></div></header>';
    var hd = IG.$('app-header'); if (hd) hd.innerHTML = h;
    var ft = IG.$('app-footer');
    if (ft) {
      var K = CFG.CONTACT || {}, SO = CFG.SOCIAL || {}, safe = function (u) { u = String(u || '').trim(); return /^https?:\/\//i.test(u) ? u : ''; };
      var ig = safe(SO.instagram), fb = safe(SO.facebook), soc = '';
      if (ig) soc += '<a href="' + IG.esc(ig) + '" target="_blank" rel="noopener" aria-label="Instagram"><svg viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.2" cy="6.8" r=".6"/></svg></a>';
      if (fb) soc += '<a href="' + IG.esc(fb) + '" target="_blank" rel="noopener" aria-label="Facebook"><svg viewBox="0 0 24 24"><path d="M14 8h3V4h-3a4 4 0 0 0-4 4v3H7v4h3v6h4v-6h3l1-4h-4V8z"/></svg></a>';
      var tel = String(K.phone || '').replace(/[^0-9+]/g, '');
      ft.innerHTML = '<footer class="site"><div class="container"><div class="l"><b>FPS IGNITE XIII</b><span>Foundation Public School &middot; Ideas into action.</span><a href="index.html#about">About</a><a href="events.html">Events</a><a href="council.html">Council</a></div>' +
        '<div class="contact">' +
        (K.address ? '<div><span class="k">Address</span><span class="v">' + IG.esc(K.address) + '</span></div>' : '') +
        (K.email ? '<div><span class="k">Email</span><a class="v" href="mailto:' + IG.esc(K.email) + '">' + IG.esc(K.email) + '</a></div>' : '') +
        (K.phone ? '<div><span class="k">Phone</span><a class="v" href="tel:' + IG.esc(tel) + '">' + IG.esc(K.phone) + '</a></div>' : '') +
        (soc ? '<div><span class="k">Follow us</span><div class="social">' + soc + '</div></div>' : '') +
        '</div><div class="bottom"><div>&copy; 2026 FPS IGNITE</div></div></div></footer>';
    }
    var so = IG.$('signout'); if (so) so.addEventListener('click', function (e) { e.preventDefault(); IG.logout(); });
    var bg = IG.$('burger'); if (bg) bg.addEventListener('click', function () { document.body.classList.toggle('navopen'); });
    var nav = IG.$('mainnav'); if (nav) nav.addEventListener('click', function (e) { if (e.target.tagName === 'A') document.body.classList.remove('navopen'); });
    if (document.body.classList.contains('home')) {
      var hdr = IG.$('siteheader'), onS = function () { hdr.classList.toggle('scrolled', window.scrollY > 40); };
      window.addEventListener('scroll', onS, { passive: true }); onS();
    }
  };

  /* IG.boot('auction', {roles: ['delegate','admin','viewer']})  ->  the signed-in session, or null
     (and the visitor is sent to the login page when roles are required) */
  IG.boot = function (page, opts) {
    opts = opts || {};
    IG.renderChrome(page);
    var s = IG.session();
    if (opts.roles) {
      if (!s) { IG.flash('Please sign in to continue.'); location.href = 'login.html'; return null; }
      if (opts.roles.indexOf(s.role) < 0) { location.href = IG.isStaff(s) ? 'admin.html' : 'events.html'; return null; }
    }
    return s;
  };

  /* ------------------------------------------------- scroll-in animations */
  IG.reveal = function (root) {
    var els = Array.prototype.slice.call((root || document).querySelectorAll('.reveal:not(.in)'));
    if (!('IntersectionObserver' in window)) { els.forEach(function (e) { e.classList.add('in'); if (e.__onin) e.__onin(); }); return; }
    var io = new IntersectionObserver(function (list) {
      list.forEach(function (en) {
        if (!en.isIntersecting) return;
        en.target.classList.add('in'); io.unobserve(en.target);
        if (en.target.__onin) en.target.__onin();
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });
    els.forEach(function (e) { io.observe(e); });
  };
  /* count a number up when it scrolls into view */
  IG.countUp = function (el, to, trigger) {
    var done = false;
    (trigger || el).__onin = function () {
      if (done) return; done = true;
      var t0 = null, dur = 1400;
      function step(t) { if (t0 === null) t0 = t; var p = Math.min(1, (t - t0) / dur), e = 1 - Math.pow(1 - p, 3); el.textContent = Math.round(to * e); if (p < 1) requestAnimationFrame(step); else el.textContent = to; }
      requestAnimationFrame(step);
    };
  };
})();
