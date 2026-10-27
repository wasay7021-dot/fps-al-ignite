/* FPS IGNITE XIII - Industry Auction (delegate screen)
   Everything on this page updates by itself (see IG.live in app.js). */
(function () {
  'use strict';
  var S = IG.boot('auction', { roles: ['delegate', 'admin', 'viewer'] });
  if (!S) return;
  var $ = IG.$, esc = IG.esc, fmt = IG.fmt;
  var isDelegate = S.role === 'delegate';
  var sel = null, shownSel = null, last = null, busy = false, live;
  var MIN = 50;

  function byId(arr, id) { for (var i = 0; i < arr.length; i++) if (arr[i].id === id) return arr[i]; return null; }
  function statusLabel(i) { return i.settled ? 'Closed' : i.status === 'open' ? 'Open' : i.status === 'paused' ? 'Paused' : 'Not open yet'; }
  function pillCls(i) { return i.settled ? '' : i.status; }

  var input = $('amt');
  IG.numeric(input, { onInput: function () { hint(); }, onEnter: function () { bid(); } });

  function pickDefault(d) {
    if (sel && byId(d.industries, sel)) return;
    var pick = null, k;
    for (k = 0; k < d.industries.length && !pick; k++) if (d.industries[k].my_bid != null) pick = d.industries[k];
    for (k = 0; k < d.industries.length && !pick; k++) if (d.industries[k].status === 'open') pick = d.industries[k];
    sel = (pick || d.industries[0]).id;
  }

  function hint() {
    if (!last) return;
    var me = last.me, v = IG.val(input), t = '';
    if (!me) return;
    t = 'Minimum ' + MIN + ' ICs. Maximum ' + fmt(me.ic) + ' ICs (your balance).';
    if (v != null && v < MIN) t = 'The minimum bid is ' + MIN + ' ICs.';
    else if (v != null && v > me.ic) t = 'That is more than your balance of ' + fmt(me.ic) + ' ICs.';
    $('amthint').textContent = t;
    $('amthint').style.color = (v != null && (v < MIN || v > me.ic)) ? 'var(--bad)' : '';
  }

  function draw(d) {
    last = d; MIN = d.min_bid || 50;
    pickDefault(d);
    var me = d.me;

    /* ---- delegation / balance card ---- */
    if (me) {
      IG.setHtml('mecard',
        '<div class="row-between"><div><div class="label gold">Your delegation</div><div class="big">' + esc(me.name) + '</div></div>' +
        '<div style="text-align:right"><div class="label gold">IC left</div><div class="bigger">' + fmt(me.ic) + ' ICs</div></div></div>' +
        (me.won ? '<div class="note good">You won <b>' + esc(me.won.industry) + '</b> with a bid of ' + fmt(me.won.amount) + ' ICs. Your remaining ICs can be used in Room Booking.</div>' : ''));
    } else {
      IG.setHtml('mecard', '<div class="big">Organizer view</div><div class="help">You are signed in as an organizer. Delegations place their bids from their own accounts. Bids and rankings update live below.</div>');
    }

    /* ---- selected industry ---- */
    var ind = byId(d.industries, sel), det = d.detail && d.detail.id === sel ? d.detail : null;
    if (sel !== shownSel) { shownSel = sel; input.value = ind && ind.my_bid != null && !ind.settled ? String(ind.my_bid) : ''; }
    var left = ind.places - ind.won_count;
    IG.setHtml('dhead', '<div class="row-between"><div><div class="label gold">Your industry</div><h2>' + esc(ind.name) + '</h2></div><span class="pill ' + pillCls(ind) + '">' + statusLabel(ind) + '</span></div>');
    var myBid = ind.my_bid != null ? fmt(ind.my_bid) + ' ICs' + (ind.my_status && ind.my_status !== 'pending' ? ' &middot; ' + ind.my_status : '') : 'None yet';
    IG.setHtml('dboxes', '<div class="boxes">' +
      '<div class="box"><div class="label gold">Availability</div><b>' + (ind.settled ? 'Closed' : left + ' of ' + ind.places + ' places') + '</b></div>' +
      '<div class="box"><div class="label gold">Your bid</div><b>' + myBid + '</b></div>' +
      '<div class="box"><div class="label gold">Your rank</div><b>' + (det && det.my_rank ? '#' + det.my_rank + ' of ' + ind.bid_count : (ind.bid_count + (ind.bid_count === 1 ? ' bid' : ' bids') + ' so far')) + '</b></div></div>');

    var canType = isDelegate && me && !me.won;
    var canBid = canType && ind.status === 'open';
    var note = '';
    if (!isDelegate) note = '';
    else if (me && me.won) note = '<div class="note good">Your delegation already holds an industry, so you cannot bid again.</div>';
    else if (ind.settled) note = '<div class="note">This industry is closed. The winners are listed below.</div>';
    else if (ind.status === 'paused') note = '<div class="note warn">Bidding is paused by the organizers. You can type your bid now and place it when it reopens.</div>';
    else if (ind.status === 'closed') note = '<div class="note">Bidding for this industry has not opened yet. You can type your bid now and place it as soon as the organizers open it.</div>';
    else note = '<div class="note good">Bidding is <b>open</b>. Highest bids win; equal bids are ranked by who bid first. Your balance is only deducted if you win when the organizers close this industry.</div>';
    IG.setHtml('dnote', note);

    $('dform').style.display = canType && !ind.settled ? '' : 'none';
    input.disabled = !canType;
    $('bidbtn').disabled = !canBid || busy;
    $('bidbtn').textContent = ind.my_bid != null ? 'Update bid' : 'Place bid';
    $('wdbtn').style.display = canBid && ind.my_bid != null && ind.my_status === 'pending' ? '' : 'none';
    hint();

    /* ---- live ranking ---- */
    if (ind.settled) {
      $('dboardlabel').textContent = 'Winners (' + (det ? det.winners.length : ind.won_count) + ')';
      var w = det ? det.winners : [];
      IG.setHtml('dboard', w.length ? '<div class="list">' + w.map(function (x, i) {
        return '<div class="item' + (x.name === (me && me.name) ? ' mine' : '') + '"><span><span class="rank">' + (i + 1) + '</span><b>' + esc(x.name) + '</b></span><b>' + fmt(x.amount) + ' ICs</b></div>';
      }).join('') + '</div>' : '<div class="note">No winners.</div>');
    } else {
      $('dboardlabel').textContent = 'Live bids · ' + ind.bid_count;
      var top = det ? det.top : [], rows = '';
      top.forEach(function (x) {
        rows += '<div class="item' + (x.mine ? ' mine' : '') + '"><span><span class="rank">' + x.rank + '</span><b>' + esc(x.name) + '</b>' + (x.mine ? ' <span class="pill won">You</span>' : '') + '</span><b>' + fmt(x.amount) + ' ICs</b></div>';
        if (x.rank === ind.places) rows += '<div class="cut"><span>Top ' + ind.places + ' win a place</span></div>';
      });
      IG.setHtml('dboard', top.length ? '<div class="list">' + rows + '</div>' + (ind.bid_count > top.length ? '<div class="help">Showing the top ' + top.length + ' of ' + ind.bid_count + ' bids.</div>' : '') : '<div class="note">No bids yet. Be the first.</div>');
    }

    /* ---- all industries ---- */
    IG.setHtml('inds', d.industries.map(function (i) {
      var mine = i.my_bid != null ? ' &middot; your bid ' + fmt(i.my_bid) + ' ICs' + (i.my_status !== 'pending' ? ' (' + i.my_status + ')' : '') : '';
      return '<div class="item click' + (i.id === sel ? ' selected' : '') + '" data-id="' + i.id + '"><div><b>' + esc(i.name) + '</b><small>' + (i.places - i.won_count) + ' of ' + i.places + ' places left &middot; ' + i.bid_count + ' bid' + (i.bid_count === 1 ? '' : 's') + mine + '</small></div><span class="pill ' + pillCls(i) + '">' + statusLabel(i) + '</span></div>';
    }).join(''));
  }

  $('inds').addEventListener('click', function (e) {
    var el = e.target.closest ? e.target.closest('[data-id]') : null;
    if (!el) return;
    sel = parseInt(el.getAttribute('data-id'), 10);
    if (last) draw(last);
    live.refresh();
    var dc = $('detail'); if (dc && dc.scrollIntoView && window.innerWidth < 760) dc.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });

  function bid() {
    if (!last || !last.me || busy) return;
    var ind = byId(last.industries, sel), v = IG.val(input);
    if (!ind) return;
    if (ind.status !== 'open') { IG.toast('Bidding for this industry is not open right now.', 'err'); return; }
    if (v == null) { IG.toast('Type your bid amount first.', 'err'); input.focus(); return; }
    if (v < MIN) { IG.toast('The minimum bid is ' + MIN + ' ICs.', 'err'); return; }
    if (v > last.me.ic) { IG.toast('Your bid cannot be more than your balance of ' + fmt(last.me.ic) + ' ICs.', 'err'); return; }
    busy = true; $('bidbtn').disabled = true;
    IG.call('auction_bid', { p_industry: sel, p_amount: v }).then(function () {
      IG.toast('Bid of ' + fmt(v) + ' ICs placed on ' + ind.name + '.', 'ok');
    }, function (e) { IG.toast(IG.errMsg(e), 'err'); }).then(function () { busy = false; live.refresh(); });
  }
  $('bidbtn').addEventListener('click', bid);
  $('wdbtn').addEventListener('click', function () {
    if (busy) return; busy = true;
    IG.call('auction_withdraw', { p_industry: sel }).then(function () {
      input.value = ''; IG.toast('Bid withdrawn.', 'ok');
    }, function (e) { IG.toast(IG.errMsg(e), 'err'); }).then(function () { busy = false; live.refresh(); });
  });

  live = IG.live('auction_state', function () { return { p_industry: sel }; }, draw, {
    onError: function (e) { IG.setHtml('mecard', '<div class="note warn">' + esc(IG.errMsg(e)) + '</div>'); }
  });
})();
