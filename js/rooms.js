/* FPS IGNITE XIII - Room Booking (delegate screen) */
(function () {
  'use strict';
  var S = IG.boot('rooms', { roles: ['delegate', 'admin', 'viewer'] });
  if (!S) return;
  var $ = IG.$, esc = IG.esc, fmt = IG.fmt;
  var isDelegate = S.role === 'delegate';
  var last = null, built = false, busy = {}, live;

  function room(id) { for (var i = 0; i < last.rooms.length; i++) if (last.rooms[i].id === id) return last.rooms[i]; return null; }

  /* The four room cards are built once, so a half-typed amount is never wiped by a live update. */
  function build(rooms) {
    $('rooms').innerHTML = rooms.map(function (r) {
      return '<div class="card" id="rc' + r.id + '" style="margin:0">' +
        '<div class="row-between"><div><div class="label gold">Room</div><h2>' + esc(r.name) + '</h2></div><span class="pill" id="st' + r.id + '"></span></div>' +
        '<div class="boxes" id="bx' + r.id + '" style="grid-template-columns:1fr 1fr"></div>' +
        '<div id="nt' + r.id + '"></div>' +
        '<div class="amt" id="fm' + r.id + '"><input id="in' + r.id + '" placeholder="Enter amount in ICs" aria-label="Amount in ICs for ' + esc(r.name) + '"><button class="btn" id="bk' + r.id + '" type="button">Book</button></div>' +
        '<div class="hint" id="hn' + r.id + '"></div>' +
        '<div class="label gold" style="margin-top:18px" id="bl' + r.id + '"></div><div id="bo' + r.id + '"></div></div>';
    }).join('');
    rooms.forEach(function (r) {
      var inp = $('in' + r.id);
      IG.numeric(inp, { onInput: function () { hint(r.id); }, onEnter: function () { book(r.id); } });
      $('bk' + r.id).addEventListener('click', function () { book(r.id); });
    });
    built = true;
  }

  function hint(id) {
    var r = room(id), me = last && last.me, inp = $('in' + id), v = IG.val(inp), h = $('hn' + id);
    if (!r || !me) { h.textContent = ''; return; }
    var t = 'Minimum ' + fmt(r.price) + ' ICs. Maximum ' + fmt(me.ic) + ' ICs (your remaining balance).', bad = false;
    if (v != null && v < r.price) { t = 'The minimum for this room is ' + fmt(r.price) + ' ICs.'; bad = true; }
    else if (v != null && v > me.ic) { t = 'That is more than your remaining balance of ' + fmt(me.ic) + ' ICs.'; bad = true; }
    h.textContent = t; h.style.color = bad ? 'var(--bad)' : '';
  }

  function draw(d) {
    last = d;
    if (!built) build(d.rooms);
    var me = d.me;
    if (me) {
      IG.setHtml('mecard', '<div class="row-between"><div><div class="label gold">Your delegation</div><div class="big">' + esc(me.name) + '</div></div>' +
        '<div style="text-align:right"><div class="label gold">IC left</div><div class="bigger">' + fmt(me.ic) + ' ICs</div></div></div>' +
        (me.ic <= 0 ? '<div class="note warn">You have no ICs left, so you cannot book a room.</div>' : ''));
    } else {
      IG.setHtml('mecard', '<div class="big">Organizer view</div><div class="help">Delegations book rooms from their own accounts. Bookings appear below live.</div>');
    }
    d.rooms.forEach(function (r) {
      var left = r.places - r.booked, mine = r.my_amount != null;
      var st = $('st' + r.id); var stTxt = r.status === 'open' ? 'Open' : 'Closed';
      if (st.textContent !== stTxt) st.textContent = stTxt;
      st.className = 'pill ' + (r.status === 'open' ? 'open' : '');
      IG.setHtml('bx' + r.id,
        '<div class="box"><div class="label gold">Availability</div><b>' + (left > 0 ? left + ' of ' + r.places + ' places' : 'Full') + '</b></div>' +
        '<div class="box"><div class="label gold">Room cost (min)</div><b>' + fmt(r.price) + ' ICs</b></div>');
      var note = '', can = isDelegate && me && !mine && left > 0 && r.status === 'open' && me.ic > 0;
      if (!isDelegate) note = '';
      else if (mine) note = '<div class="note good">You booked this room for ' + fmt(r.my_amount) + ' ICs.</div>';
      else if (me && me.ic <= 0) note = '<div class="note warn">No ICs left to book a room.</div>';
      else if (left <= 0) note = '<div class="note warn">This room is full.</div>';
      else if (r.status !== 'open') note = '<div class="note">Booking for this room is not open yet. You can type your amount now and book as soon as the organizers open it.</div>';
      else note = '<div class="note good">Booking is <b>open</b>.</div>';
      IG.setHtml('nt' + r.id, note);
      var showForm = isDelegate && me && !mine && left > 0 && me.ic > 0;
      $('fm' + r.id).style.display = showForm ? '' : 'none';
      $('hn' + r.id).style.display = showForm ? '' : 'none';
      $('in' + r.id).disabled = !showForm;
      $('bk' + r.id).disabled = !can || !!busy[r.id];
      hint(r.id);
      $('bl' + r.id).textContent = 'Booked by · ' + r.booked + ' of ' + r.places;
      IG.setHtml('bo' + r.id, r.bookers.length ? '<div class="list">' + r.bookers.map(function (b) {
        var isMe = me && b.name === me.name;
        return '<div class="item' + (isMe ? ' mine' : '') + '"><b>' + esc(b.name) + (isMe ? ' <span class="pill won">You</span>' : '') + '</b><span>' + fmt(b.amount) + ' ICs</span></div>';
      }).join('') + '</div>' : '<div class="note">No bookings yet.</div>');
    });
  }

  function book(id) {
    if (!last || !last.me || busy[id]) return;
    var r = room(id), v = IG.val($('in' + id));
    if (!r) return;
    if (r.status !== 'open') { IG.toast('Booking for this room is not open right now.', 'err'); return; }
    if (v == null) { IG.toast('Type the amount first.', 'err'); $('in' + id).focus(); return; }
    if (v < r.price) { IG.toast('The minimum for ' + r.name + ' is ' + fmt(r.price) + ' ICs.', 'err'); return; }
    if (v > last.me.ic) { IG.toast('That is more than your remaining balance of ' + fmt(last.me.ic) + ' ICs.', 'err'); return; }
    busy[id] = true; $('bk' + id).disabled = true;
    IG.call('room_book', { p_room: id, p_amount: v }).then(function () {
      $('in' + id).value = ''; IG.toast('Booked ' + r.name + ' for ' + fmt(v) + ' ICs.', 'ok');
    }, function (e) { IG.toast(IG.errMsg(e), 'err'); }).then(function () { busy[id] = false; live.refresh(); });
  }

  live = IG.live('rooms_state', function () { return {}; }, draw, {
    onError: function (e) { IG.setHtml('mecard', '<div class="note warn">' + esc(IG.errMsg(e)) + '</div>'); }
  });
})();
