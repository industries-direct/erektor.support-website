/* ==========================================================================
   ERS Support Portal — shared behaviour
   Progressive enhancement only. Every page is readable and every form is
   submittable-by-fallback with JavaScript disabled or the API unreachable.
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

  /* ----------------------------------------------------------- data loading */
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

  /* --------------------------------------------------------------- storage */
  // Technicians re-key the same unit serial all day. Remember it locally;
  // it never leaves the browser.
  var REMEMBER = 'ers.unit';
  ERS.recallUnit = function () {
    try { return localStorage.getItem(REMEMBER) || ''; } catch (e) { return ''; }
  };
  ERS.rememberUnit = function (v) {
    try { v ? localStorage.setItem(REMEMBER, v) : localStorage.removeItem(REMEMBER); }
    catch (e) { /* private mode — non-fatal */ }
  };

  /* ------------------------------------------------------------ formatting */
  ERS.esc = function (s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  };

  ERS.bytes = function (n) {
    if (!n && n !== 0) return '—';
    var u = ['B', 'KB', 'MB', 'GB'], i = 0;
    while (n >= 1024 && i < u.length - 1) { n /= 1024; i++; }
    return (i ? n.toFixed(1) : n) + ' ' + u[i];
  };

  ERS.query = function () {
    var out = {};
    new URLSearchParams(location.search).forEach(function (v, k) { out[k] = v; });
    return out;
  };

  // Locally generated reference, used when the intake API is unreachable so
  // the operator still has something to quote on the phone.
  ERS.localRef = function (prefix) {
    var d = new Date();
    var pad = function (n) { return String(n).padStart(2, '0'); };
    var rand = Math.random().toString(36).slice(2, 6).toUpperCase();
    return prefix + '-' + d.getUTCFullYear() + pad(d.getUTCMonth() + 1) + pad(d.getUTCDate()) + '-' + rand;
  };

  /* ---------------------------------------------------- unit serial + model */
  ERS.serialRe = null;

  ERS.initUnitFields = function (root) {
    root = root || document;
    var serial = root.querySelector('[data-unit-serial]');
    var modelSel = root.querySelector('[data-unit-model]');
    var legSel = root.querySelector('[data-leg-position]');

    ERS.data('models').then(function (m) {
      if (!m) return;

      if (m.serialFormat && m.serialFormat.pattern) {
        ERS.serialRe = new RegExp(m.serialFormat.pattern);
        if (serial) {
          serial.setAttribute('pattern', m.serialFormat.pattern.replace(/^\^|\$$/g, ''));
          serial.setAttribute('placeholder', m.serialFormat.example || '');
        }
      }

      if (modelSel) {
        m.units.forEach(function (u) {
          var o = document.createElement('option');
          o.value = u.id;
          o.textContent = u.name + (u.status === 'legacy' ? ' — legacy' : '');
          o.dataset.legs = u.legs;
          o.dataset.legPart = u.legPart;
          o.dataset.controller = u.controller;
          modelSel.appendChild(o);
        });
        modelSel.addEventListener('change', function () { syncModel(root, modelSel, legSel); });
      }

      // A serial encodes its model. Infer it so the operator types once.
      if (serial && modelSel) {
        serial.addEventListener('input', function () {
          var id = serial.value.trim().toUpperCase().split('-').slice(0, 2).join('-');
          var direct = serial.value.trim().toUpperCase().match(/^(ER-[0-9A-Z]+)-\d{4}-\d{5}$/);
          var want = direct ? direct[1] : id;
          if (want && modelSel.value !== want &&
              Array.prototype.some.call(modelSel.options, function (o) { return o.value === want; })) {
            modelSel.value = want;
            syncModel(root, modelSel, legSel);
          }
        });
      }

      var recalled = ERS.recallUnit();
      if (serial && !serial.value && recalled) {
        serial.value = recalled;
        serial.dispatchEvent(new Event('input'));
      }
      syncModel(root, modelSel, legSel);
    });

    if (serial) {
      serial.addEventListener('blur', function () {
        serial.value = serial.value.trim().toUpperCase();
        validateSerial(serial);
        if (serial.value) ERS.rememberUnit(serial.value);
      });
    }
  };

  function validateSerial(el) {
    if (!ERS.serialRe || !el.value) { el.removeAttribute('aria-invalid'); return true; }
    var ok = ERS.serialRe.test(el.value);
    el.setAttribute('aria-invalid', ok ? 'false' : 'true');
    var msg = el.parentNode.querySelector('[data-serial-err]');
    if (msg) msg.hidden = ok;
    return ok;
  }

  // Leg count is a property of the model, so the leg selector is derived,
  // never independently entered.
  function syncModel(root, modelSel, legSel) {
    if (!modelSel || !legSel) return;
    var opt = modelSel.selectedOptions[0];
    var legs = opt && opt.dataset.legs ? parseInt(opt.dataset.legs, 10) : 0;
    var keep = legSel.value;
    legSel.innerHTML = '';
    var blank = document.createElement('option');
    blank.value = '';
    blank.textContent = legs ? 'Select leg…' : 'Select a model first';
    legSel.appendChild(blank);
    for (var i = 1; i <= legs; i++) {
      var o = document.createElement('option');
      o.value = String(i);
      o.textContent = 'Leg ' + i;
      legSel.appendChild(o);
    }
    legSel.disabled = !legs;
    if (keep) legSel.value = keep;

    var partOut = root.querySelector('[data-leg-part]');
    if (partOut) partOut.textContent = (opt && opt.dataset.legPart) || '—';
    var ctrlOut = root.querySelector('[data-controller-out]');
    if (ctrlOut) ctrlOut.textContent = (opt && opt.dataset.controller) || '—';
  }

  /* ------------------------------------------------------- form submission */
  // Forms post to the intake API. If that endpoint is absent (static preview,
  // no Pages Function bound) the request is not lost: the operator gets a
  // reference, a copyable payload, and a prefilled mail fallback.
  ERS.initForm = function (form) {
    if (!form) return;
    var out = document.getElementById(form.dataset.result || 'result');
    var kind = form.dataset.kind || 'request';
    var prefix = form.dataset.refPrefix || 'REQ';

    form.addEventListener('submit', function (ev) {
      ev.preventDefault();
      var serial = form.querySelector('[data-unit-serial]');
      if (serial && !validateSerial(serial)) { serial.focus(); return; }
      if (!form.reportValidity()) return;

      var btn = form.querySelector('[type=submit]');
      if (btn) { btn.disabled = true; btn.dataset.label = btn.textContent; btn.textContent = 'Submitting…'; }

      var payload = {};
      new FormData(form).forEach(function (v, k) {
        if (payload[k] === undefined) payload[k] = v;
        else payload[k] = [].concat(payload[k], v);
      });
      payload._kind = kind;
      payload._submittedAt = new Date().toISOString();

      if (serial && serial.value) ERS.rememberUnit(serial.value);

      fetch(ERS.url('api/requests'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
        .then(function (r) { return r.ok ? r.json() : Promise.reject(new Error('HTTP ' + r.status)); })
        .then(function (res) { render(true, res.reference || ERS.localRef(prefix), payload); })
        .catch(function (err) {
          console.warn('[ERS] intake unavailable, using offline fallback:', err.message);
          render(false, ERS.localRef(prefix), payload);
        });

      function render(online, ref, data) {
        if (btn) { btn.disabled = false; btn.textContent = btn.dataset.label; }
        if (!out) return;
        var lines = Object.keys(data)
          .filter(function (k) { return k.charAt(0) !== '_' && data[k] !== ''; })
          .map(function (k) { return k + ': ' + [].concat(data[k]).join(', '); })
          .join('\n');
        var body = 'Reference: ' + ref + '\n' + lines;

        out.hidden = false;
        out.innerHTML =
          '<div class="note ' + (online ? 'note--ok' : 'note--warn') + '">' +
            '<p class="note__title">' +
              (online ? 'Request received' : 'Request recorded locally — send it to us') +
            '</p>' +
            '<p>Reference <code>' + ERS.esc(ref) + '</code>. Quote this on any call about the unit.</p>' +
            (online
              ? '<p>Dispatch will confirm by the contact method you gave. Keep the unit isolated until then if you reported a critical code.</p>'
              : '<p>The intake service did not answer, so nothing has reached ERS yet. ' +
                'Copy the summary below and email it, or call your regional office.</p>') +
            '<pre><code>' + ERS.esc(body) + '</code></pre>' +
            '<div class="btn-row">' +
              '<button type="button" class="btn" data-copy>Copy summary</button>' +
              '<a class="btn" href="mailto:support@erektor-return.systems' +
                '?subject=' + encodeURIComponent('[' + kind + '] ' + ref) +
                '&body=' + encodeURIComponent(body) + '">Email it</a>' +
              '<button type="button" class="btn" onclick="window.print()">Print</button>' +
            '</div>' +
          '</div>';

        var copy = out.querySelector('[data-copy]');
        if (copy) copy.addEventListener('click', function () {
          navigator.clipboard.writeText(body).then(function () {
            copy.textContent = 'Copied';
            setTimeout(function () { copy.textContent = 'Copy summary'; }, 2000);
          });
        });

        out.scrollIntoView({ behavior: 'smooth', block: 'start' });
        out.setAttribute('tabindex', '-1');
        out.focus({ preventScroll: true });
      }
    });
  };

  /* ------------------------------------------------------------ boot */
  document.addEventListener('DOMContentLoaded', function () {
    ERS.initUnitFields(document);
    document.querySelectorAll('form[data-kind]').forEach(ERS.initForm);
    var y = document.getElementById('year');
    if (y) y.textContent = new Date().getFullYear();
  });
})();
