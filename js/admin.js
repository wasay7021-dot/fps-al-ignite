/* =====================================================================
   FPS IGNITE XIII - Admin panel
   Tabs: Overview, Auction, Room booking, X Change, Accounts, Live activity.
   'admin' accounts can do everything. 'viewer' accounts see everything but
   every button that changes something is hidden (and the database refuses
   it anyway).
   ===================================================================== */
(function () {
  'use strict';
  var S = IG.boot('admin', { roles: ['admin', 'viewer'] });
  if (!S) return;
  var $ = IG.$, esc = IG.esc, fmt = IG.fmt, CUR = IG.CUR, CFG = IG.cfg;
  var EDIT = S.role === 'admin';
  var TABS = [['overview', 'Overview'], ['auction', 'Auction'], ['rooms', 'Room booking'], ['forex', 'X Change'], ['accounts', 'Accounts'], ['activity', 'Live activity']];
  var streams = [], curTab = null, built = {};
  var KIND = { auction: 'Auction', room: 'Rooms', forex: 'X Change', account: 'Account' };
  var STATUS_TXT = { closed: 'Closed', open: 'Open', paused: 'Paused', finished: 'Finished' };

  /* ---------------------------------------------------------- helpers */
  function put(el, html) {
    if (typeof el === 'string') el = $(el);
    if (!el) return;
    var a = document.activeElement;
    if (a && a !== document.body && el.contains(a) && /^(INPUT|SELECT|TEXTAREA)$/.test(a.tagName)) {
      el.__pend = html;   /* someone is typing in here: draw after they leave */
      if (!el.__fo) {
        el.__fo = true;
        el.addEventListener('focusout', function () {
          setTimeout(function () {
            var a2 = document.activeElement;
            if (el.__pend != null && !(a2 && el.contains(a2) && /^(INPUT|SELECT|TEXTAREA)$/.test(a2.tagName))) {
              var h = el.__pend; el.__pend = null; if (el.__h !== h) { el.__h = h; el.innerHTML = h; }
            }
          }, 350);
        });
      }
      return;
    }
    el.__pend = null;
    if (el.__h !== html) { el.__h = html; el.innerHTML = html; }
  }
  function refreshAll() { streams.forEach(function (s) { s.refresh(); }); }
  function run(fn, args, okMsg) {
    return IG.call(fn, args).then(function (r) { if (okMsg) IG.toast(okMsg, 'ok'); refreshAll(); return r; },
      function (e) { IG.toast(IG.errMsg(e), 'err'); throw e; });
  }
  function ask(msg) { return window.confirm(msg); }
  function num(v) { v = String(v == null ? '' : v).replace(/[^0-9]/g, ''); return v === '' ? null : parseInt(v, 10); }
  function pill(status, text) { return '<span class="pill ' + (status === 'open' ? 'open' : status === 'paused' ? 'paused' : status === 'won' ? 'won' : status === 'lost' ? 'lost' : status === 'pending' ? 'pending' : '') + '">' + esc(text || STATUS_TXT[status] || status) + '</span>'; }
  function tbl(heads, rows, cls) {
    return '<div class="tablewrap"><table class="' + (cls || '') + '"><thead><tr>' + heads.map(function (h) { return '<th' + (h[1] ? ' class="' + h[1] + '"' : '') + '>' + h[0] + '</th>'; }).join('') + '</tr></thead><tbody>' + rows + '</tbody></table></div>';
  }
  function feedRow(a) {
    var amt = '';
    if (a.amount != null) amt = a.kind === 'forex' ? IG.pnl(a.amount) : fmt(a.amount) + ' ICs';
    return '<div class="row"><span class="t">' + IG.clock(a.at) + '</span><span class="who">' + esc(a.delegation_name) + '</span><span class="det"><span class="k">' + (KIND[a.kind] || esc(a.kind)) + '</span>' + esc(a.detail) + '</span><span class="a">' + amt + '</span></div>';
  }
  function viewOnly() { return EDIT ? '' : '<div class="note warn">View-only account: you can see everything but cannot change anything.</div>'; }
  function hold(h) {
    var out = [];
    CUR.forEach(function (c) { if (h && h[c[0]] > 0) out.push(c[1] + ' &times;' + fmt(h[c[0]])); });
    return out.length ? out.join(' &middot; ') : '<span class="hint" style="margin:0">none</span>';
  }
  function fmtDate(ts) { var d = new Date(ts); return isNaN(d) ? '' : d.toLocaleString('en-GB', { hour12: false }); }

  /* digits-only boxes inside the panes (class "num") */
  document.addEventListener('input', function (e) {
    var t = e.target;
    if (t && t.classList && t.classList.contains('num')) { var v = t.value.replace(/[^0-9]/g, '').slice(0, 9); if (v !== t.value) t.value = v; }
  });

  /* ---------------------------------------------------------- modal */
  var mb = document.createElement('div');
  mb.className = 'modalback'; mb.innerHTML = '<div class="modalbox" role="dialog" aria-modal="true"></div>';
  document.body.appendChild(mb);
  var mbox = mb.firstChild, mOk = null;
  function closeModal() { mb.classList.remove('on'); mbox.innerHTML = ''; mOk = null; }
  mb.addEventListener('mousedown', function (e) { if (e.target === mb) closeModal(); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && mb.classList.contains('on')) closeModal(); });
  function modal(title, body, okLabel, onOk, danger) {
    mbox.innerHTML = '<h2>' + esc(title) + '</h2>' + body + '<div class="err" id="merr"></div><div class="btnrow"><button class="btn ghost" type="button" id="mcancel">Cancel</button><button class="btn' + (danger ? ' danger' : '') + '" type="button" id="mok">' + esc(okLabel) + '</button></div>';
    mOk = onOk; mb.classList.add('on');
    $('mcancel').onclick = closeModal;
    $('mok').onclick = function () {
      var btn = $('mok'); btn.disabled = true;
      new Promise(function (res) { res(onOk(mbox)); }).then(function (r) { if (r !== false) closeModal(); else btn.disabled = false; },
        function (e) { $('merr').textContent = IG.errMsg(e); btn.disabled = false; });
    };
    var f = mbox.querySelector('input,select,textarea'); if (f) setTimeout(function () { f.focus(); }, 30);
  }
  function mv(id) { var e = $(id); return e ? e.value : ''; }
  /* every amount box in the admin panel accepts digits only */
  document.addEventListener('input', function (e) { var t = e.target; if (t && t.classList && t.classList.contains('num') && /\D/.test(t.value)) t.value = t.value.replace(/\D/g, ''); });

  /* ---------------------------------------------------------- tabs */
  function buildTabs() {
    $('tabs').innerHTML = TABS.map(function (t) { return '<button type="button" data-tab="' + t[0] + '" role="tab">' + t[1] + '</button>'; }).join('');
    $('tabs').addEventListener('click', function (e) { var b = e.target.closest('[data-tab]'); if (b) location.hash = b.getAttribute('data-tab'); });
    if (!EDIT) $('adminmeta').insertAdjacentHTML('afterbegin', '<span class="viewbadge">View only</span>');
    window.addEventListener('hashchange', route);
  }
  function route() {
    var k = (location.hash || '').replace('#', '');
    if (!TABS.some(function (t) { return t[0] === k; })) k = 'overview';
    show(k);
  }
  function show(k) {
    if (k === curTab) return;
    curTab = k;
    streams.forEach(function (s) { s.stop(); }); streams = [];
    Array.prototype.forEach.call($('tabs').children, function (b) { b.classList.toggle('on', b.getAttribute('data-tab') === k); });
    TABS.forEach(function (t) { $('pane-' + t[0]).hidden = t[0] !== k; });
    if (!built[k]) { built[k] = true; if (INIT[k]) INIT[k](); }
    streams = START[k]();
  }
  document.addEventListener('click', function (e) {
    var g = e.target.closest ? e.target.closest('[data-go]') : null;
    if (g) location.hash = g.getAttribute('data-go');
  });

  var INIT = {}, START = {};

  /* ========================================================= OVERVIEW */
  START.overview = function () {
    return [IG.live('admin_overview', function () { return {}; }, function (d) {
      var fx = d.forex, fxTxt = STATUS_TXT[fx.status] + ' &middot; round ' + fx.round;
      var h = viewOnly() + '<div class="tiles">' +
        '<div class="tile go" data-go="accounts"><div class="label">Delegations</div><div class="v">' + d.delegations + '</div><div class="s">' + d.accounts + ' accounts &middot; ' + d.online + ' online now</div></div>' +
        '<div class="tile go" data-go="auction"><div class="label">Auction</div><div class="v">' + d.winners + ' <small style="font-size:13px;color:var(--muted)">winners</small></div><div class="s">' + d.bids + ' bids &middot; ' + d.auction.open + ' open &middot; ' + d.auction.paused + ' paused &middot; ' + d.auction.closed + ' closed</div></div>' +
        '<div class="tile go" data-go="rooms"><div class="label">Room booking</div><div class="v">' + d.bookings + ' <small style="font-size:13px;color:var(--muted)">bookings</small></div><div class="s">' + d.rooms.open + ' rooms open &middot; ' + d.rooms.closed + ' closed</div></div>' +
        '<div class="tile go" data-go="forex"><div class="label">X Change</div><div class="v" style="font-size:20px;margin-top:8px">' + fxTxt + '</div><div class="s">' + (fx.mode === 'auto' ? 'Automatic' : 'Manual') + ' &middot; ' + d.trades + ' trades</div></div>' +
        '</div>';
      h += '<div class="two" style="align-items:start"><div class="card"><h2>X Change leaders</h2><div class="help" style="margin-bottom:8px">Cash plus holdings at the current round&rsquo;s prices.</div>' +
        (d.top.length ? '<div class="list">' + d.top.map(function (x, i) { return '<div class="item"><span><span class="rank">' + (i + 1) + '</span><b>' + esc(x.name) + '</b></span><span><b>' + fmt(x.total) + ' ICs</b> &nbsp; ' + IG.pnl(x.pnl) + '</span></div>'; }).join('') + '</div>' : '<div class="note">No delegations yet.</div>') + '</div>' +
        '<div class="card"><div class="row-between"><h2>Latest activity</h2><a class="red" href="#activity" style="font-size:12px"><b>See all</b></a></div><div class="feed">' +
        (d.activity.length ? d.activity.map(feedRow).join('') : '<div class="note">Nothing yet.</div>') + '</div></div></div>';
      put('pane-overview', h);
    })];
  };

  /* ========================================================= AUCTION */
  var openAuc = {}, aucData = null, roomData = null;
  START.auction = function () {
    return [IG.live('admin_auction', function () { return {}; }, function (d) {
      aucData = d;
      var all = d.industries.map(function (i) { return i.id; });
      var h = viewOnly() + '<div class="card"><div class="row-between"><div><h2>Industry auction</h2><div class="help"><b>' + d.without_industry + '</b> of ' + d.total_delegations + ' delegations have not won an industry yet.</div></div>';
      if (EDIT) h += '<div class="btnrow" style="margin:0"><button class="btn small" data-act="auc" data-a="open" data-ids="' + all.join(',') + '">Open all</button><button class="btn small ghost" data-act="auc" data-a="pause" data-ids="' + all.join(',') + '">Pause all</button><button class="btn small danger" data-act="auc" data-a="close" data-ids="' + all.join(',') + '">Close &amp; settle all</button><button class="btn small ghost" data-act="indadd">+ Add industry</button></div>';
      h += '</div><div class="help">Open lets delegations bid. Pause freezes bidding. <b>Close &amp; settle</b> awards the top bids (highest first; ties go to whoever bid first), deducts the winning bids and ends bidding. A delegation can win one industry only.</div></div>';
      d.industries.forEach(function (i) {
        var rows = '', cut = false;
        i.bids.forEach(function (b) {
          rows += '<tr><td class="num">' + b.rank + '</td><td><b>' + esc(b.name) + '</b></td><td class="num">' + fmt(b.amount) + ' ICs</td><td>' + pill(b.status, b.status === 'pending' ? 'Pending' : b.status === 'won' ? 'Won' : 'Lost') + '</td></tr>';
          if (b.rank === i.places) rows += '<tr class="cut"><td colspan="4"><span>Top ' + i.places + ' win</span></td></tr>';
        });
        var won = i.bids.filter(function (b) { return b.status === 'won'; }).length;
        h += '<details class="acc" data-id="' + i.id + '"' + (openAuc[i.id] ? ' open' : '') + '><summary><span>' + esc(i.name) + '</span><span class="inl">' +
          pill(i.status, i.settled ? 'Settled' : STATUS_TXT[i.status]) + '<span class="pill">' + i.bids.length + ' bids</span><span class="pill">' + won + '/' + i.places + ' won</span>';
        if (EDIT) h += '<button class="btn small" data-act="auc" data-a="open" data-ids="' + i.id + '"' + (i.status === 'open' ? ' disabled' : '') + '>Open</button>' +
          '<button class="btn small ghost" data-act="auc" data-a="pause" data-ids="' + i.id + '"' + (i.status !== 'open' ? ' disabled' : '') + '>Pause</button>' +
          '<button class="btn small danger" data-act="auc" data-a="close" data-ids="' + i.id + '"' + (i.settled ? ' disabled' : '') + '>Close &amp; settle</button>';
        h += '</span></summary><div class="body">' + (EDIT ? '<div class="btnrow" style="margin:0 0 12px"><button class="btn small ghost" data-act="indedit" data-id="' + i.id + '">Rename / edit places</button><button class="btn small danger" data-act="inddel" data-id="' + i.id + '">Remove industry</button></div>' : '') + (i.bids.length ? tbl([['#', 'num'], ['Delegation'], ['Bid', 'num'], ['Result']], rows, 'tight') : '<div class="note">No bids yet.</div>') + '</div></details>';
      });
      if (EDIT) h += '<div class="danger-zone"><div class="help">After testing: wipe all bids and bookings and give every delegation 1,000 ICs again.</div><button class="btn small danger" data-act="aucreset">Reset auction &amp; room booking</button></div>';
      put('pane-auction', h);
    })];
  };
  $('pane-auction').addEventListener('toggle', function (e) { var d = e.target; if (d && d.tagName === 'DETAILS') openAuc[d.getAttribute('data-id')] = d.open; }, true);
  $('pane-auction').addEventListener('click', function (e) {
    var b = e.target.closest('[data-act]'); if (!b || !EDIT) return;
    e.preventDefault(); e.stopPropagation();
    var a = b.getAttribute('data-act');
    if (a === 'auc') {
      var ids = b.getAttribute('data-ids').split(',').map(Number), act = b.getAttribute('data-a');
      if (act === 'close' && !ask('Close and settle ' + (ids.length > 1 ? 'ALL industries' : 'this industry') + '?\n\nThe top bids win, their ICs are deducted, and bidding ends. This cannot be undone.')) return;
      run('admin_auction_set', { p_ids: ids, p_action: act }, act === 'open' ? 'Opened.' : act === 'pause' ? 'Paused.' : 'Closed and settled.');
    } else if (a === 'indadd') {
      modal('Add an industry', '<div class="field"><label>Industry name</label><input id="i-name" placeholder="e.g. Agriculture &amp; Food"></div><div class="field"><label>Places (how many delegations can win it)</label><input class="num" inputmode="numeric" id="i-places" value="10"></div>', 'Add industry', function () {
        if (!mv('i-name').trim()) throw new Error('Enter an industry name.');
        return run('admin_industry_add', { p_name: mv('i-name'), p_places: num(mv('i-places')) || 0 }, 'Industry added (closed - press Open when ready).');
      });
    } else if (a === 'indedit') {
      var ii = aucData && aucData.industries.filter(function (x) { return String(x.id) === b.getAttribute('data-id'); })[0]; if (!ii) return;
      modal('Edit industry', '<div class="field"><label>Industry name</label><input id="i-name" value="' + esc(ii.name) + '"></div><div class="field"><label>Places</label><input class="num" inputmode="numeric" id="i-places" value="' + ii.places + '"></div>', 'Save', function () {
        return run('admin_industry_update', { p_id: ii.id, p_name: mv('i-name'), p_places: num(mv('i-places')) || 0 }, 'Industry saved.');
      });
    } else if (a === 'inddel') {
      var id2 = aucData && aucData.industries.filter(function (x) { return String(x.id) === b.getAttribute('data-id'); })[0]; if (!id2) return;
      var won = id2.bids.filter(function (x) { return x.status === 'won'; }).length;
      modal('Remove industry', '<p style="font-size:13px;color:var(--soft)">Remove <b>' + esc(id2.name) + '</b> and its ' + id2.bids.length + ' bid(s)? ' + (won ? 'Its ' + won + ' winner(s) get their ICs refunded. ' : '') + 'This cannot be undone.</p>', 'Remove industry', function () {
        return run('admin_industry_delete', { p_id: id2.id }, 'Industry removed.');
      }, true);
    } else if (a === 'aucreset') {
      modal('Reset auction & room booking', '<p class="help" style="margin-top:0">This deletes every bid and room booking and gives every delegation 1,000 ICs again. Type <b>RESET</b> to confirm.</p><div class="field"><input id="mtxt" autocomplete="off"></div>', 'Reset', function () {
        if (mv('mtxt').trim() !== 'RESET') throw new Error('Type RESET to confirm.');
        return run('admin_reset_auction_rooms', {}, 'Auction and rooms reset.');
      }, true);
    }
  });

  /* ========================================================= ROOMS */
  START.rooms = function () {
    return [IG.live('admin_rooms', function () { return {}; }, function (d) {
      roomData = d;
      var all = d.rooms.map(function (r) { return r.id; });
      var h = viewOnly() + '<div class="card"><div class="row-between"><div><h2>Room booking</h2><div class="help">Delegations book with their remaining Auction ICs. A delegation with no ICs left cannot book. Each room has a limited number of places.</div></div>';
      if (EDIT) h += '<div class="btnrow" style="margin:0"><button class="btn small" data-act="room" data-a="open" data-ids="' + all.join(',') + '">Open all rooms</button><button class="btn small ghost" data-act="room" data-a="close" data-ids="' + all.join(',') + '">Close all rooms</button><button class="btn small ghost" data-act="roomadd">+ Add room</button></div>';
      h += '</div></div><div class="roomgrid">';
      d.rooms.forEach(function (r) {
        var rows = r.bookings.map(function (b) {
          return '<tr><td><b>' + esc(b.name) + '</b></td><td class="num">' + fmt(b.amount) + ' ICs</td><td class="nowrap">' + IG.clock(b.created_at) + '</td>' +
            (EDIT ? '<td class="r"><button class="btn small ghost" data-act="cancel" data-id="' + b.id + '" data-n="' + esc(b.name) + '" data-r="' + esc(r.name) + '">Cancel &amp; refund</button></td>' : '') + '</tr>';
        }).join('');
        h += '<div class="card"><div class="row-between"><div><div class="label gold">Room</div><h2>' + esc(r.name) + '</h2><div class="help">' + r.bookings.length + ' of ' + r.places + ' places booked &middot; minimum ' + fmt(r.price) + ' ICs</div></div>' + pill(r.status === 'open' ? 'open' : 'closed', r.status === 'open' ? 'Open' : 'Closed') + '</div>';
        if (EDIT) h += '<div class="btnrow"><button class="btn small" data-act="room" data-a="open" data-ids="' + r.id + '"' + (r.status === 'open' ? ' disabled' : '') + '>Open</button><button class="btn small ghost" data-act="room" data-a="close" data-ids="' + r.id + '"' + (r.status !== 'open' ? ' disabled' : '') + '>Close</button></div>' +
          '<div class="fldrow" style="margin-top:14px"><div class="field" style="grid-column:1/-1"><label>Room name</label><input id="rn' + r.id + '" value="' + esc(r.name) + '"></div><div class="field"><label>Minimum price (ICs)</label><input class="num" inputmode="numeric" id="rp' + r.id + '" value="' + r.price + '"></div><div class="field"><label>Places</label><input class="num" inputmode="numeric" id="rl' + r.id + '" value="' + r.places + '"></div><button class="btn small ghost" data-act="roomedit" data-id="' + r.id + '">Save</button><button class="btn small danger" data-act="roomdel" data-id="' + r.id + '">Remove room</button></div>';
        h += '<div style="margin-top:14px">' + (r.bookings.length ? tbl([['Delegation'], ['Amount', 'num'], ['Time']].concat(EDIT ? [['', 'r']] : []), rows, 'tight') : '<div class="note">No bookings yet.</div>') + '</div></div>';
      });
      h += '</div>';
      put('pane-rooms', h);
    })];
  };
  $('pane-rooms').addEventListener('click', function (e) {
    var b = e.target.closest('[data-act]'); if (!b || !EDIT) return;
    var a = b.getAttribute('data-act');
    if (a === 'room') run('admin_room_set', { p_ids: b.getAttribute('data-ids').split(',').map(Number), p_action: b.getAttribute('data-a') }, 'Done.');
    else if (a === 'roomedit') {
      var id = parseInt(b.getAttribute('data-id'), 10), p = num(mv('rp' + id)), l = num(mv('rl' + id));
      if (!p || !l) { IG.toast('Enter a price and number of places (at least 1).', 'err'); return; }
      if (!mv('rn' + id).trim()) { IG.toast('The room needs a name.', 'err'); return; }
      run('admin_room_update', { p_room: id, p_price: p, p_places: l, p_name: mv('rn' + id) }, 'Room saved.');
    } else if (a === 'roomadd') {
      modal('Add a room', '<div class="field"><label>Room name</label><input id="r-name" placeholder="e.g. Studio"></div><div class="two"><div class="field"><label>Minimum price (ICs)</label><input class="num" inputmode="numeric" id="r-price" value="100"></div><div class="field"><label>Places</label><input class="num" inputmode="numeric" id="r-places" value="15"></div></div>', 'Add room', function () {
        if (!mv('r-name').trim()) throw new Error('Enter a room name.');
        return run('admin_room_add', { p_name: mv('r-name'), p_price: num(mv('r-price')) || 0, p_places: num(mv('r-places')) || 0 }, 'Room added (closed - press Open when ready).');
      });
    } else if (a === 'roomdel') {
      var rr = roomData && roomData.rooms.filter(function (x) { return String(x.id) === b.getAttribute('data-id'); })[0]; if (!rr) return;
      modal('Remove room', '<p style="font-size:13px;color:var(--soft)">Remove <b>' + esc(rr.name) + '</b>? ' + (rr.bookings.length ? 'Its ' + rr.bookings.length + ' booking(s) are cancelled and the ICs refunded. ' : '') + 'This cannot be undone.</p>', 'Remove room', function () {
        return run('admin_room_delete', { p_room: rr.id }, 'Room removed.');
      }, true);
    } else if (a === 'cancel') {
      if (ask('Cancel ' + b.getAttribute('data-n') + '’s booking of ' + b.getAttribute('data-r') + ' and refund their ICs?')) run('admin_booking_cancel', { p_booking: b.getAttribute('data-id') }, 'Booking cancelled and refunded.');
    }
  });

  /* ========================================================= X CHANGE */
  var fxData = null, fxRound = null, fxDirty = false, fxMedia = null;   /* fxMedia: null keep, '' remove, {kind,path} new */
  var MIME = { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp', gif: 'image/gif', mp4: 'video/mp4', webm: 'video/webm' };

  INIT.forex = function () {
    var p = $('pane-forex');
    p.innerHTML = '<div id="fx-ctl"></div>' +
      (EDIT ? '<div class="card" id="fx-setup"><h2>Round setup</h2><div class="help" style="margin-bottom:14px">Set each round’s crisis (picture or video), title and the six exchange rates. Delegations only ever receive the <b>current</b> round, so nothing can be read ahead.</div>' +
        '<div class="fldrow"><div class="field"><label>Round</label><select id="fx-sel">' + [1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(function (n) { return '<option value="' + n + '">Round ' + n + '</option>'; }).join('') + '</select></div>' +
        '<div class="field" style="grid-column:span 2"><label>Crisis title (shown above the picture / video)</label><input id="fx-title" maxlength="140" placeholder="e.g. Oil supply shock"></div></div>' +
        '<div style="margin-top:14px"><label>Crisis picture or video</label><div class="mediaprev" id="fx-prev"></div>' +
        '<div class="inl"><input type="file" id="fx-file" accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm" style="max-width:340px"><button class="btn small ghost" type="button" id="fx-rm">Remove media</button></div>' +
        '<div class="bar" id="fx-bar" hidden><i></i></div><div class="help" id="fx-upmsg">JPG, PNG, WEBP, GIF, MP4 or WEBM up to 50 MB. Videos play without controls, so delegations cannot skip or fast-forward.</div></div>' +
        '<div class="label gold" style="margin-top:18px">Exchange rates this round (ICs per unit)</div><div class="fldrow">' +
        CUR.map(function (c) { return '<div class="field"><label>' + c[1] + '</label><input class="num" inputmode="numeric" id="fx-r-' + c[0] + '"></div>'; }).join('') +
        '<div class="field"><label>Length (seconds, automatic mode)</label><input class="num" inputmode="numeric" id="fx-dur"></div></div>' +
        '<div class="btnrow"><button class="btn" id="fx-save" type="button">Save round</button><span class="help" id="fx-savemsg" style="align-self:center;margin:0"></span></div></div>' : '') +
      '<div class="card"><h2>Rounds at a glance</h2><div id="fx-rounds"></div></div>' +
      '<div class="card"><h2>Standings</h2><div class="help" style="margin-bottom:10px">Everyone starts with the same cash. Total = cash + holdings at the current round’s prices. Profit / loss is against the starting cash.</div><div id="fx-stand"></div></div>' +
      '<div class="card"><h2>Every trade</h2><div class="help" style="margin-bottom:10px">Latest 150 trades from all delegations. Profit / loss is shown on sales.</div><div id="fx-trades"></div></div>';

    if (EDIT) {
      $('fx-sel').addEventListener('change', function () { if (fxDirty && !ask('Discard your unsaved changes for this round?')) { $('fx-sel').value = fxRound; return; } fxRound = parseInt($('fx-sel').value, 10); fillForm(true); });
      ['fx-title', 'fx-dur'].concat(CUR.map(function (c) { return 'fx-r-' + c[0]; })).forEach(function (id) { $(id).addEventListener('input', function () { fxDirty = true; }); });
      $('fx-file').addEventListener('change', onFile);
      $('fx-rm').addEventListener('click', function () { fxMedia = ''; fxDirty = true; $('fx-file').value = ''; previewMedia(); });
      $('fx-save').addEventListener('click', saveRound);
    }
  };

  function roundRec(n) { return fxData && fxData.rounds ? fxData.rounds.filter(function (r) { return r.round === n; })[0] : null; }
  function previewMedia() {
    var r = roundRec(fxRound), el = $('fx-prev'), m = fxMedia === null ? (r && r.media_path ? { kind: r.media_kind, path: r.media_path } : null) : (fxMedia === '' ? null : fxMedia), h;
    if (!m) h = '<div class="help" style="margin:0">No picture or video yet for this round.' + (fxMedia === '' ? ' (will be removed when you save)' : '') + '</div>';
    else if (m.kind === 'video') h = '<video src="' + esc(IG.mediaUrl(m.path)) + '" controls muted preload="metadata"></video>';
    else h = '<img src="' + esc(IG.mediaUrl(m.path)) + '" alt="">';
    if (el.__h !== h) { el.__h = h; el.innerHTML = h; }
  }
  function fillForm(force) {
    if (!EDIT || !fxData) return;
    var r = roundRec(fxRound); if (!r) return;
    if (force || !fxDirty) {
      $('fx-sel').value = fxRound; $('fx-title').value = r.title || ''; $('fx-dur').value = r.duration_seconds;
      CUR.forEach(function (c) { $('fx-r-' + c[0]).value = r.rates[c[0]]; });
      if (force) { fxDirty = false; fxMedia = null; $('fx-file').value = ''; $('fx-savemsg').textContent = ''; }
    }
    previewMedia();
  }
  function onFile() {
    var f = $('fx-file').files[0]; if (!f) return;
    var ext = (f.name.split('.').pop() || '').toLowerCase(), msg = $('fx-upmsg'), bar = $('fx-bar');
    if (!MIME[ext]) { msg.textContent = 'Use a JPG, PNG, WEBP, GIF, MP4 or WEBM file.'; $('fx-file').value = ''; return; }
    if (f.size > 50 * 1024 * 1024) { msg.textContent = 'That file is ' + (f.size / 1048576).toFixed(1) + ' MB. The limit is 50 MB. Compress the video first.'; $('fx-file').value = ''; return; }
    msg.textContent = 'Uploading ' + f.name + '...'; bar.hidden = false; bar.firstChild.style.width = '0%'; $('fx-save').disabled = true;
    IG.call('admin_upload_ticket', { p_round: fxRound, p_ext: ext }).then(function (t) {
      return new Promise(function (res, rej) {
        var x = new XMLHttpRequest();
        x.open('POST', CFG.SUPABASE_URL.replace(/\/+$/, '') + '/storage/v1/object/crisis/' + encodeURIComponent(t.path));
        x.setRequestHeader('apikey', CFG.SUPABASE_ANON_KEY); x.setRequestHeader('Authorization', 'Bearer ' + CFG.SUPABASE_ANON_KEY);
        x.setRequestHeader('Content-Type', MIME[ext]); x.setRequestHeader('x-upsert', 'false'); x.setRequestHeader('cache-control', 'max-age=3600');
        x.upload.onprogress = function (ev) { if (ev.lengthComputable) bar.firstChild.style.width = Math.round(ev.loaded / ev.total * 100) + '%'; };
        x.onload = function () { if (x.status >= 200 && x.status < 300) res(t); else { var m = ''; try { m = JSON.parse(x.responseText).message; } catch (e) {} rej(new Error(m || 'Upload failed (' + x.status + ').')); } };
        x.onerror = function () { rej(new Error('Upload failed. Check your internet connection.')); };
        x.send(f);
      });
    }).then(function (t) {
      fxMedia = { kind: t.kind, path: t.path }; fxDirty = true; msg.textContent = 'Uploaded. Press Save round to use it.'; previewMedia();
    }, function (e) { msg.textContent = IG.errMsg(e); $('fx-file').value = ''; }).then(function () { bar.hidden = true; $('fx-save').disabled = false; });
  }
  function saveRound() {
    var rates = {}, bad = false;
    CUR.forEach(function (c) { var v = num(mv('fx-r-' + c[0])); if (!v || v < 1) bad = true; rates[c[0]] = v; });
    if (bad) { IG.toast('Every rate must be a whole number of at least 1.', 'err'); return; }
    var dur = num(mv('fx-dur')) || 240, path = fxMedia === null ? null : (fxMedia === '' ? '' : fxMedia.path), kind = fxMedia && fxMedia.kind ? fxMedia.kind : null;
    $('fx-save').disabled = true;
    IG.call('admin_forex_round_save', { p_round: fxRound, p_title: mv('fx-title').trim(), p_kind: kind, p_path: path, p_rates: rates, p_duration: dur }).then(function () {
      fxDirty = false; fxMedia = null; $('fx-file').value = ''; $('fx-savemsg').textContent = 'Saved round ' + fxRound + '.'; IG.toast('Round ' + fxRound + ' saved.', 'ok'); refreshAll();
    }, function (e) { IG.toast(IG.errMsg(e), 'err'); }).then(function () { $('fx-save').disabled = false; });
  }

  function ctlHtml(d) {
    var c = d.control, n = d.cur, auto = c.mode === 'auto', st = n.status;
    var h = viewOnly() + '<div class="card"><div class="row-between"><div><h2>Foreign X Change</h2><div class="statusline"><div class="bigger">Round ' + n.round + ' <small>of 10</small></div>' + pill(st, STATUS_TXT[st]) + '<span class="pill">' + (auto ? 'Automatic rounds' : 'Manual rounds') + '</span>' +
      (n.ends_ms ? '<span class="timer" data-end="' + n.ends_ms + '"></span>' : '') + '</div></div></div>';
    if (EDIT) {
      h += '<div class="btnrow"><span class="help" style="align-self:center;margin:0 6px 0 0">Mode</span><button class="btn small' + (auto ? ' ghost' : '') + '" data-act="fx" data-a="mode_manual"' + (st === 'open' ? ' disabled' : '') + '>Manual</button><button class="btn small' + (auto ? '' : ' ghost') + '" data-act="fx" data-a="mode_auto"' + (st === 'open' ? ' disabled' : '') + '>Automatic</button></div>';
      h += '<div class="btnrow">';
      if (!auto) {
        h += (st === 'open' ? '<button class="btn small ghost" data-act="fx" data-a="pause">Pause trading</button>' : '<button class="btn small" data-act="fx" data-a="open"' + (st === 'finished' ? ' disabled' : '') + '>Open trading</button>');
        if (n.round < 10) h += '<button class="btn small ghost" data-act="fx" data-a="next" data-arg="0"' + (st === 'finished' ? ' disabled' : '') + '>End round &amp; next (paused)</button><button class="btn small ghost" data-act="fx" data-a="next" data-arg="1"' + (st === 'finished' ? ' disabled' : '') + '>End round &amp; next (open)</button>';
        else h += '<button class="btn small danger" data-act="fx" data-a="next"' + (st === 'finished' ? ' disabled' : '') + '>End final round &amp; finish</button>';
        h += '<span class="inl" style="margin-left:8px"><select id="fx-goto" style="width:auto">' + [1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(function (k) { return '<option value="' + k + '"' + (k === n.round ? ' selected' : '') + '>Round ' + k + '</option>'; }).join('') + '</select><button class="btn small ghost" data-act="fxgoto">Jump (paused)</button></span>';
      } else {
        h += (st === 'open' ? '<button class="btn small ghost" data-act="fx" data-a="pause">Pause</button>' : '<button class="btn small" data-act="fx" data-a="auto_start"' + (st === 'finished' ? ' disabled' : '') + '>' + (st === 'closed' ? 'Start automatic rounds' : 'Resume') + '</button>');
        h += '<span class="help" style="align-self:center;margin:0">Rounds change by themselves using each round’s length (see Round setup).</span>';
      }
      h += '<button class="btn small danger" data-act="fx" data-a="finish"' + (st === 'finished' ? ' disabled' : '') + '>Finish now</button></div>';
      h += '<div class="danger-zone"><div class="help">Testing only: clear every trade and give every delegation the starting ' + fmt(c.start_cash) + ' ICs again.</div><button class="btn small danger" data-act="fxreset">Reset exchange</button></div>';
    }
    return h + '</div>';
  }

  START.forex = function () {
    var a = IG.live('admin_forex', function () { return {}; }, function (d) {
      fxData = d;
      if (fxRound == null) fxRound = d.cur.round;
      put('fx-ctl', ctlHtml(d));
      fillForm(false);
      var maxTotal = null;
      put('fx-rounds', tbl([['Round', 'num'], ['Title'], ['Media'], ['Dollar', 'num'], ['Euro', 'num'], ['Yuan', 'num'], ['Yen', 'num'], ['Ruble', 'num'], ['Riyal', 'num'], ['Length', 'num']].concat(EDIT ? [['', 'r']] : []),
        d.rounds.map(function (r) {
          var live = r.round === d.cur.round;
          return '<tr><td class="num"><b>' + r.round + '</b>' + (live ? ' <span class="pill open">Now</span>' : '') + '</td><td>' + (r.title ? esc(r.title) : '<span class="hint" style="margin:0">no title</span>') + '</td><td>' + (r.media_path ? (r.media_kind === 'video' ? 'Video' : 'Image') : '<span class="hint" style="margin:0">none</span>') + '</td>' +
            CUR.map(function (c) { return '<td class="num">' + r.rates[c[0]] + '</td>'; }).join('') + '<td class="num">' + r.duration_seconds + 's</td>' +
            (EDIT ? '<td class="r"><button class="btn small ghost" data-act="fxedit" data-r="' + r.round + '">Edit</button></td>' : '') + '</tr>';
        }).join(''), 'tight'));
      put('fx-stand', d.standings.length ? tbl([['#', 'num'], ['Delegation'], ['Cash', 'num'], ['Holdings'], ['Total', 'num'], ['Profit / loss', 'num']],
        d.standings.map(function (s, i) {
          return '<tr><td class="num">' + (i + 1) + '</td><td><b>' + esc(s.name) + '</b>' + (s.campus ? '<div class="hint" style="margin:0">' + esc(s.campus) + '</div>' : '') + '</td><td class="num">' + fmt(s.cash) + '</td><td>' + hold(s.holdings) + '</td><td class="num"><b>' + fmt(s.total) + '</b></td><td class="num"><b>' + IG.pnl(s.pnl) + '</b></td></tr>';
        }).join(''), 'tight') : '<div class="note">No delegations yet.</div>');
    });
    var b = IG.live('admin_forex_trades', function () { return { p_limit: 150 }; }, function (rows) {
      put('fx-trades', rows.length ? tbl([['Time'], ['Delegation'], ['Round', 'num'], ['Action'], ['Currency'], ['Units', 'num'], ['Price', 'num'], ['Value', 'num'], ['Profit / loss', 'num']],
        rows.map(function (t) {
          return '<tr><td class="nowrap">' + IG.clock(t.at) + '</td><td><b>' + esc(t.name) + '</b></td><td class="num">' + t.round + '</td><td>' + (t.side === 'buy' ? 'Bought' : 'Sold') + '</td><td>' + IG.curName(t.cur) + '</td><td class="num">' + fmt(t.qty) + '</td><td class="num">' + fmt(t.price) + '</td><td class="num">' + fmt(t.qty * t.price) + '</td><td class="num">' + (t.side === 'sell' ? '<b>' + IG.pnl(t.pnl) + '</b>' : '') + '</td></tr>';
        }).join(''), 'tight') : '<div class="note">No trades yet.</div>');
    });
    return [a, b];
  };
  $('pane-forex').addEventListener('click', function (e) {
    var b = e.target.closest('[data-act]'); if (!b || !EDIT) return;
    var a = b.getAttribute('data-act');
    if (a === 'fx') {
      var act = b.getAttribute('data-a'), arg = b.getAttribute('data-arg');
      if (act === 'finish' && !ask('Finish the exchange now? Final standings will be shown to everyone.')) return;
      if (act === 'next' && fxData && fxData.cur.round >= 10 && !ask('End the final round and finish the exchange?')) return;
      var args = { p_action: act }; if (arg !== null) args.p_arg = parseInt(arg, 10);
      run('admin_forex_ctl', args, 'Done.');
    } else if (a === 'fxgoto') {
      run('admin_forex_ctl', { p_action: 'goto', p_arg: parseInt(mv('fx-goto'), 10) }, 'Jumped.');
    } else if (a === 'fxedit') {
      if (fxDirty && !ask('Discard your unsaved changes for the round you were editing?')) return;
      fxRound = parseInt(b.getAttribute('data-r'), 10); fillForm(true);
      var s = $('fx-setup'); if (s && s.scrollIntoView) s.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } else if (a === 'fxreset') {
      modal('Reset the exchange', '<p class="help" style="margin-top:0">This erases every trade and holding and sets every delegation back to the starting cash. Type <b>RESET</b> to confirm.</p><div class="field"><input id="mtxt" autocomplete="off"></div>', 'Reset', function () {
        if (mv('mtxt').trim() !== 'RESET') throw new Error('Type RESET to confirm.');
        return run('admin_forex_ctl', { p_action: 'reset' }, 'Exchange reset.');
      }, true);
    }
  });
  /* round countdown in the control card */
  setInterval(function () {
    var els = document.querySelectorAll('[data-end]');
    for (var i = 0; i < els.length; i++) {
      var s = Math.max(0, (parseInt(els[i].getAttribute('data-end'), 10) - IG.serverNow()) / 1000);
      els[i].textContent = 'Round ends in ' + IG.mmss(Math.ceil(s));
    }
  }, 500);

  /* ========================================================= ACCOUNTS */
  var accQ = '', accData = null;
  INIT.accounts = function () {
    var p = $('pane-accounts');
    p.innerHTML = viewOnly() +
      (EDIT ? '<div class="two" style="align-items:start"><form class="card" id="acc-new" autocomplete="off" style="margin:0"><h2>Create an account</h2><div class="help" style="margin-bottom:12px">The login works straight away. A delegate account is linked to a delegation (team); if the team name is new it is created with 1,000 Auction ICs and 2,500 X Change ICs.</div>' +
        '<div class="field"><label>Account type</label><select id="n-role"><option value="delegate">Delegate (competes in the events)</option><option value="admin">Admin (full control)</option><option value="viewer">Viewer (sees everything, cannot change)</option></select></div>' +
        '<div class="field"><label>Email or username</label><input id="n-email" required autocapitalize="off" spellcheck="false" placeholder="e.g. team23@ignite.com"></div>' +
        '<div class="field"><label>Password</label><input id="n-pw" required spellcheck="false" placeholder="At least 4 characters"></div>' +
        '<div id="n-teamrow"><div class="field"><label>Delegation (team) name</label><input id="n-team" placeholder="e.g. Delegation 23"></div><div class="field"><label>Campus</label><input id="n-campus" placeholder="e.g. FPS or HSS"></div>' +
        '<div class="help" style="margin:6px 0 8px">Team members (optional - you can fill these in later with Edit):</div><div class="two"><div class="field"><label>Content Writer</label><input id="n-cw"></div><div class="field"><label>Videographer</label><input id="n-vg"></div><div class="field"><label>Techno-wiz</label><input id="n-tw"></div><div class="field"><label>Spokesperson</label><input id="n-sp"></div></div></div>' +
        '<button class="btn" type="submit" id="n-go">Create account</button><div id="n-made"></div></form>' +
        '<div class="card" style="margin:0"><h2>Create many at once</h2><div class="help" style="margin-bottom:12px">One account per line: <b>email, password, delegation name, campus</b>, then optionally the four member names in order <b>Content Writer, Videographer, Techno-wiz, Spokesperson</b>. Example:<br><code class="pw">team1@ignite.com, pass1234, Delegation 1, FPS, Ali, Sara, Omar, Hina</code></div>' +
        '<div class="field"><label>Account type</label><select id="b-role"><option value="delegate">Delegate</option><option value="viewer">Viewer</option><option value="admin">Admin</option></select></div>' +
        '<div class="field"><textarea id="b-text" rows="7" spellcheck="false" placeholder="team1@ignite.com, pass1234, Delegation 1, FPS&#10;team2@ignite.com, pass5678, Delegation 2, HSS"></textarea></div>' +
        '<button class="btn" type="button" id="b-go">Create all</button><div id="b-made"></div></div></div>' : '') +
      '<div class="card" style="margin-top:18px"><div class="row-between"><h2>Accounts</h2><input class="q" id="acc-q" type="search" placeholder="Search by email, delegation or campus" style="max-width:320px"></div><div id="acc-list"></div></div>' +
      '<div class="card"><h2>Delegations</h2><div class="help" style="margin-bottom:10px">Balances and team members. <b>Auction ICs</b> are used in the Auction and Room Booking; <b>X Change cash</b> is the separate trading wallet.</div><div id="dl-list"></div></div>';
    $('acc-q').addEventListener('input', function () { accQ = $('acc-q').value.trim().toLowerCase(); if (accData) drawAccounts(accData); });
    if (EDIT) {
      var tr = function () { $('n-teamrow').style.display = mv('n-role') === 'delegate' ? '' : 'none'; };
      $('n-role').addEventListener('change', tr); tr();
      $('acc-new').addEventListener('submit', function (e) {
        e.preventDefault();
        var role = mv('n-role'), email = mv('n-email').trim(), pw = mv('n-pw');
        if (role === 'delegate' && !mv('n-team').trim()) { IG.toast('Enter the delegation (team) name.', 'err'); return; }
        $('n-go').disabled = true;
        IG.call('admin_account_create', { p_email: email, p_password: pw, p_role: role, p_team: role === 'delegate' ? mv('n-team').trim() : null, p_campus: mv('n-campus').trim(), p_members: { cw: mv('n-cw').trim(), vg: mv('n-vg').trim(), tw: mv('n-tw').trim(), sp: mv('n-sp').trim() } }).then(function () {
          $('n-made').innerHTML = '<div class="crednote">Account created. They can sign in now with<br>Email: <code class="pw">' + esc(email.toLowerCase()) + '</code> &nbsp; Password: <code class="pw">' + esc(pw) + '</code></div>';
          $('n-email').value = ''; $('n-pw').value = ''; $('n-team').value = ''; ['n-cw', 'n-vg', 'n-tw', 'n-sp'].forEach(function (k) { $(k).value = ''; }); IG.toast('Account created.', 'ok'); refreshAll();
        }, function (e2) { $('n-made').innerHTML = '<div class="msg">' + esc(IG.errMsg(e2)) + '</div>'; IG.toast(IG.errMsg(e2), 'err'); }).then(function () { $('n-go').disabled = false; });
      });
      $('b-go').addEventListener('click', function () {
        var role = mv('b-role'), lines = mv('b-text').split(/\r?\n/).map(function (l) { return l.trim(); }).filter(Boolean), rows = [];
        lines.forEach(function (l) { var p = l.split(/\t|,|;/).map(function (x) { return x.trim(); }); rows.push({ email: p[0], password: p[1], role: role, team: p[2] || '', campus: p[3] || '', members: { cw: p[4] || '', vg: p[5] || '', tw: p[6] || '', sp: p[7] || '' } }); });
        if (!rows.length) { IG.toast('Paste at least one line.', 'err'); return; }
        $('b-go').disabled = true;
        IG.call('admin_bulk_create', { p_rows: rows }).then(function (r) {
          var h = '<div class="crednote">Created ' + r.created + ' of ' + rows.length + ' accounts.</div>';
          if (r.errors && r.errors.length) h += '<ul class="errlist">' + r.errors.map(function (x) { return '<li>Line ' + x.line + (x.email ? ' (' + esc(x.email) + ')' : '') + ': ' + esc(x.error) + '</li>'; }).join('') + '</ul>';
          $('b-made').innerHTML = h; if (!(r.errors && r.errors.length)) $('b-text').value = '';
          IG.toast('Created ' + r.created + ' accounts.', 'ok'); refreshAll();
        }, function (e2) { IG.toast(IG.errMsg(e2), 'err'); }).then(function () { $('b-go').disabled = false; });
      });
    }
  };
  START.accounts = function () {
    return [IG.live('admin_accounts', function () { return {}; }, function (d) { accData = d; drawAccounts(d); })];
  };
  function drawAccounts(d) {
    var q = accQ, ROLE = { admin: 'Admin', viewer: 'Viewer', delegate: 'Delegate' };
    var list = d.accounts.filter(function (a) { return !q || (a.email + ' ' + a.delegation + ' ' + a.campus + ' ' + a.role).toLowerCase().indexOf(q) >= 0; });
    var heads = [['Email / username'], [d.can_see_passwords ? 'Password' : ''], ['Type'], ['Delegation'], ['Status']].concat(EDIT ? [['', 'r']] : []);
    put('acc-list', (list.length ? tbl(heads, list.map(function (a) {
      var st = a.online ? '<span class="pill on">Online</span>' : a.logged_in ? '<span class="pill pending">Signed in</span>' : '<span class="pill off">Offline</span>';
      return '<tr><td class="wrapall"><b>' + esc(a.email) + '</b></td><td>' + (a.password != null ? '<code class="pw">' + esc(a.password) + '</code>' : '') + '</td><td>' + ROLE[a.role] + '</td><td>' + (a.delegation ? esc(a.delegation) + (a.campus ? '<div class="hint" style="margin:0">' + esc(a.campus) + '</div>' : '') : '') + '</td><td>' + st + '</td>' +
        (EDIT ? '<td class="r nowrap"><button class="btn small ghost" data-act="aedit" data-id="' + a.id + '">Edit</button> <button class="btn small ghost" data-act="alogout" data-id="' + a.id + '"' + (a.logged_in ? '' : ' disabled') + '>Log out</button> <button class="btn small danger" data-act="adel" data-id="' + a.id + '">Delete</button></td>' : '') + '</tr>';
    }).join(''), 'tight') : '<div class="note">' + (d.accounts.length ? 'No accounts match your search.' : 'No accounts yet.') + '</div>') +
      '<div class="help">' + list.length + ' of ' + d.accounts.length + ' accounts shown. ' + (d.can_see_passwords ? '' : 'Viewers cannot see passwords.') + '</div>');
    put('dl-list', d.delegations.length ? tbl([['Delegation'], ['Campus'], ['Auction ICs', 'num'], ['X Change cash', 'num'], ['Accounts', 'num']].concat(EDIT ? [['', 'r']] : []), d.delegations.map(function (x) {
      var mm = x.members || {}, names = [['cw', 'CW'], ['vg', 'VG'], ['tw', 'TW'], ['sp', 'SP']].filter(function (r) { return mm[r[0]]; }).map(function (r) { return r[1] + ': ' + esc(mm[r[0]]) + (x.head === r[0] ? ' ★' : ''); }).join(' · ');
      return '<tr><td><b>' + esc(x.name) + '</b>' + (names ? '<div class="hint" style="margin:2px 0 0">' + names + '</div>' : '') + '</td><td>' + esc(x.campus) + '</td><td class="num">' + fmt(x.auction_ic) + '</td><td class="num">' + fmt(x.forex_cash) + '</td><td class="num">' + x.account_count + '</td>' +
        (EDIT ? '<td class="r nowrap"><button class="btn small ghost" data-act="dedit" data-id="' + x.id + '">Edit</button> <button class="btn small danger" data-act="ddel" data-id="' + x.id + '">Delete</button></td>' : '') + '</tr>';
    }).join(''), 'tight') : '<div class="note">No delegations yet.</div>');
  }
  function accById(id) { return accData && accData.accounts.filter(function (a) { return a.id === id; })[0]; }
  function delById(id) { return accData && accData.delegations.filter(function (a) { return a.id === id; })[0]; }
  $('pane-accounts').addEventListener('click', function (e) {
    var b = e.target.closest('[data-act]'); if (!b || !EDIT) return;
    var a = b.getAttribute('data-act'), id = b.getAttribute('data-id');
    if (a === 'aedit') {
      var ac = accById(id); if (!ac) return;
      modal('Edit login details', '<p class="help" style="margin-top:0">Saving signs the account out of its device so the new details are used next time.</p><div class="field"><label>Email or username</label><input id="e-email" value="' + esc(ac.email) + '" autocapitalize="off" spellcheck="false"></div><div class="field"><label>Password</label><input id="e-pw" value="' + esc(ac.password || '') + '" spellcheck="false"></div>', 'Save', function () {
        return run('admin_account_update', { p_account: id, p_email: mv('e-email'), p_password: mv('e-pw') }, 'Login details saved.');
      });
    } else if (a === 'alogout') {
      var a2 = accById(id);
      if (ask('Sign ' + (a2 ? a2.email : 'this account') + ' out of the device it is using?')) run('admin_force_logout', { p_account: id }, 'Signed out.');
    } else if (a === 'adel') {
      var a3 = accById(id); if (!a3) return;
      modal('Delete account', '<p style="font-size:13px;color:var(--soft)">Delete <b>' + esc(a3.email) + '</b>? They will not be able to sign in again.</p>' +
        (a3.delegation_id ? '<label class="chkrow"><input type="checkbox" id="d-del"> <span>Also delete the delegation <b>' + esc(a3.delegation) + '</b> with all its bids, bookings and trades</span></label>' : ''), 'Delete account', function () {
        return run('admin_account_delete', { p_account: id, p_remove_delegation: !!($('d-del') && $('d-del').checked) }, 'Account deleted.');
      }, true);
    } else if (a === 'dedit') {
      var d = delById(id); if (!d) return;
      var m = d.members || {};
      modal('Edit delegation', '<div class="two"><div class="field"><label>Delegation name</label><input id="g-name" value="' + esc(d.name) + '"></div><div class="field"><label>Campus</label><input id="g-campus" value="' + esc(d.campus) + '"></div>' +
        '<div class="field"><label>Auction ICs</label><input class="num" inputmode="numeric" id="g-ic" value="' + d.auction_ic + '"></div><div class="field"><label>X Change cash</label><input class="num" inputmode="numeric" id="g-cash" value="' + d.forex_cash + '"></div>' +
        '<div class="field"><label>Content Writer</label><input id="g-cw" value="' + esc(m.cw || '') + '"></div><div class="field"><label>Videographer</label><input id="g-vg" value="' + esc(m.vg || '') + '"></div>' +
        '<div class="field"><label>Techno-wiz</label><input id="g-tw" value="' + esc(m.tw || '') + '"></div><div class="field"><label>Spokesperson</label><input id="g-sp" value="' + esc(m.sp || '') + '"></div></div>' +
        '<div class="field"><label>Head Delegate</label><select id="g-head">' + [['cw', 'Content Writer'], ['vg', 'Videographer'], ['tw', 'Techno-wiz'], ['sp', 'Spokesperson']].map(function (r) { return '<option value="' + r[0] + '"' + (d.head === r[0] ? ' selected' : '') + '>' + r[1] + '</option>'; }).join('') + '</select></div>', 'Save', function () {
        return run('admin_delegation_update', { p_id: id, p_name: mv('g-name'), p_campus: mv('g-campus'), p_ic: num(mv('g-ic')) || 0, p_cash: num(mv('g-cash')) || 0, p_members: { cw: mv('g-cw'), vg: mv('g-vg'), tw: mv('g-tw'), sp: mv('g-sp') }, p_head: mv('g-head') }, 'Delegation saved.');
      });
    } else if (a === 'ddel') {
      var d2 = delById(id); if (!d2) return;
      modal('Delete delegation', '<p style="font-size:13px;color:var(--soft)">Delete <b>' + esc(d2.name) + '</b> together with its ' + d2.account_count + ' account(s), bids, bookings and trades? This cannot be undone.</p>', 'Delete delegation', function () {
        return run('admin_delegation_delete', { p_id: id }, 'Delegation deleted.');
      }, true);
    }
  });

  /* ========================================================= LIVE ACTIVITY */
  var actKind = null;
  INIT.activity = function () {
    $('pane-activity').innerHTML = '<div class="card"><div class="row-between"><div><h2>Live activity</h2><div class="help">Every bid, booking, trade and account change, newest first, with the delegation name. Updates by itself.</div></div></div>' +
      '<div class="chips" id="act-chips" style="margin-top:12px">' + [[null, 'Everything'], ['auction', 'Auction'], ['room', 'Room booking'], ['forex', 'X Change'], ['account', 'Accounts']].map(function (c) { return '<button type="button" class="chip' + (c[0] === null ? ' on' : '') + '" data-k="' + (c[0] || '') + '">' + c[1] + '</button>'; }).join('') + '</div>' +
      '<div class="feed" id="act-feed"></div></div>';
    $('act-chips').addEventListener('click', function (e) {
      var b = e.target.closest('[data-k]'); if (!b) return;
      actKind = b.getAttribute('data-k') || null;
      Array.prototype.forEach.call($('act-chips').children, function (c) { c.classList.toggle('on', c === b); });
      refreshAll();
    });
  };
  START.activity = function () {
    return [IG.live('admin_activity', function () { return { p_kind: actKind, p_limit: 300 }; }, function (rows) {
      put('act-feed', rows.length ? rows.map(feedRow).join('') : '<div class="note">Nothing here yet.</div>');
    })];
  };

  buildTabs();
  route();
})();
