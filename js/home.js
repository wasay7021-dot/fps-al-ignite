/* FPS IGNITE XIII - builds the scrolling home page from js/content.js */
(function () {
  'use strict';
  IG.renderChrome('home');
  var C = window.SITE_CONTENT || {}, esc = IG.esc, root = IG.$('home'), s = IG.session();
  function redLast(t) { t = String(t || ''); var i = t.lastIndexOf(' '); return i < 0 ? '<span class="red">' + esc(t) + '</span>' : esc(t.slice(0, i + 1)) + '<span class="red">' + esc(t.slice(i + 1)) + '</span>'; }
  var portal = s ? (IG.isStaff(s) ? 'admin.html' : 'events.html') : 'login.html', portalTxt = s ? 'Open my portal' : 'Enter Portal';
  var H = C.HERO || {}, A = C.ABOUT || {}, h = '';

  /* ---------------- hero ---------------- */
  h += '<section class="hero" id="top"><div class="inner">' +
    '<div class="presents reveal">' + esc(H.presents) + '</div>' +
    '<img class="herologo reveal zoom" style="--d:.1s" src="images/logo-large.png" alt="FPS IGNITE XIII">' +
    '<div class="tag reveal" style="--d:.25s">' + esc(H.tagline) + '</div>' +
    '<div class="sub reveal" style="--d:.35s">' + esc(H.sub) + '</div>' +
    '<div class="btns reveal" style="--d:.45s"><a class="btn" href="' + portal + '">' + portalTxt + ' &#8599;</a><a class="btn light" href="#rules">Review Rules</a></div>' +
    '</div><div class="cue">Scroll</div></section>';

  /* ---------------- what is ignite (red) ---------------- */
  h += '<section class="section crimson" id="about"><div class="container"><div class="split">' +
    '<div class="reveal left"><div class="eyebrow">FPS IGNITE XIII</div><h2 class="big">' + esc(A.title) + '</h2>' + (A.paragraphs || []).map(function (p) { return '<p>' + esc(p) + '</p>'; }).join('') + '</div>' +
    '<div class="photo reveal right" style="--d:.15s"><div class="ph">' + esc(A.photoNote || '') + '</div><img src="' + esc(A.photo) + '" alt="" onerror="this.style.display=\'none\'"></div></div>' +
    '<div class="reveal" style="margin-top:70px"><h2 class="big" style="font-size:clamp(24px,4vw,36px)">' + esc(A.perspectivesTitle) + '</h2><p style="max-width:720px;margin-top:10px;color:#f1f1f6;font-size:14px">' + esc(A.perspectivesText) + '</p></div>' +
    '<div class="perspectives">' + (A.roles || []).map(function (r, i) { return '<div class="reveal zoom" style="--d:' + (i * 0.1) + 's">' + esc(r[0]) + '<small>' + esc(r[1]) + '</small></div>'; }).join('') + '</div>' +
    '</div></section>';

  /* ---------------- numbers + events ---------------- */
  h += '<section class="section" id="events"><div class="container">' +
    '<div class="stats">' + (C.STATS || []).map(function (st, i) { return '<div class="stat reveal" style="--d:' + (i * 0.12) + 's"><div class="n" data-n="' + esc(st[0]) + '">' + esc(st[0]) + '</div><div class="t">' + esc(st[1]) + '</div></div>'; }).join('') + '</div>' +
    '<div style="margin-top:110px;text-align:center" class="reveal"><div class="eyebrow">Events</div><h2 class="big">' + redLast(C.EVENTS_TITLE) + '</h2><p class="lead" style="margin:0 auto;font-size:14px">' + esc(C.EVENTS_INTRO) + '</p></div>' +
    '<div class="evgrid">' + (C.EVENTS || []).map(function (e, i) {
      return '<a class="evcard reveal" style="--d:' + (i * 0.12) + 's" href="' + (s ? esc(e.href) : 'login.html') + '"><div class="no">' + esc(e.no) + '</div><h3>' + esc(e.title) + '</h3><p>' + esc(e.text) + '</p><ul>' + (e.points || []).map(function (p) { return '<li>' + esc(p) + '</li>'; }).join('') + '</ul></a>';
    }).join('') + '</div></div></section>';

  /* ---------------- rules ---------------- */
  h += '<section class="section alt" id="rules"><div class="narrow" style="width:min(820px,92%)"><div class="reveal"><div class="eyebrow">FPS IGNITE XIII</div><h2 class="big">' + redLast(C.RULES_TITLE) + '</h2></div><div style="margin-top:26px">' +
    (C.RULES || []).map(function (r, i) {
      return '<details class="rule reveal" style="--d:' + (i * 0.06) + 's"' + (r.open ? ' open' : '') + '><summary>' + esc(r.title) + '</summary><ul>' + (r.items || []).map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') + '</ul></details>';
    }).join('') + '</div></div></section>';

  /* ---------------- gallery ---------------- */
  h += '<section class="section" id="gallery"><div class="container"><div class="reveal" style="text-align:center"><div class="eyebrow">Memories</div><h2 class="big">' + redLast(C.GALLERY_TITLE) + '</h2><p class="lead" style="margin:0 auto;font-size:14px">' + esc(C.GALLERY_INTRO) + '</p></div>' +
    '<div class="gallery">' + (C.GALLERY || []).map(function (g, i) {
      return '<div class="g reveal zoom" style="--d:' + ((i % 3) * 0.1) + 's"><img src="images/gallery/' + esc(g.file) + '" alt="' + esc(g.caption || 'Previous IGNITE') + '" loading="lazy" onerror="var d=this.parentNode;d.className=\'g ph\';d.innerHTML=\'Add images/gallery/' + esc(g.file) + '\'"></div>';
    }).join('') + '</div></div></section>';

  /* ---------------- executive council banner ---------------- */
  var B = C.COUNCIL_BANNER || {};
  h += '<section class="banner" id="council"><img class="bg" src="' + esc(B.photo) + '" alt="" onerror="this.style.display=\'none\'"><div class="shade"></div><div class="inner container reveal"><h2 class="big" style="font-size:clamp(34px,6vw,58px)">' + esc(B.title) + '</h2><p>' + esc(B.text) + '</p><a class="btn" href="council.html">' + esc(B.button) + ' &#8599;</a></div></section>';

  /* ---------------- highlights video ---------------- */
  var V = C.HIGHLIGHTS || {}, vid = '';
  if (V.youtube) vid = '<iframe src="https://www.youtube-nocookie.com/embed/' + encodeURIComponent(V.youtube) + '?rel=0" title="' + esc(V.title) + '" allow="accelerometer; autoplay; encrypted-media; picture-in-picture; fullscreen" allowfullscreen loading="lazy"></iframe>';
  else vid = '<video id="hlvid" controls playsinline preload="metadata" poster="' + esc(V.poster) + '"><source src="' + esc(V.file) + '" type="video/mp4"></video><div class="empty" id="hlempty" style="display:none">Add your video as <b>&nbsp;' + esc(V.file) + '&nbsp;</b> or paste a YouTube ID in js/content.js</div>';
  h += '<section class="section alt" id="highlights"><div class="container"><div class="reveal" style="text-align:center"><div class="eyebrow">Watch</div><h2 class="big">' + redLast(V.title) + '</h2><p class="lead" style="margin:0 auto;font-size:14px">' + esc(V.intro) + '</p></div><div class="vframe reveal zoom">' + vid + '</div></div></section>';

  /* ---------------- timeline (red) ---------------- */
  h += '<section class="section crimson" id="timeline"><div class="container"><div class="reveal" style="text-align:center"><div class="eyebrow">The journey</div><h2 class="big">' + esc(C.TIMELINE_TITLE) + '</h2></div><div class="timeline">' +
    (C.TIMELINE || []).map(function (t, i) {
      return '<div class="tl reveal ' + (i % 2 ? 'right' : 'left') + '"><div class="dot">' + (i + 1) + '</div><div class="when">' + esc(t.when) + '</div><h3>' + esc(t.title) + '</h3><p>' + esc(t.text) + '</p></div>';
    }).join('') + '</div></div></section>';

  root.innerHTML = h;

  /* behaviours */
  var vv = IG.$('hlvid');
  if (vv) { var src = vv.querySelector('source'); src.addEventListener('error', function () { vv.style.display = 'none'; IG.$('hlempty').style.display = 'flex'; }); }
  Array.prototype.forEach.call(root.querySelectorAll('.stat .n'), function (n) { var to = parseInt(n.getAttribute('data-n'), 10); if (!isNaN(to)) { n.textContent = '0'; IG.countUp(n, to, n.parentNode); } });
  var lb = IG.$('lightbox'), lbi = lb.querySelector('img');
  root.querySelector('.gallery').addEventListener('click', function (e) { var im = e.target.tagName === 'IMG' ? e.target : null; if (!im) return; lbi.src = im.src; lb.classList.add('on'); });
  lb.addEventListener('click', function () { lb.classList.remove('on'); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') lb.classList.remove('on'); });
  IG.reveal(root);
  if (location.hash) { var t = document.querySelector(location.hash); if (t) setTimeout(function () { t.scrollIntoView(); }, 60); }
})();
