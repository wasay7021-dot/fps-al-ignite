/* FPS IGNITE XIII - Executive Council page, built from js/content.js */
(function () {
  'use strict';
  IG.renderChrome('council');
  var C = window.SITE_CONTENT || {}, esc = IG.esc, EXT = ['jpg', 'jpeg', 'png', 'webp'];
  function slug(n) { return String(n).toLowerCase().replace(/[.'’]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, ''); }
  function initials(n) { var p = String(n).replace(/\./g, '').split(/\s+/).filter(Boolean); return (p[0] ? p[0][0] : '') + (p.length > 1 ? p[p.length - 1][0] : ''); }
  function pic(name) {
    var sl = slug(name);
    return '<div class="pic"><span>' + esc(initials(name).toUpperCase()) + '</span><img src="images/council/' + sl + '.jpg" data-s="' + sl + '" data-i="0" alt="' + esc(name) + '"></div>';
  }
  var h = '<section class="council-hero"><div class="container"><div class="eyebrow reveal">' + esc(C.COUNCIL_SUBTITLE) + '</div><h1 class="title reveal" style="--d:.1s;font-size:clamp(40px,8vw,72px)">' + esc((C.COUNCIL_TITLE || '').replace(/\s*Council$/, '')) + ' <span class="red">Council</span></h1><div class="reveal" style="--d:.2s"><a class="back" href="index.html#council">&larr; Back to home</a></div></div></section>';

  (C.COUNCIL_FEATURED || []).forEach(function (p, i) {
    h += '<section class="container"><div class="exec reveal ' + (i % 2 ? 'right' : 'left') + '"><div class="person">' + pic(p.name) + '</div><div><div class="nm">' + esc(p.name) + '</div><div class="rl">' + esc(p.role) + '</div></div></div></section>';
  });
  (C.COUNCIL_DEPARTMENTS || []).forEach(function (d) {
    h += '<section class="container dept"><h2 class="reveal">' + esc(d.name) + '</h2>' + (d.note ? '<div class="dnote reveal">(' + esc(d.note) + ')</div>' : '') + '<div class="people">' + d.people.map(function (p, i) {
      return '<div class="person reveal zoom" style="--d:' + (i * 0.12) + 's">' + pic(p.name) + '<b>' + esc(p.name) + '</b><small>' + esc(p.role) + '</small></div>';
    }).join('') + '</div></section>';
  });
  IG.$('council').innerHTML = h;

  /* try .jpg, then .jpeg, .png, .webp; if none exists the initials stay */
  IG.$('council').addEventListener('error', function (e) {
    var im = e.target; if (!im || im.tagName !== 'IMG') return;
    var i = parseInt(im.getAttribute('data-i'), 10) + 1;
    if (i < EXT.length) { im.setAttribute('data-i', i); im.src = 'images/council/' + im.getAttribute('data-s') + '.' + EXT[i]; }
    else im.style.display = 'none';
  }, true);
  IG.reveal(IG.$('council'));
})();
