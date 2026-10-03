/* ==========================================================================
   EREKTOR account portal — loaded only by /account/*.

   The Worker has already checked the session before any of these pages is
   served; this script fetches the account's records and files requests. A
   401 from the API means the session ran out, so it goes back to sign-in.
   ========================================================================== */
(function () {
  'use strict';

  function api(path, opts) {
    opts = opts || {};
    var init = { method: opts.method || 'GET', credentials: 'same-origin', headers: {} };
    if (opts.body !== undefined) {
      init.headers['Content-Type'] = 'application/json';
      init.body = JSON.stringify(opts.body);
    }
    return fetch('/api/account' + path, init).then(function (r) {
      if (r.status === 401 && !opts.noRedirect) {
        location.href = '/account/signin.html?next=' + encodeURIComponent(location.pathname + location.search);
        return new Promise(function () {});
      }
      return r.json().catch(function () { return {}; }).then(function (body) {
        if (!r.ok) {
          var err = new Error(body.error || 'Something went wrong. Try again.');
          err.body = body;
          throw err;
        }
        return body;
      });
    });
  }

  function el(tag, cls, text) {
    var node = document.createElement(tag);
    if (cls) node.className = cls;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  function note(kind, title, body, link) {
    var box = document.getElementById('result');
    box.textContent = '';
    var n = el('div', 'note note--' + kind);
    n.appendChild(el('p', 'note__title', title));
    if (body) {
      var p = el('p', '', body);
      if (link) {
        p.appendChild(document.createTextNode(' '));
        var a = el('a', '', link.label);
        a.href = link.href;
        p.appendChild(a);
      }
      n.appendChild(p);
    }
    box.appendChild(n);
    box.hidden = false;
    box.scrollIntoView({ block: 'nearest' });
  }

  function ersPill(f) {
    return f.ers_status === 'live'
      ? el('span', 'pill pill--ok', (f.ers_phase ? 'Phase ' + f.ers_phase + ' · ' : '') + 'ERS live')
      : el('span', 'pill pill--flat', 'ERS coming soon');
  }

  function date(iso) {
    return iso ? new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }) : '—';
  }

  function row(cells) {
    var tr = el('tr');
    cells.forEach(function (c) {
      var td = el('td');
      if (c instanceof Node) td.appendChild(c); else td.textContent = c;
      tr.appendChild(td);
    });
    return tr;
  }

  function pill(kind, text) { return el('span', 'pill pill--' + kind, text); }

  function ago(iso) {
    if (!iso) return 'never';
    var d = Math.floor((Date.now() - Date.parse(iso)) / 864e5);
    return d <= 0 ? 'today' : d === 1 ? 'yesterday' : d + ' days ago';
  }

  function plural(n, word) { return n + ' ' + word + (n === 1 ? '' : 's'); }

  // The leg's serials stacked, mechanical first: it is the one stamped on the frame.
  function legCell(l) {
    var c = el('div');
    c.appendChild(el('b', 'mono tbl__serial', l.mechanical_serial));
    c.appendChild(el('span', 'tbl__sub mono', l.electronics_serial || 'no controller bound'));
    return c;
  }

  // Same three colours as the registry console's meter.
  function meter(l) {
    var m = el('span', 'meter');
    m.title = l.hours_since_service + ' h since the last closed service record';
    var track = el('span', 'meter__track');
    var fill = el('span', 'meter__fill meter__fill--' + (l.due ? 'dispatch' : l.due_soon ? 'flag' : 'self'));
    fill.setAttribute('data-w', Math.min(Math.round((l.interval_fraction || 0) * 100), 100));
    track.appendChild(fill);
    m.appendChild(track);
    m.appendChild(el('b', 'mono', l.hours_since_service + ' h'));
    return m;
  }

  // Everything about a leg a customer should act on, most serious first.
  function reasons(l, intervalHours) {
    var out = [];
    if (l.state === 'quarantine') out.push({ rank: 0, kind: 'crit', text: 'Quarantined' });
    if (l.due) out.push({ rank: 1, kind: 'crit', text: 'Service due (' + intervalHours + ' h)' });
    if (l.flag_code) out.push({ rank: 2, kind: 'warn', text: 'Flagged ' + l.flag_code });
    if (l.due_soon) out.push({ rank: 3, kind: 'warn', text: 'Service due soon' });
    if (l.stale && l.state === 'deployed') out.push({ rank: 4, kind: 'flat', text: 'Not seen ' + ago(l.last_seen_at) });
    return out;
  }

  function actions(l) {
    var td = el('td', 'act');
    var a = el('a', '', 'Maintenance');
    a.href = 'maintenance.html?serial=' + encodeURIComponent(l.mechanical_serial) + '&facility=' + l.facility_id;
    td.appendChild(a);
    // A replacement goes to a site, so only a leg at one can need it.
    if (l.electronics_serial && l.state === 'deployed') {
      var e = el('a', '', 'Emergency');
      e.href = 'emergency.html?serial=' + encodeURIComponent(l.electronics_serial) + '&facility=' + l.facility_id;
      td.appendChild(e);
    }
    return td;
  }

  function statusPill(status) {
    return status === 'closed' ? pill('flat', 'Closed') : status === 'scheduled' ? pill('info', 'Scheduled') : pill('warn', 'Open');
  }

  function stat(name, value) {
    document.querySelectorAll('[data-stat="' + name + '"]').forEach(function (n) { n.textContent = value; });
  }

  function meta(name, value) {
    document.querySelectorAll('[data-meta="' + name + '"]').forEach(function (n) { n.textContent = value; });
  }

  function empty(body, cols, text) {
    var td = el('td', 'muted', text);
    td.colSpan = cols;
    var tr = el('tr');
    tr.appendChild(td);
    body.appendChild(tr);
  }

  /* ---------------------------------------------------------- sign-in */

  var signin = document.querySelector('[data-account-signin]');
  if (signin) {
    signin.addEventListener('submit', function (e) {
      e.preventDefault();
      var button = signin.querySelector('button[type=submit]');
      button.disabled = true;
      api('/session', {
        method: 'POST',
        noRedirect: true,
        body: { email: signin.email.value, password: signin.password.value, remember: signin.remember.checked }
      }).then(function () {
        // Any same-site path: the docs and firmware send people here too.
        var next = new URLSearchParams(location.search).get('next');
        location.replace(next && /^\/[^\/\\]/.test(next) ? next : '/account/index.html');
      }).catch(function (err) {
        button.disabled = false;
        signin.password.value = '';
        if (err.body && err.body.setup) {
          note('warn', 'Finish setup first', err.message, { href: err.body.setup, label: 'Open erektor-return.systems' });
        } else {
          note('crit', 'Could not sign in', err.message);
        }
      });
    });
    return;
  }

  /* -------------------------------------------------------- signed in */

  var signout = document.querySelector('[data-signout]');
  if (signout) {
    signout.addEventListener('click', function () {
      api('/session', { method: 'DELETE', noRedirect: true }).finally(function () {
        location.href = '/account/signin.html';
      });
    });
  }

  api('/me').then(function (acct) {
    document.querySelectorAll('[data-company]').forEach(function (n) { n.textContent = acct.company.name; });
    document.querySelectorAll('[data-email]').forEach(function (n) { n.textContent = acct.user.email; });

    var legs = acct.legs || [];
    var facName = {};
    acct.facilities.forEach(function (f) { facName[f.id] = f.name; });
    var open = acct.requests.filter(function (r) { return r.status !== 'closed'; });
    var attention = [];
    legs.forEach(function (l) {
      var why = reasons(l, acct.intervalHours);
      if (why.length) attention.push({ leg: l, why: why, rank: Math.min.apply(null, why.map(function (w) { return w.rank; })) });
    });
    attention.sort(function (a, b) { return a.rank - b.rank; });

    stat('legs', legs.length);
    stat('deployed', legs.filter(function (l) { return l.state === 'deployed'; }).length);
    stat('attention', attention.length);
    stat('open', open.length);

    var ar = document.querySelector('[data-attention-rows]');
    if (ar) {
      ar.textContent = '';
      meta('attention', plural(attention.length, 'leg'));
      if (!attention.length) empty(ar, 4, legs.length ? 'Nothing needs you right now.' : 'No legs on your account yet.');
      attention.forEach(function (a) {
        var why = el('div');
        a.why.forEach(function (w) { why.appendChild(pill(w.kind, w.text)); why.appendChild(document.createTextNode(' ')); });
        var tr = row([legCell(a.leg), facName[a.leg.facility_id] || '—', why]);
        tr.appendChild(actions(a.leg));
        ar.appendChild(tr);
      });
    }

    var or = document.querySelector('[data-open-rows]');
    if (or) {
      or.textContent = '';
      meta('open', plural(open.length, 'request'));
      if (!open.length) empty(or, 2, 'Nothing in progress.');
      open.forEach(function (r) {
        var c = el('div');
        c.appendChild(el('b', 'mono', r.reference));
        c.appendChild(el('span', 'tbl__sub', (r.kind === 'emergency' ? 'Emergency' : 'Maintenance') + ' · ' + r.facility));
        or.appendChild(row([c, statusPill(r.status)]));
      });
    }

    var lr = document.querySelector('[data-leg-rows]');
    if (lr) {
      lr.textContent = '';
      meta('legs', plural(legs.length, 'leg') + (acct.intervalHours ? ' · interval ' + acct.intervalHours + ' h' : ''));
      if (!legs.length) empty(lr, 7, 'No legs are assigned to your facilities yet. Erektor assigns them when they are delivered.');
      legs.forEach(function (l) {
        var st = el('div');
        st.appendChild(pill(l.state_kind, l.state_label));
        if (l.flag_code) { st.appendChild(document.createTextNode(' ')); st.appendChild(pill('warn', l.flag_code)); }
        var tr = row([legCell(l), el('span', 'mono', l.variant), facName[l.facility_id] || '—', st, meter(l), ago(l.last_seen_at)]);
        tr.appendChild(actions(l));
        lr.appendChild(tr);
      });
      if (window.ERS) window.ERS.widths(lr);
    }

    var fr = document.querySelector('[data-facility-rows]');
    if (fr) {
      fr.textContent = '';
      meta('facilities', acct.facilities.length + (acct.facilities.length === 1 ? ' facility' : ' facilities'));
      if (!acct.facilities.length) empty(fr, 6, 'No facilities yet. Add them in the ERS console.');
      acct.facilities.forEach(function (f) {
        var name = el('div');
        name.appendChild(el('b', '', f.name));
        if (f.description) name.appendChild(el('div', 'tbl__sub', f.description));
        var count = function (list, test) { return el('td', 'num mono', String(list.filter(test).length)); };
        var tr = row([name, f.location || '—', ersPill(f)]);
        tr.appendChild(count(legs, function (l) { return l.facility_id === f.id; }));
        tr.appendChild(count(attention, function (a) { return a.leg.facility_id === f.id; }));
        tr.appendChild(count(open, function (r) { return r.facility === f.name; }));
        fr.appendChild(tr);
      });
    }

    var rr = document.querySelector('[data-request-rows]');
    if (rr) {
      rr.textContent = '';
      meta('requests', 'last ' + plural(acct.requests.length, 'request'));
      if (!acct.requests.length) empty(rr, 7, 'Nothing filed yet.');
      acct.requests.forEach(function (r) {
        var kind = r.kind === 'emergency' ? pill('crit', 'Emergency') : pill('info', 'Maintenance');
        rr.appendChild(row([
          el('span', 'mono', r.reference), kind, r.facility, el('span', 'mono', r.serial),
          r.needed_by ? date(r.needed_by + 'T12:00:00') : '—', statusPill(r.status), date(r.created_at)
        ]));
      });
    }

    // ?facility= from a leg's action link on the dashboard.
    var pick = new URLSearchParams(location.search).get('facility');
    document.querySelectorAll('[data-facilities]').forEach(function (select) {
      acct.facilities.forEach(function (f) {
        var o = el('option', '', f.name + (f.ers_status === 'live' ? '' : ' — ERS coming soon'));
        o.value = f.id;
        select.appendChild(o);
      });
      if (pick) select.value = pick;
    });
  });

  /* ---------------------------------------------------------- requests */

  var form = document.querySelector('[data-account-request]');
  if (form) {
    // A fault code routed here from the triage on the home page.
    var code = new URLSearchParams(location.search).get('code');
    if (code && /^[A-Z]{2,4}-\d{2}$/i.test(code)) form.details.value = 'Fault code ' + code.toUpperCase() + '. ';
    var serial = new URLSearchParams(location.search).get('serial');
    if (serial) form.serial.value = serial.slice(0, 40);
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var button = form.querySelector('button[type=submit]');
      button.disabled = true;
      var data = {
        kind: form.getAttribute('data-account-request'),
        facility_id: form.facility_id.value,
        serial: form.serial.value,
        details: form.details.value,
        contact: form.contact.value
      };
      if (form.needed_by) data.needed_by = form.needed_by.value;
      api('/requests', { method: 'POST', body: data }).then(function (reply) {
        form.reset();
        note('ok', 'Filed as ' + reply.reference,
          'It is on your account now.', { href: 'index.html', label: 'See all requests' });
      }).catch(function (err) {
        note('crit', 'Not filed', err.message);
      }).finally(function () {
        button.disabled = false;
      });
    });
  }
})();
