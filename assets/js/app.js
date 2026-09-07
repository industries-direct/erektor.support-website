/* ==========================================================================
   EREKTOR Support — shared behaviour

   Progressive enhancement only. Every page reads without JavaScript and every
   form still produces something the operator can send by hand if the intake
   API is unreachable, because a leg that cannot finish its session is not a
   good time to discover the portal ate the request.
   ========================================================================== */
(function () {
  'use strict';

  // Site root, derived from this script's own URL, so pages at / and /docs/
  // resolve data files identically.
  var BASE = (function () {
    var s = document.currentScript && document.currentScript.src;
    return s ? s.replace(/assets\/js\/app\.js.*$/, '') : '/';
  })();

  var ERS = window.ERS = {
    base: BASE,
    url: function (p) { return BASE + String(p).replace(/^\//, ''); }
  };

  ERS.esc = function (s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  };
  ERS.bytes = function (n) {
    if (n == null) return '—';
    var u = ['B', 'KB', 'MB', 'GB'], i = 0;
    while (n >= 1024 && i < u.length - 1) { n /= 1024; i++; }
    return (i ? n.toFixed(1) : n) + ' ' + u[i];
  };
  ERS.query = function () {
    var out = {};
    new URLSearchParams(location.search).forEach(function (v, k) { out[k] = v; });
    return out;
  };

  /* ------------------------------------------------------------ theme */
  var root = document.documentElement;
  function currentTheme() {
    return root.getAttribute('data-theme') ||
      (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
  }
  try {
    var saved = localStorage.getItem('ers.theme');
    if (saved) root.setAttribute('data-theme', saved);
  } catch (e) { /* private mode */ }

  document.addEventListener('click', function (ev) {
    var b = ev.target.closest('.themebtn');
    if (!b) return;
    var next = currentTheme() === 'dark' ? 'light' : 'dark';
    root.setAttribute('data-theme', next);
    try { localStorage.setItem('ers.theme', next); } catch (e) {}
  });

  /* ------------------------------------------------------- data loading */
  var cache = {};
  ERS.data = function (name) {
    if (!cache[name]) {
      cache[name] = fetch(ERS.url('data/' + name + '.json'), { cache: 'no-cache' })
        .then(function (r) {
          if (!r.ok) throw new Error(name + ': HTTP ' + r.status);
          return r.json();
        })
        .catch(function (err) {
          console.warn('[ERS] could not load', name, err);
          return null;
        });
    }
    return cache[name];
  };

  /* ----------------------------------------------------------- storage */
  // Technicians re-key the same serials all day. Remembered locally only;
  // never sent anywhere but the request the operator submits themselves.
  function recall(k) { try { return localStorage.getItem('ers.' + k) || ''; } catch (e) { return ''; } }
  function remember(k, v) { try { v ? localStorage.setItem('ers.' + k, v) : localStorage.removeItem('ers.' + k); } catch (e) {} }

  /* ------------------------------------------------------ leg identity */
  // A leg carries two serials and they are not interchangeable. Firmware and
  // pairing follow the electronics serial; wear, warranty and service
  // intervals follow the stamped mechanical serial. Each form asks for the
  // one its request is actually filed against, and validates that shape.
  var formats = null;

  ERS.initSerialFields = function (root) {
    root = root || document;
    var fields = root.querySelectorAll('[data-serial]');
    if (!fields.length) return;

    ERS.data('hardware').then(function (hw) {
      if (!hw) return;
      formats = hw.serialFormats;
      fields.forEach(function (el) {
        var spec = formats[el.dataset.serial];
        if (!spec) return;
        el.setAttribute('pattern', spec.pattern.replace(/^\^|\$$/g, ''));
        el.setAttribute('placeholder', spec.example);
        el.setAttribute('inputmode', 'text');
        el.setAttribute('autocapitalize', 'characters');
        el.setAttribute('spellcheck', 'false');
        var stored = recall('serial.' + el.dataset.serial);
        if (!el.value && stored) el.value = stored;
      });
    });

    fields.forEach(function (el) {
      el.addEventListener('blur', function () {
        el.value = el.value.trim().toUpperCase();
        if (validateSerial(el) && el.value) remember('serial.' + el.dataset.serial, el.value);
      });
      el.addEventListener('input', function () {
        if (el.getAttribute('aria-invalid') === 'true') validateSerial(el);
      });
    });
  };

  function validateSerial(el) {
    var spec = formats && formats[el.dataset.serial];
    var msg = el.parentNode.querySelector('[data-serial-err]');
    if (!spec || !el.value) {
      el.removeAttribute('aria-invalid');
      if (msg) msg.hidden = true;
      return true;
    }
    var ok = new RegExp(spec.pattern).test(el.value.trim().toUpperCase());
    el.setAttribute('aria-invalid', ok ? 'false' : 'true');
    if (msg) {
      msg.hidden = ok;
      if (!ok) msg.textContent = spec.label + ' should look like ' + spec.example + '.';
    }
    return ok;
  }

  /* --------------------------------------------------- leg variant list */
  ERS.initVariantFields = function (root) {
    var sel = (root || document).querySelector('[data-leg-variant]');
    if (!sel) return;
    ERS.data('hardware').then(function (hw) {
      if (!hw) return;
      hw.legVariants.forEach(function (v) {
        var o = document.createElement('option');
        o.value = v.id;
        o.textContent = v.name + (v.status === 'legacy' ? ' — legacy' : '');
        o.dataset.controller = v.controller;
        sel.appendChild(o);
      });
      var out = (root || document).querySelector('[data-controller-out]');
      if (out) {
        var sync = function () {
          var o = sel.selectedOptions[0];
          out.textContent = (o && o.dataset.controller) || '—';
        };
        sel.addEventListener('change', sync);
        sync();
      }
    });
  };

  /* ---------------------------------------------------- fault triage */
  // The router: a code decides which of the three service routes the operator
  // takes, and carries itself into whichever form that turns out to be.
  ERS.initTriage = function (mount) {
    if (!mount) return;
    var input = mount.querySelector('[data-triage-input]');
    var out = mount.querySelector('[data-triage-out]');
    var list = mount.querySelector('[data-triage-list]');

    ERS.data('faults').then(function (f) {
      if (!f) {
        if (out) out.innerHTML = '<p class="muted">Fault table unavailable. Use the code index below.</p>';
        return;
      }
      if (list) renderList(f, list);
      if (!input || !out) return;

      var run = function () {
        var q = input.value.trim().toUpperCase();
        if (!q) { out.innerHTML = ''; out.hidden = true; return; }
        var hits = f.codes.filter(function (c) {
          return c.code.indexOf(q) === 0 || c.title.toUpperCase().indexOf(q) > -1;
        }).slice(0, 5);
        out.hidden = false;
        out.innerHTML = hits.length
          ? hits.map(function (c) { return card(f, c); }).join('')
          : '<div class="note note--info"><p class="note__title">No match for <code>' + ERS.esc(q) + '</code></p>' +
            '<p>Check the code on the session controller. If the leg cannot finish its session, ' +
            '<a href="' + ERS.url('dispatch.html') + '">request a replacement</a> without waiting for a code.</p></div>';
      };
      input.addEventListener('input', run);

      // A code can be linked to directly, e.g. from a printed label or a
      // controller screen: /docs/faults.html?code=LFT-45
      var q = ERS.query();
      if (q.code) { input.value = q.code; run(); }
    });

    function severityPill(sev) {
      var map = { critical: ['crit', 'Critical'], warning: ['warn', 'Warning'], info: ['info', 'Info'] };
      var m = map[sev] || ['flat', sev];
      return '<span class="pill pill--' + m[0] + '">' + m[1] + '</span>';
    }

    function routeAction(f, c) {
      var r = f.routes[c.route];
      if (c.route === 'self') {
        return '<a class="btn" href="' + ERS.url(c.doc) + '">Open the procedure</a>';
      }
      var href = ERS.url(r.target) + '?code=' + encodeURIComponent(c.code);
      var label = c.route === 'dispatch' ? 'Request a replacement leg' : 'Flag this leg for ERS';
      return '<a class="btn btn--primary" href="' + href + '">' + label + '</a>' +
             '<a class="btn" href="' + ERS.url(c.doc) + '">Read more</a>';
    }

    function card(f, c) {
      var r = f.routes[c.route];
      var cls = c.route === 'dispatch' ? 'note--crit' : (c.route === 'flag' ? 'note--warn' : 'note--info');
      return '<div class="note ' + cls + '">' +
        '<p class="note__title"><code>' + ERS.esc(c.code) + '</code> · ' + ERS.esc(c.title) + ' ' + severityPill(c.severity) + '</p>' +
        '<p>' + ERS.esc(c.meaning) + '</p>' +
        '<p><b>' + ERS.esc(r.label) + '.</b> ' + ERS.esc(r.action) + '</p>' +
        '<p class="small muted">' + ERS.esc(c.remedy) + '</p>' +
        '<div class="btn-row">' + routeAction(f, c) + '</div>' +
      '</div>';
    }

    function renderList(f, el) {
      var rows = f.codes.map(function (c) {
        var r = f.routes[c.route];
        var pill = c.route === 'dispatch' ? 'crit' : (c.route === 'flag' ? 'warn' : 'ok');
        return '<tr>' +
          '<td class="mono"><a href="?code=' + encodeURIComponent(c.code) + '">' + ERS.esc(c.code) + '</a></td>' +
          '<td>' + ERS.esc(c.title) + '</td>' +
          '<td>' + severityPill(c.severity) + '</td>' +
          '<td><span class="pill pill--' + pill + '">' + ERS.esc(r.short) + '</span></td>' +
        '</tr>';
      }).join('');
      el.innerHTML =
        '<div class="table-scroll"><table>' +
        '<thead><tr><th>Code</th><th>Fault</th><th>Severity</th><th>Route</th></tr></thead>' +
        '<tbody>' + rows + '</tbody></table></div>';
    }
  };

  /* --------------------------------------------------- firmware table */
  ERS.initFirmware = function (mount) {
    if (!mount) return;
    ERS.data('firmware').then(function (fw) {
      if (!fw) { mount.innerHTML = '<p class="muted">Manifest unavailable.</p>'; return; }
      var rows = fw.releases.map(function (r) {
        var chan = r.channel === 'stable' ? 'ok' : (r.channel === 'beta' ? 'warn' : 'flat');
        var where = { dock: 'At next dock', idle: 'When idle', ers: 'At ERS only' }[r.appliesAt] || r.appliesAt;
        if (r.delivery === 'cable') where += ' (by cable)';
        return '<tr>' +
          '<td>' + ERS.esc(r.targetLabel) + '<br><span class="mono muted">' + ERS.esc(r.target) + '</span></td>' +
          '<td class="mono">' + ERS.esc(r.version) + '</td>' +
          '<td><span class="pill pill--' + chan + '">' + ERS.esc(fw.channels[r.channel].label) + '</span></td>' +
          '<td class="mono">' + ERS.esc(r.released) + '</td>' +
          '<td>' + ERS.esc(where) + '<br><span class="mono muted">~' + r.estimatedMinutes + ' min · ' + ERS.bytes(r.sizeBytes) + '</span></td>' +
        '</tr>';
      }).join('');
      var notes = fw.releases.map(function (r) {
        return '<details><summary>' + ERS.esc(r.targetLabel) + ' ' + ERS.esc(r.version) + '</summary>' +
          '<div class="details__body"><ul>' +
          r.notes.map(function (n) { return '<li>' + ERS.esc(n) + '</li>'; }).join('') +
          '</ul><p class="mono small muted">Minimum current version ' + ERS.esc(r.minVersion) +
          ' · SHA-256 ' + ERS.esc(r.sha256.slice(0, 16)) + '…</p></div></details>';
      }).join('');
      mount.innerHTML =
        '<div class="table-scroll"><table>' +
        '<thead><tr><th>Target</th><th>Version</th><th>Channel</th><th>Released</th><th>Applies</th></tr></thead>' +
        '<tbody>' + rows + '</tbody></table></div>' +
        '<h3>Release notes</h3>' + notes;
    });
  };

  /* ------------------------------------------------------ form intake */
  ERS.initForm = function (form) {
    if (!form) return;
    var out = document.getElementById(form.dataset.result || 'result');
    var kind = form.dataset.kind;
    var prefix = kind === 'dispatch' ? 'DSP' : 'FLG';

    // A code arriving from the triage router prefills and explains itself.
    var q = ERS.query();
    if (q.code) {
      var codeField = form.querySelector('[name=fault_code]');
      if (codeField) codeField.value = q.code.toUpperCase();
    }

    form.addEventListener('submit', function (ev) {
      ev.preventDefault();

      var bad = false;
      form.querySelectorAll('[data-serial]').forEach(function (el) {
        if (!validateSerial(el)) { if (!bad) el.focus(); bad = true; }
      });
      if (bad || !form.reportValidity()) return;

      var btn = form.querySelector('[type=submit]');
      if (btn) { btn.disabled = true; btn.dataset.label = btn.textContent; btn.textContent = 'Submitting…'; }

      var payload = {};
      new FormData(form).forEach(function (v, k) {
        payload[k] = payload[k] === undefined ? v : [].concat(payload[k], v);
      });
      payload._kind = kind;
      payload._submittedAt = new Date().toISOString();

      form.querySelectorAll('[data-serial]').forEach(function (el) {
        if (el.value) remember('serial.' + el.dataset.serial, el.value);
      });

      fetch(ERS.url('api/requests'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
        .then(function (r) { return r.ok ? r.json() : Promise.reject(new Error('HTTP ' + r.status)); })
        .then(function (res) { render(true, res.reference, payload); })
        .catch(function (err) {
          console.warn('[ERS] intake unavailable, falling back:', err.message);
          render(false, localRef(prefix), payload);
        });

      function localRef(p) {
        var d = new Date(), pad = function (n) { return String(n).padStart(2, '0'); };
        return p + '-' + d.getUTCFullYear() + pad(d.getUTCMonth() + 1) + pad(d.getUTCDate()) + '-' +
          Math.random().toString(36).slice(2, 6).toUpperCase();
      }

      function render(online, ref, data) {
        if (btn) { btn.disabled = false; btn.textContent = btn.dataset.label; }
        if (!out) return;

        var summary = 'Reference: ' + ref + '\n' + Object.keys(data)
          .filter(function (k) { return k.charAt(0) !== '_' && data[k] !== ''; })
          .map(function (k) { return k + ': ' + [].concat(data[k]).join(', '); })
          .join('\n');

        var next = kind === 'dispatch'
          ? '<p>Dispatch confirms by the contact method you gave. Keep the failed leg isolated and out of session — it returns to check-in with the driver who brings the replacement.</p>'
          : '<p>No truck is sent. The flag rides on the leg’s record and ERS diverts it at inspection when it next comes home.</p>';

        out.hidden = false;
        out.innerHTML =
          '<div class="note ' + (online ? 'note--ok' : 'note--warn') + '">' +
            '<p class="note__title">' + (online ? 'Request received' : 'Recorded locally — send it to us') + '</p>' +
            '<p>Reference <code>' + ERS.esc(ref) + '</code>. Quote this on any call about the leg.</p>' +
            (online ? next :
              '<p>The intake service did not answer, so nothing has reached EREKTOR yet. Copy the summary below and email it, or call your regional office.</p>') +
            '<pre><code>' + ERS.esc(summary) + '</code></pre>' +
            '<div class="btn-row">' +
              '<button type="button" class="btn" data-copy>Copy summary</button>' +
              '<a class="btn" href="mailto:support@erektor.systems?subject=' +
                encodeURIComponent('[' + kind + '] ' + ref) + '&body=' + encodeURIComponent(summary) + '">Email it</a>' +
              '<button type="button" class="btn" data-print>Print</button>' +
            '</div>' +
          '</div>';

        var copy = out.querySelector('[data-copy]');
        if (copy) copy.addEventListener('click', function () {
          navigator.clipboard.writeText(summary).then(function () {
            copy.textContent = 'Copied';
            setTimeout(function () { copy.textContent = 'Copy summary'; }, 2000);
          });
        });
        var pr = out.querySelector('[data-print]');
        if (pr) pr.addEventListener('click', function () { window.print(); });

        out.setAttribute('tabindex', '-1');
        out.scrollIntoView({ behavior: 'smooth', block: 'start' });
        out.focus({ preventScroll: true });
      }
    });
  };

  /* ------------------------------------------------------------- boot */
  document.addEventListener('DOMContentLoaded', function () {
    ERS.initSerialFields(document);
    ERS.initVariantFields(document);
    ERS.initTriage(document.querySelector('[data-triage]'));
    ERS.initFirmware(document.querySelector('[data-firmware]'));
    document.querySelectorAll('form[data-kind]').forEach(ERS.initForm);
    var y = document.getElementById('year');
    if (y) y.textContent = new Date().getFullYear();
  });
})();
