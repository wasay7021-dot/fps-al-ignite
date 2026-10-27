/* FPS IGNITE XIII - a delegation's read-only profile (no settings, no passwords) */
(function () {
  'use strict';
  var S = IG.boot('profile', { roles: ['delegate'] });
  if (!S) return;
  var esc = IG.esc, fmt = IG.fmt, $ = IG.$;
  var ROLES = [['cw', 'Content Writer'], ['vg', 'Videographer'], ['tw', 'Techno-wiz'], ['sp', 'Spokesperson']];
  var KIND = { auction: 'Auction', room: 'Rooms', forex: 'X Change' };

  function drawMe(m) {
    var d = m.delegation; if (!d) return;
    IG.setText('pname', d.name);
    var h = '<div class="card"><div class="row-between"><div><div class="label gold">Campus</div><div class="big">' + esc(d.campus || '-') + '</div></div>' +
      '<div style="text-align:right"><div class="label gold">Auction &amp; Rooms</div><div class="bigger">' + fmt(d.auction_ic) + ' ICs</div></div>' +
      '<div style="text-align:right"><div class="label gold">X Change cash</div><div class="bigger">' + fmt(d.forex_cash) + ' ICs</div></div></div>';
    h += '<div class="list" style="margin-top:12px">' + ROLES.map(function (r) {
      var n = (d.members && d.members[r[0]]) || '';
      return '<div class="item"><span>' + r[1] + (d.head === r[0] ? ' <span class="pill won">Head Delegate</span>' : '') + '</span><b>' + (n ? esc(n) : '<span class="hint" style="margin:0">-</span>') + '</b></div>';
    }).join('') + '</div></div>';
    h += '<div class="card"><div class="label gold">Your industry</div>' + (m.won ? '<div class="big">' + esc(m.won.industry) + '</div><div class="help">Won with a bid of ' + fmt(m.won.amount) + ' ICs</div>' : '<div class="help" style="margin:0">You have not won an industry yet.</div>') +
      '<div class="label gold" style="margin-top:16px">Rooms booked</div>' + (m.bookings.length ? '<div class="list">' + m.bookings.map(function (b) { return '<div class="item"><b>' + esc(b.room) + '</b><span>' + fmt(b.amount) + ' ICs</span></div>'; }).join('') + '</div>' : '<div class="help" style="margin:0">No rooms booked.</div>') + '</div>';
    IG.setHtml('pcard', h);
  }
  function poll() { IG.call('me').then(function (m) { IG.setConn(true); drawMe(m); }, function (e) { IG.setConn(e.code !== 'NETWORK'); }); }
  poll(); setInterval(function () { if (!document.hidden) poll(); }, 4000);

  IG.live('my_activity', function () { return { p_limit: 80 }; }, function (rows) {
    IG.setHtml('pacts', rows.length ? rows.map(function (a) {
      var amt = a.amount != null ? (a.kind === 'forex' ? IG.pnl(a.amount) : fmt(a.amount) + ' ICs') : '';
      return '<div class="item"><span>' + esc(a.detail) + '<small>' + (KIND[a.kind] || '') + ' &middot; ' + IG.clock(a.at) + '</small></span><b>' + amt + '</b></div>';
    }).join('') : '<div class="item"><span>Nothing yet.</span></div>');
  });
})();
