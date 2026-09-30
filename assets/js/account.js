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
        location.href = '/account/signin.html?next=' + encodeURIComponent(location.pathname);
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
        var next = new URLSearchParams(location.search).get('next');
        location.replace(next && /^\/account\/[\w-]+(\.html)?$/.test(next) ? next : '/account/index.html');
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

    var fr = document.querySelector('[data-facility-rows]');
    if (fr) {
      fr.textContent = '';
      if (!acct.facilities.length) empty(fr, 3, 'No facilities yet. Add them in the ERS console.');
      acct.facilities.forEach(function (f) {
        var name = el('div');
        name.appendChild(el('b', '', f.name));
        if (f.description) name.appendChild(el('div', 'tbl__sub', f.description));
        fr.appendChild(row([name, f.location || '—', ersPill(f)]));
      });
    }

    var rr = document.querySelector('[data-request-rows]');
    if (rr) {
      rr.textContent = '';
      if (!acct.requests.length) empty(rr, 7, 'Nothing filed yet.');
      acct.requests.forEach(function (r) {
        var kind = r.kind === 'emergency'
          ? el('span', 'pill pill--crit', 'Emergency')
          : el('span', 'pill pill--info', 'Maintenance');
        rr.appendChild(row([
          el('span', 'mono', r.reference), kind, r.facility, el('span', 'mono', r.serial),
          r.needed_by ? date(r.needed_by + 'T12:00:00') : '—', r.status, date(r.created_at)
        ]));
      });
    }

    document.querySelectorAll('[data-facilities]').forEach(function (select) {
      acct.facilities.forEach(function (f) {
        var o = el('option', '', f.name + (f.ers_status === 'live' ? '' : ' — ERS coming soon'));
        o.value = f.id;
        select.appendChild(o);
      });
    });
  });

  /* ---------------------------------------------------------- requests */

  var form = document.querySelector('[data-account-request]');
  if (form) {
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
