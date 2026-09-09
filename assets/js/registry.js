/* ==========================================================================
   EREKTOR Registry — the gated console

   Loaded only by /internal/*, never by the public portal. It leans on ERS
   from app.js for escaping, data loading and the serial fields, so the two
   halves of the site validate a serial the same way.

   The posture here is the opposite of the public forms. Those degrade open:
   if the API is unreachable the operator still walks away with a reference
   number. This one degrades shut and says so — a registry that silently
   accepted a leg into local storage would be worse than one that refused,
   because the fleet count would be wrong and nobody would know.
   ========================================================================== */
(function () {
  'use strict';

  var ERS = window.ERS;
  if (!ERS) return;

  var REG = window.REG = {};
  var life = null;          // data/lifecycle.json
  var hardware = null;      // data/hardware.json

  /* ----------------------------------------------------------------- api */

  function api(path, opts) {
    opts = opts || {};
    var init = {
      method: opts.method || 'GET',
      credentials: 'same-origin',
      headers: { 'X-Registry-Request': '1' }
    };
    if (opts.body !== undefined) {
      init.headers['Content-Type'] = 'application/json';
      init.body = JSON.stringify(opts.body);
    }
    return fetch(ERS.url('api/registry' + path), init).then(function (r) {
      // The gate expires after a shift. Sending the operator back to sign in
      // beats letting the page quietly render nothing.
      if (r.status === 401 && !opts.noRedirect) {
        location.href = '/internal/signin.html?next=' +
          encodeURIComponent(location.pathname + location.search);
        return new Promise(function () {});
      }
      return r.json().catch(function () { return {}; }).then(function (body) {
        if (!r.ok) {
          var err = new Error(body.error || 'HTTP ' + r.status);
          err.problems = body.problems || [];
          err.status = r.status;
          throw err;
        }
        return body;
      });
    });
  }
  REG.api = api;

  function tables() {
    if (life && hardware) return Promise.resolve();
    return Promise.all([ERS.data('lifecycle'), ERS.data('hardware')]).then(function (d) {
      life = d[0];
      hardware = d[1];
    });
  }

  /* -------------------------------------------------------------- render */

  var esc = ERS.esc;

  function state(id) {
    for (var i = 0; life && i < life.states.length; i++) {
      if (life.states[i].id === id) return life.states[i];
    }
    return { id: id, label: id, kind: 'neutral', to: [] };
  }

  function eventLabel(id) {
    for (var i = 0; life && i < life.events.length; i++) {
      if (life.events[i].id === id) return life.events[i].label;
    }
    return id;
  }

  function statePill(id) {
    var s = state(id);
    return '<span class="pill pill--' + s.kind + '">' + esc(s.label) + '</span>';
  }

  function when(iso) {
    if (!iso) return '—';
    var d = new Date(iso);
    return isNaN(d) ? '—' : d.toISOString().slice(0, 16).replace('T', ' ') + 'Z';
  }

  function ago(iso) {
    if (!iso) return 'never';
    var days = Math.floor((Date.now() - Date.parse(iso)) / 864e5);
    if (days < 1) return 'today';
    if (days === 1) return 'yesterday';
    if (days < 60) return days + ' days ago';
    return Math.round(days / 30.44) + ' months ago';
  }

  /** The interval meter. One glance answers "is this leg due?". */
  function meter(leg) {
    var pct = Math.min(Math.round((leg.interval_fraction || 0) * 100), 100);
    var kind = leg.due ? 'dispatch' : leg.due_soon ? 'flag' : 'self';
    return '<span class="meter" title="' + esc(leg.hours_since_service + ' h since the last closed service record') + '">' +
      '<span class="meter__track"><span class="meter__fill meter__fill--' + kind + '" style="width:' + pct + '%"></span></span>' +
      '<b class="mono">' + esc(leg.hours_since_service) + '</b></span>';
  }

  function fail(el, err) {
    if (!el) return;
    el.hidden = false;
    el.innerHTML = '<div class="note note--crit"><p class="note__title">' + esc(err.message) + '</p>' +
      (err.problems && err.problems.length
        ? '<ul>' + err.problems.map(function (p) { return '<li>' + esc(p) + '</li>'; }).join('') + '</ul>'
        : '') + '</div>';
  }
  REG.fail = fail;

  function note(el, kind, title, body) {
    el.hidden = false;
    el.innerHTML = '<div class="note note--' + kind + '"><p class="note__title">' + esc(title) + '</p>' +
      (body ? '<p>' + body + '</p>' : '') + '</div>';
  }

  /* ------------------------------------------------------------- sign in */

  REG.initSignIn = function (form) {
    if (!form) return;
    var out = document.getElementById('result');
    form.addEventListener('submit', function (ev) {
      ev.preventDefault();
      var btn = form.querySelector('[type=submit]');
      btn.disabled = true;
      api('/session', { method: 'POST', noRedirect: true, body: { code: form.code.value } })
        .then(function () {
          var next = ERS.query().next || '/internal/';
          // Only ever return to a path on this site.
          location.href = /^\/internal\//.test(next) ? next : '/internal/';
        })
        .catch(function (err) {
          btn.disabled = false;
          fail(out, err);
          form.code.value = '';
          form.code.focus();
        });
    });
  };

  /* ------------------------------------------------------------- console */

  REG.initConsole = function (root) {
    if (!root) return;
    var listEl = root.querySelector('[data-legs]');
    var filters = root.querySelector('[data-filters]');
    var errEl = root.querySelector('[data-error]');

    tables().then(function () {
      // The state filter is built from lifecycle.json, so a state added there
      // appears here without touching this file.
      var sel = filters.querySelector('[name=state]');
      life.states.forEach(function (s) {
        var o = document.createElement('option');
        o.value = s.id;
        o.textContent = s.label;
        sel.appendChild(o);
      });
      var vsel = filters.querySelector('[name=variant]');
      hardware.legVariants.forEach(function (v) {
        var o = document.createElement('option');
        o.value = v.id;
        o.textContent = v.id + ' — ' + v.name;
        vsel.appendChild(o);
      });
      loadSummary();
      loadLegs();
    });

    var timer = null;
    filters.addEventListener('input', function () {
      clearTimeout(timer);
      timer = setTimeout(loadLegs, 200);
    });
    filters.addEventListener('submit', function (ev) { ev.preventDefault(); loadLegs(); });

    function query() {
      var f = new FormData(filters);
      var p = new URLSearchParams();
      ['q', 'state', 'variant'].forEach(function (k) { if (f.get(k)) p.set(k, f.get(k)); });
      ['flagged', 'due', 'stale'].forEach(function (k) { if (f.get(k)) p.set(k, '1'); });
      return p.toString() ? '?' + p.toString() : '';
    }

    function loadSummary() {
      api('/summary').then(function (s) {
        put('[data-k=fleet]', s.fleet);
        put('[data-k=pool]', (s.byState && s.byState.pool) || 0);
        put('[data-k=field]', ((s.byState && s.byState.deployed) || 0) + ((s.byState && s.byState.transit) || 0));
        put('[data-k=flagged]', s.flagged);
        put('[data-k=due]', s.due);
        put('[data-k=unmatched]', s.unmatchedIntake);

        var dist = root.querySelector('[data-distribution]');
        if (dist) {
          var total = s.fleet || 1;
          dist.innerHTML = life.states.map(function (st) {
            var n = (s.byState && s.byState[st.id]) || 0;
            if (!n) return '';
            return '<div class="chartrow">' +
              '<span class="chartrow__k">' + esc(st.label) + '<span class="chartrow__sub">' + esc(st.short) + '</span></span>' +
              '<span class="chartrow__track"><span class="mixbar"><span class="m-' + barClass(st.kind) +
                '" style="width:' + (n / total * 100) + '%"></span></span></span>' +
              '<b class="chartrow__v mono">' + n + '</b></div>';
          }).join('') || '<p class="muted small">No legs entered yet.</p>';
        }

        var act = root.querySelector('[data-activity]');
        if (act) {
          act.innerHTML = s.recent.length
            ? '<ol class="tl tl--tight">' + s.recent.map(function (e) {
                return '<li><span class="tl__when mono">' + esc(ago(e.at)) + '</span>' +
                  '<span class="tl__what">' + esc(eventLabel(e.type)) + ' — ' +
                  '<a class="mono" href="leg.html?s=' + encodeURIComponent(e.mechanical_serial) + '">' +
                  esc(e.mechanical_serial) + '</a></span>' +
                  '<span class="tl__who muted small">' + esc(e.actor) + '</span></li>';
              }).join('') + '</ol>'
            : '<p class="muted small">Nothing recorded yet.</p>';
        }

        var orph = root.querySelector('[data-orphans]');
        if (orph && s.unmatchedIntake) loadOrphans(orph);
      }).catch(function (err) { fail(errEl, err); });
    }

    // The site's three route colours carry meaning everywhere else, so the
    // state bars borrow them rather than inventing a fourth palette.
    function barClass(kind) {
      return kind === 'crit' ? 'dispatch' : kind === 'warn' ? 'flag' : 'self';
    }

    function put(sel, v) {
      var el = root.querySelector(sel);
      if (el) el.textContent = v;
    }

    function loadOrphans(el) {
      api('/orphans').then(function (d) {
        if (!d.orphans.length) return;
        el.hidden = false;
        el.querySelector('[data-orphan-body]').innerHTML =
          '<div class="table-scroll"><table class="tbl"><thead><tr>' +
          '<th scope="col">Reference</th><th scope="col">Filed against</th><th scope="col">Kind</th>' +
          '<th scope="col">Code</th><th scope="col">When</th><th scope="col"></th></tr></thead><tbody>' +
          d.orphans.map(function (o) {
            return '<tr><td class="mono">' + esc(o.reference) + '</td>' +
              '<td class="mono">' + esc(o.serial) + '<span class="tbl__sub">' + esc(o.identity) + '</span></td>' +
              '<td>' + esc(o.kind) + '</td><td class="mono">' + esc(o.fault_code || '—') + '</td>' +
              '<td class="mono">' + esc(ago(o.at)) + '</td>' +
              '<td><a class="btn btn--sm" href="intake.html?' +
                (o.identity === 'mechanical' ? 'mx=' : 'el=') + encodeURIComponent(o.serial) +
                '">Enter this leg</a></td></tr>';
          }).join('') + '</tbody></table></div>';
      });
    }

    function loadLegs() {
      listEl.setAttribute('aria-busy', 'true');
      api('/legs' + query()).then(function (d) {
        listEl.removeAttribute('aria-busy');
        var count = root.querySelector('[data-count]');
        if (count) count.textContent = d.total + (d.total === 1 ? ' leg' : ' legs');
        if (!d.legs.length) {
          listEl.innerHTML = '<p class="muted">No leg matches that. ' +
            '<a href="intake.html">Enter a leg</a> or clear the filters.</p>';
          return;
        }
        listEl.innerHTML = '<div class="table-scroll"><table class="tbl"><thead><tr>' +
          '<th scope="col">Mechanical</th><th scope="col">Electronics</th><th scope="col">Variant</th>' +
          '<th scope="col">State</th><th scope="col">Held by</th>' +
          '<th scope="col">Hours since service</th><th scope="col">Flag</th></tr></thead><tbody>' +
          d.legs.map(row).join('') + '</tbody></table></div>' +
          (d.total > d.legs.length
            ? '<p class="small muted mt-0">Showing ' + d.legs.length + ' of ' + d.total +
              '. Narrow the filters, or <a href="' + ERS.url('api/registry/export') + '">export the lot as CSV</a>.</p>'
            : '');
      }).catch(function (err) {
        listEl.removeAttribute('aria-busy');
        fail(errEl, err);
      });
    }

    function row(leg) {
      return '<tr' + (leg.flag_code ? ' class="tbl__row--flagged"' : '') + '>' +
        '<th scope="row" class="mono"><a href="leg.html?s=' + encodeURIComponent(leg.mechanical_serial) + '">' +
          esc(leg.mechanical_serial) + '</a>' +
          (leg.stale ? '<span class="tbl__sub">not seen ' + esc(ago(leg.last_seen_at)) + '</span>' : '') + '</th>' +
        '<td class="mono">' + esc(leg.electronics_serial || '—') + '</td>' +
        '<td class="mono">' + esc(leg.variant) + '</td>' +
        '<td>' + statePill(leg.state) + (leg.stage ? '<span class="tbl__sub">' + esc(leg.stage) + '</span>' : '') + '</td>' +
        '<td>' + esc(leg.holder || '—') + '</td>' +
        '<td>' + meter(leg) + '</td>' +
        '<td class="mono">' + (leg.flag_code
          ? '<span class="pill pill--warn">' + esc(leg.flag_code) + '</span>'
          : '<span class="muted">—</span>') + '</td></tr>';
    }
  };

  /* ------------------------------------------------------------ one leg */

  REG.initLeg = function (root) {
    if (!root) return;
    var serial = (ERS.query().s || '').toUpperCase();
    var errEl = root.querySelector('[data-error]');
    var current = null;

    if (!serial) {
      fail(errEl, new Error('No leg named. Open one from the fleet list.'));
      return;
    }

    tables().then(function () { load(); });

    function load() {
      api('/legs/' + encodeURIComponent(serial)).then(paint).catch(function (err) { fail(errEl, err); });
    }

    function paint(d) {
      current = d.leg;
      var leg = d.leg;
      root.querySelectorAll('[data-leg-serial]').forEach(function (el) { el.textContent = leg.mechanical_serial; });
      document.title = leg.mechanical_serial + ' — EREKTOR Registry';

      set('[data-f=state]', statePill(leg.state) + (leg.stage ? ' <span class="muted small">' + esc(leg.stage) + '</span>' : ''));
      set('[data-f=electronics]', leg.electronics_serial
        ? '<b class="mono">' + esc(leg.electronics_serial) + '</b>'
        : '<span class="muted">not bound</span>');
      txt('[data-f=variant]', leg.variant);
      txt('[data-f=controller]', leg.controller || '—');
      txt('[data-f=firmware]', leg.firmware || '—');
      txt('[data-f=holder]', leg.holder || '—');
      txt('[data-f=location]', leg.location || '—');
      txt('[data-f=batch]', leg.batch || '—');
      txt('[data-f=hours]', leg.motor_hours);
      txt('[data-f=built]', when(leg.built_at));
      txt('[data-f=service]', leg.last_service_at ? when(leg.last_service_at) : 'never closed');
      txt('[data-f=seen]', ago(leg.last_seen_at));
      set('[data-f=interval]', meter(leg) + ' <span class="muted small">of ' + life.intervals.motorHours + ' h</span>');

      var banner = root.querySelector('[data-flag]');
      if (leg.flag_code) {
        note(banner, 'warn', 'Open flag: ' + leg.flag_code,
          'Raised ' + esc(ago(leg.flag_raised_at)) +
          (leg.flag_reference ? ' as <code>' + esc(leg.flag_reference) + '</code>' : '') +
          '. Inspection reads this off the frame and diverts the leg out of the line. ' +
          'It clears when a service record is closed against ' + esc(leg.mechanical_serial) + '.');
      } else if (leg.due) {
        note(banner, 'warn', 'At its service interval',
          esc(leg.hours_since_service) + ' motor-hours since the last closed record. ' +
          'This raises <code>' + esc(life.intervals.raises) + '</code>, which is a flag, not a dispatch.');
      } else if (leg.stale) {
        note(banner, 'info', 'No recent contact',
          'Nothing recorded against this leg since ' + esc(ago(leg.last_seen_at)) + '. If a facility ' +
          'believes it holds this leg, reconcile it before anyone claims it into a session ' +
          '(<code>' + esc(life.reconciliation.raises) + '</code>).');
      } else {
        banner.hidden = true;
      }

      buildActions(leg);
      fillMeta(leg);

      var tl = root.querySelector('[data-timeline]');
      tl.innerHTML = d.events.length
        ? '<ol class="tl">' + d.events.map(function (e) {
            return '<li>' +
              '<span class="tl__when mono" title="' + esc(when(e.at)) + '">' + esc(ago(e.at)) + '</span>' +
              '<span class="tl__what"><b>' + esc(eventLabel(e.type)) + '</b>' +
                (e.to_state ? ' → ' + statePill(e.to_state) : '') +
                (e.fault_code ? ' <span class="pill pill--warn">' + esc(e.fault_code) + '</span>' : '') +
                (e.reference ? ' <code>' + esc(e.reference) + '</code>' : '') +
                (e.hours != null ? ' <span class="muted small">' + esc(e.hours) + ' h</span>' : '') +
                (e.electronics_serial ? '<span class="tl__sub mono">' + esc(e.electronics_serial) + '</span>' : '') +
                (e.detail ? '<span class="tl__sub">' + esc(e.detail) + '</span>' : '') +
              '</span>' +
              '<span class="tl__who muted small">' + esc(e.actor) + '</span></li>';
          }).join('') + '</ol>'
        : '<p class="muted">Nothing recorded yet.</p>';
    }

    function set(sel, html) { var el = root.querySelector(sel); if (el) el.innerHTML = html; }
    function txt(sel, v) { var el = root.querySelector(sel); if (el) el.textContent = v; }

    /* The event form. Which fields it shows follows from the event type and
       from lifecycle.json, so it can never offer a move the API will refuse. */
    function buildActions(leg) {
      var form = root.querySelector('[data-event-form]');
      if (!form) return;
      var sel = form.querySelector('[name=type]');
      var allowed = state(leg.state).to;

      sel.innerHTML = '';
      life.events.forEach(function (e) {
        // Hide an event whose implied state this leg cannot reach from here.
        if (e.sets && e.sets !== leg.state && allowed.indexOf(e.sets) === -1) return;
        var o = document.createElement('option');
        o.value = e.id;
        o.textContent = e.label + (e.sets ? ' → ' + state(e.sets).label : '');
        sel.appendChild(o);
      });

      var stageSel = form.querySelector('[name=stage]');
      if (stageSel && !stageSel.options.length) {
        state('line').stages.forEach(function (s) {
          var o = document.createElement('option');
          o.value = s;
          o.textContent = s;
          stageSel.appendChild(o);
        });
      }

      function sync() {
        var id = sel.value;
        var spec = null;
        life.events.forEach(function (e) { if (e.id === id) spec = e; });
        show(form, '[data-when=binds]', !!(spec && spec.binds));
        show(form, '[data-when=flag]', id === 'flag-raised');
        show(form, '[data-when=stage]', id === 'check-in' || id === 'stage');
        show(form, '[data-when=move]', id === 'moved' || id === 'delivered' || id === 'assigned');
        var hint = form.querySelector('[data-event-note]');
        if (hint) {
          hint.textContent = (spec && spec.note) || '';
          hint.hidden = !(spec && spec.note);
        }
      }
      sel.addEventListener('change', sync);
      sync();

      if (!form.dataset.bound) {
        form.dataset.bound = '1';
        form.addEventListener('submit', function (ev) {
          ev.preventDefault();
          var body = {};
          new FormData(form).forEach(function (v, k) { if (v !== '') body[k] = v; });
          var btn = form.querySelector('[type=submit]');
          btn.disabled = true;
          api('/legs/' + encodeURIComponent(current.mechanical_serial) + '/events', { method: 'POST', body: body })
            .then(function (d) {
              btn.disabled = false;
              form.reset();
              errEl.hidden = true;
              paint(d);
            })
            .catch(function (err) { btn.disabled = false; fail(errEl, err); });
        });
      }
    }

    function show(scope, sel, on) {
      scope.querySelectorAll(sel).forEach(function (el) {
        el.hidden = !on;
        el.querySelectorAll('input, select, textarea').forEach(function (f) { f.disabled = !on; });
      });
    }

    function fillMeta(leg) {
      var form = root.querySelector('[data-meta-form]');
      if (!form) return;
      ['variant', 'controller', 'firmware', 'holder', 'location', 'batch', 'notes'].forEach(function (k) {
        if (form[k]) form[k].value = leg[k] == null ? '' : leg[k];
      });
      if (!form.dataset.bound) {
        form.dataset.bound = '1';
        form.addEventListener('submit', function (ev) {
          ev.preventDefault();
          var body = {};
          new FormData(form).forEach(function (v, k) { body[k] = v; });
          api('/legs/' + encodeURIComponent(current.mechanical_serial), { method: 'PATCH', body: body })
            .then(function () { load(); })
            .catch(function (err) { fail(errEl, err); });
        });
      }
    }
  };

  /* -------------------------------------------------------------- intake */

  REG.initIntake = function (root) {
    if (!root) return;
    var form = root.querySelector('[data-intake-form]');
    var preview = root.querySelector('[data-preview]');
    var out = root.querySelector('[data-error]');
    var rows = [];

    tables().then(function () {
      var sel = form.querySelector('[name=variant]');
      hardware.legVariants.forEach(function (v) {
        var o = document.createElement('option');
        o.value = v.id;
        o.textContent = v.id + ' — ' + v.name + (v.status === 'legacy' ? ' (legacy)' : '');
        o.dataset.controller = v.controller;
        sel.appendChild(o);
      });
      sel.addEventListener('change', function () {
        var o = sel.selectedOptions[0];
        var ctl = form.querySelector('[name=controller]');
        if (o && o.dataset.controller) ctl.value = o.dataset.controller;
      });

      // Arriving from an unmatched field request: the serial it was filed
      // against is prefilled so entering the leg closes that queue entry.
      var q = ERS.query();
      if (q.mx) form.querySelector('[name=mechanical_serial]').value = q.mx.toUpperCase();
      if (q.el) form.querySelector('[name=electronics_serial]').value = q.el.toUpperCase();
      if (q.mx || q.el) {
        note(out, 'info', 'Entering a leg a field request could not find',
          'A flag or dispatch was filed against this serial before the leg was in the registry. ' +
          'Entering it here gives that request somewhere to land.');
      }
    });

    /* Batch entry. A work order is a run of consecutive frames, so the common
       case is a prefix and a count rather than fifty typed serials. Nothing is
       sent until the operator has read the list back. */
    var batch = root.querySelector('[data-batch]');
    if (batch) {
      batch.addEventListener('input', renderPreview);
      batch.addEventListener('submit', function (ev) { ev.preventDefault(); renderPreview(); });
    }

    function generate() {
      var f = new FormData(batch);
      var first = String(f.get('first') || '').trim().toUpperCase();
      var count = Math.min(Math.max(parseInt(f.get('count'), 10) || 0, 0), 200);
      var m = /^MX-(\d{2})-(\d{5})$/.exec(first);
      if (!m || !count) return [];
      var out = [];
      for (var i = 0; i < count; i++) {
        var n = parseInt(m[2], 10) + i;
        if (n > 99999) break;
        out.push('MX-' + m[1] + '-' + String(n).padStart(5, '0'));
      }
      return out;
    }

    function renderPreview() {
      rows = generate();
      var f = new FormData(batch);
      if (!rows.length) {
        preview.innerHTML = '<p class="muted small">Give the first mechanical serial and how many frames the run covers.</p>';
        return;
      }
      preview.innerHTML = '<p class="small">' + rows.length + ' frames, <b class="mono">' + esc(rows[0]) +
        '</b> through <b class="mono">' + esc(rows[rows.length - 1]) + '</b>, as ' +
        '<b class="mono">' + esc(f.get('variant') || '—') + '</b>' +
        (f.get('batch') ? ' on work order <b class="mono">' + esc(f.get('batch')) + '</b>' : '') + '.</p>' +
        '<p class="small muted">They enter as <b>Built</b> — a frame with no ClearCore bound has no ' +
        'operational identity yet. Commission each one as its electronics go in.</p>' +
        '<div class="btn-row"><button type="button" class="btn btn--primary" data-batch-go>Enter ' +
        rows.length + ' frames</button></div>';
      preview.querySelector('[data-batch-go]').addEventListener('click', sendBatch);
    }

    function sendBatch(ev) {
      var f = new FormData(batch);
      ev.target.disabled = true;
      api('/legs', {
        method: 'POST',
        body: {
          legs: rows.map(function (mx) {
            return {
              mechanical_serial: mx,
              variant: f.get('variant'),
              controller: f.get('controller') || null,
              batch: f.get('batch') || null,
              state: 'built'
            };
          })
        }
      }).then(function (d) {
        note(out, 'ok', d.entered + ' frames entered',
          'They are in the registry as <b>Built</b>. Open one to commission it: ' +
          '<a class="mono" href="leg.html?s=' + encodeURIComponent(d.serials[0]) + '">' + esc(d.serials[0]) + '</a>.');
        batch.reset();
        preview.innerHTML = '';
      }).catch(function (err) {
        ev.target.disabled = false;
        fail(out, err);
      });
    }

    if (form) {
      form.addEventListener('submit', function (ev) {
        ev.preventDefault();
        if (!form.reportValidity()) return;
        var body = {};
        new FormData(form).forEach(function (v, k) { if (v !== '') body[k] = v; });
        var btn = form.querySelector('[type=submit]');
        btn.disabled = true;
        api('/legs', { method: 'POST', body: body })
          .then(function (d) {
            btn.disabled = false;
            var mx = d.serials[0];
            note(out, 'ok', mx + ' entered',
              '<a class="mono" href="leg.html?s=' + encodeURIComponent(mx) + '">Open the record</a> ' +
              'to record what happens to it next.');
            form.reset();
          })
          .catch(function (err) { btn.disabled = false; fail(out, err); });
      });
    }
  };

  /* --------------------------------------------------------- sign out */

  REG.initBar = function (bar) {
    if (!bar) return;
    var btn = bar.querySelector('[data-signout]');
    if (btn) btn.addEventListener('click', function () {
      api('/session', { method: 'DELETE', noRedirect: true })
        .catch(function () {})
        .then(function () { location.href = '/internal/signin.html'; });
    });
  };

  /* ------------------------------------------------------------- boot */
  document.addEventListener('DOMContentLoaded', function () {
    REG.initBar(document.querySelector('[data-regbar]'));
    REG.initSignIn(document.querySelector('[data-signin]'));
    REG.initConsole(document.querySelector('[data-console]'));
    REG.initLeg(document.querySelector('[data-leg]'));
    REG.initIntake(document.querySelector('[data-intake]'));
  });
})();
