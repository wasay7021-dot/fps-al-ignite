/* FPS IGNITE XIII - Foreign X Change (delegate screen)
   Buy and sell six currencies. Prices, the crisis picture / video, your balance
   and your profit all update live without refreshing. */
(function () {
  'use strict';
  var S = IG.boot('forex', { roles: ['delegate', 'admin', 'viewer'] });
  if (!S) return;
  var $ = IG.$, esc = IG.esc, fmt = IG.fmt, CUR = IG.CUR;
  var isDelegate = S.role === 'delegate';
  var last = null, built = false, busy = false, live, mediaKey = '';
  var STATUS = { closed: 'Not open yet', open: 'Trading open', paused: 'Paused', finished: 'Finished' };

  /* ---------- the six currency cards are built once ---------- */
  function build() {
    $('fxgrid').innerHTML = CUR.map(function (c) {
      var k = c[0];
      return '<div class="fx"><div class="label gold">' + c[1] + '</div>' +
        '<div class="px" id="px_' + k + '">-</div><div class="hint" id="dl_' + k + '" style="margin:-8px 0 8px;min-height:14px"></div>' +
        '<input id="in_' + k + '" placeholder="Enter amount" aria-label="' + c[1] + ' amount">' +
        '<div class="fxbtns"><button class="btn small" id="b_' + k + '" type="button">Buy</button><button class="btn small dark" id="s_' + k + '" type="button">Sell</button></div>' +
        '<div class="owned" id="ow_' + k + '">Owned: 0</div><div class="hint" id="hn_' + k + '"></div></div>';
    }).join('');
    CUR.forEach(function (c) {
      var k = c[0];
      IG.numeric($('in_' + k), { onInput: function () { hint(k); }, onEnter: function () { /* Enter does nothing: choose Buy or Sell */ } });
      $('b_' + k).addEventListener('click', function () { trade(k, 'buy'); });
      $('s_' + k).addEventListener('click', function () { trade(k, 'sell'); });
    });
    built = true;
  }

  function owned(k) { var h = last && last.me && last.me.holdings && last.me.holdings[k]; return h ? h.qty : 0; }
  function price(k) { return last && last.rates ? last.rates[k] : null; }
  function hint(k) {
    var el = $('hn_' + k), me = last && last.me, p = price(k);
    if (!me || p == null) { el.textContent = ''; return; }
    var v = IG.val($('in_' + k)), maxBuy = Math.floor(me.cash / p), t = 'Max buy ' + fmt(maxBuy) + ' · Max sell ' + fmt(owned(k)), bad = false;
    if (v != null && v > maxBuy && v > owned(k)) { t = 'Over your limit. Max buy ' + fmt(maxBuy) + ', max sell ' + fmt(owned(k)) + '.'; bad = true; }
    el.textContent = t; el.style.color = bad ? 'var(--bad)' : '';
  }

  /* ---------- crisis picture / video (no controls, cannot be skipped) ---------- */
  function showMedia(c) {
    var key = c ? c.kind + '|' + c.path : '';
    if (key === mediaKey) return;
    mediaKey = key;
    var box = $('cbox');
    box.innerHTML = '';
    box.oncontextmenu = function (e) { e.preventDefault(); return false; };
    if (!c) { box.innerHTML = '<div class="none">The organizers will show the crisis here.</div>'; return; }
    var url = IG.mediaUrl(c.path);
    if (c.kind === 'video') {
      var v = document.createElement('video');
      v.src = url; v.autoplay = true; v.loop = true; v.muted = true; v.playsInline = true; v.controls = false;
      v.setAttribute('playsinline', ''); v.setAttribute('muted', ''); v.setAttribute('disablepictureinpicture', '');
      v.setAttribute('controlslist', 'nodownload nofullscreen noremoteplayback noplaybackrate');
      v.draggable = false;
      box.appendChild(v);
      var shield = document.createElement('div'); shield.className = 'shield'; box.appendChild(shield);
      var snd = document.createElement('button'); snd.type = 'button'; snd.className = 'btn small ghost soundbtn'; snd.textContent = 'Sound on';
      snd.addEventListener('click', function () { v.muted = !v.muted; snd.textContent = v.muted ? 'Sound on' : 'Sound off'; if (v.paused) v.play(); });
      box.appendChild(snd);
      var p = v.play(); if (p && p.catch) p.catch(function () {
        var tap = document.createElement('button'); tap.type = 'button'; tap.className = 'btn soundbtn'; tap.style.cssText = 'left:50%;right:auto;bottom:50%;transform:translate(-50%,50%)'; tap.textContent = 'Tap to play';
        tap.addEventListener('click', function () { v.play(); tap.remove(); }); box.appendChild(tap);
      });
    } else {
      var im = document.createElement('img'); im.src = url; im.alt = 'Global crisis'; im.draggable = false; box.appendChild(im);
      var sh = document.createElement('div'); sh.className = 'shield'; box.appendChild(sh);
    }
  }

  /* ---------- main draw ---------- */
  function draw(d) {
    last = d;
    if (!built) build();
    var me = d.me, st = d.status, open = st === 'open', hasRates = !!d.rates;

    /* header card: delegation | round | balance (green = profit, red = loss) */
    var cls = me ? (me.pnl < 0 ? 'neg' : 'pos') : '';   /* green while at or above the starting cash, red when in loss */
    var top = '<div class="row-between" style="align-items:center">' +
      '<div><div class="label gold">Your delegation</div><div class="big">' + (me ? esc(me.name) : 'Organizer view') + '</div></div>' +
      '<div style="text-align:center"><div class="label gold">Round</div><div class="big">' + d.round + ' of ' + d.total_rounds + '</div><span class="pill ' + (open ? 'open' : st === 'paused' ? 'paused' : st === 'finished' ? 'won' : '') + '" style="margin-top:6px">' + STATUS[st] + '</span></div>' +
      '<div style="text-align:right"><div class="label gold">Balance</div><div class="bigger pnlbig ' + cls + '">' + (me ? fmt(me.total) + ' ICs' : '-') + '</div>' +
      (me ? '<div class="help" style="margin-top:4px">Profit / loss ' + IG.pnl(me.pnl) + '</div>' : '') + '</div></div>';
    if (me) top += '<div class="help" style="margin-top:12px">Cash to trade with <b>' + fmt(me.cash) + ' ICs</b> &middot; Holdings worth ' + fmt(me.total - me.cash) + ' ICs at today’s prices &middot; You started with ' + fmt(d.start_cash) + ' ICs</div>';
    if (!isDelegate) top += '<div class="note">You are signed in as an organizer. Delegations trade from their own accounts.</div>';
    else if (st === 'closed') top += '<div class="note">The exchange has not opened yet. Prices and the first crisis will appear here the moment the organizers start.</div>';
    else if (st === 'paused') top += '<div class="note warn">Trading is paused. Study the crisis and the new prices, then wait for the organizers to open trading.</div>';
    else if (st === 'finished') top += '<div class="note good">The exchange is over. The delegation with the most ICs wins. Final standings are below.</div>';
    else top += '<div class="note good">Trading is <b>open</b> for round ' + d.round + '. Read the crisis, then buy and sell before the round ends.</div>';
    IG.setHtml('top', top);

    /* crisis */
    var show = st !== 'closed';
    $('crisiscard').style.display = show ? '' : 'none';
    if (show) {
      $('crisislabel').textContent = 'Global crisis briefing · Round ' + d.round;
      IG.setText('crisistitle', d.crisis && d.crisis.title ? d.crisis.title : '');
      showMedia(d.crisis);
      if (d.ends_ms) { var t = $('timer'); if (t.__end !== d.ends_ms) { t.__end = d.ends_ms; IG.countdown(t, d.ends_ms, function () { live.refresh(); }); } }
      else { var t2 = $('timer'); if (t2.__cd) { clearInterval(t2.__cd); t2.__cd = null; } t2.__end = null; t2.textContent = ''; }
    }

    /* the six cards */
    CUR.forEach(function (c) {
      var k = c[0], p = d.rates ? d.rates[k] : null, pv = d.prev ? d.prev[k] : null;
      IG.setText('px_' + k, hasRates ? fmt(p) + ' ICs' : '-');
      var dl = '';
      if (hasRates && pv != null && p !== pv) dl = p > pv ? '<span class="up">&#9650; ' + (p - pv) + '</span>' : '<span class="down">&#9660; ' + (pv - p) + '</span>';
      IG.setHtml('dl_' + k, dl);
      IG.setText('ow_' + k, 'Owned: ' + fmt(owned(k)));
      var can = isDelegate && me && open;
      $('in_' + k).disabled = !(isDelegate && me);
      $('b_' + k).disabled = !can || busy;
      $('s_' + k).disabled = !can || busy;
      hint(k);
    });

    /* price panel */
    IG.setHtml('prices', CUR.map(function (c) {
      var p = d.rates ? d.rates[c[0]] : null, pv = d.prev ? d.prev[c[0]] : null, dl = '';
      if (hasRates && pv != null && p !== pv) dl = p > pv ? ' <span class="up">&#9650; ' + (p - pv) + '</span>' : ' <span class="down">&#9660; ' + (pv - p) + '</span>';
      return '<div class="item"><b>' + c[1] + '</b><span>' + (hasRates ? fmt(p) + ' ICs' : '-') + dl + '</span></div>';
    }).join(''));

    /* activity: realised profit / loss in green / red */
    IG.setHtml('acts', me ? (d.trades.length ? d.trades.map(function (t) {
      var nm = IG.curName(t.cur), left = (t.side === 'buy' ? 'Bought ' : 'Sold ') + fmt(t.qty) + ' ' + nm + ' @ ' + fmt(t.price) + ' ICs';
      var right = t.side === 'sell' ? '<b class="pnlbig">' + IG.pnl(t.pnl) + '</b>' : '<span class="hint" style="margin:0">spent ' + fmt(t.qty * t.price) + ' ICs</span>';
      return '<div class="item"><span><span class="rank">R' + t.round + '</span>' + left + '<small>' + IG.clock(t.at) + '</small></span>' + right + '</div>';
    }).join('') : '<div class="item"><span>No trades yet. Your profit or loss from each sale shows here.</span></div>') : '<div class="item"><span>Organizers can see every delegation’s trades in the Admin panel.</span></div>');

    /* final standings */
    if (d.standings) {
      $('stand').style.display = '';
      IG.setHtml('standlist', d.standings.map(function (x, i) {
        var isMe = me && x.name === me.name;
        return '<div class="item' + (isMe ? ' mine' : '') + '"><span><span class="rank">' + (i + 1) + '</span><b>' + esc(x.name) + '</b>' + (i === 0 ? ' <span class="pill won">Winner</span>' : '') + (isMe ? ' <span class="pill">You</span>' : '') + '</span><b>' + fmt(x.total) + ' ICs</b></div>';
      }).join(''));
    } else $('stand').style.display = 'none';
  }

  function trade(k, side) {
    if (!last || !last.me || busy) return;
    var d = last, nm = IG.curName(k), v = IG.val($('in_' + k)), p = price(k);
    if (d.status !== 'open') { IG.toast('Trading is not open right now.', 'err'); return; }
    if (v == null || v < 1) { IG.toast('Type how many ' + nm + ' you want to ' + side + ' first.', 'err'); $('in_' + k).focus(); return; }
    if (side === 'buy' && v * p > d.me.cash) { IG.toast('Not enough ICs. You can buy at most ' + fmt(Math.floor(d.me.cash / p)) + ' ' + nm + '.', 'err'); return; }
    if (side === 'sell' && v > owned(k)) { IG.toast('You only own ' + fmt(owned(k)) + ' ' + nm + '.', 'err'); return; }
    busy = true; CUR.forEach(function (c) { $('b_' + c[0]).disabled = true; $('s_' + c[0]).disabled = true; });
    IG.call('forex_trade', { p_cur: k, p_side: side, p_qty: v, p_round: d.round }).then(function (r) {
      $('in_' + k).value = '';
      IG.toast(side === 'buy' ? 'Bought ' + fmt(v) + ' ' + nm + ' for ' + fmt(v * p) + ' ICs.' : 'Sold ' + fmt(v) + ' ' + nm + ' for ' + fmt(v * p) + ' ICs (' + IG.signed(r && r.pnl) + ' ICs ' + ((r && r.pnl) < 0 ? 'loss' : 'profit') + ').', 'ok');
    }, function (e) { IG.toast(IG.errMsg(e), 'err'); }).then(function () { busy = false; live.refresh(); });
  }

  live = IG.live('forex_state', function () { return {}; }, draw, {
    onError: function (e) { IG.setHtml('top', '<div class="note warn">' + esc(IG.errMsg(e)) + '</div>'); }
  });
})();
