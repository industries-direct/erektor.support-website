/* ==========================================================================
   EREKTOR Manufacturing — batches, materials, timesheets, metrics

   Loaded after registry.js on the four manufacturing pages and built on REG:
   the same api() (so the same gate and the same sign-in redirect), the same
   notes. Like the registry it degrades shut — nothing is held locally, so a
   batch or a stock move either reached the ledger or it says it did not.

   Widths go through data-w and ERS.widths(): the CSP drops style="" in
   injected markup.
   ========================================================================== */
(function () {
  'use strict';

  var ERS = window.ERS;
  var REG = window.REG;
  if (!ERS || !REG) return;

  var esc = ERS.esc;
  var DAY = 864e5;

  function api(path, opts) { return REG.api('/mfg' + path, opts); }

  function num(v, digits) {
    if (v === null || v === undefined || !isFinite(v)) return '—';
    return Number(v).toLocaleString(undefined, { maximumFractionDigits: digits === undefined ? 1 : digits });
  }

  function pill(kind, label) { return '<span class="pill pill--' + kind + '">' + esc(label) + '</span>'; }

  function set(root, sel, html) {
    var el = root.querySelector(sel);
    if (el) { el.innerHTML = html; ERS.widths(el); }
  }

  function stat(root, key, v) {
    var el = root.querySelector('[data-k="' + key + '"]');
    if (el) el.textContent = v;
  }

  function formBody(form) {
    var body = {};
    new FormData(form).forEach(function (v, k) { if (v !== '') body[k] = v; });
    return body;
  }

  /** Submit a form through the API, report in its [data-result], then refresh. */
  function wire(form, send, done) {
    if (!form) return;
    var out = form.querySelector('[data-result]');
    form.addEventListener('submit', function (ev) {
      ev.preventDefault();
      if (!form.reportValidity()) return;
      var btn = form.querySelector('[type=submit]');
      btn.disabled = true;
      Promise.resolve(send(formBody(form)))
        .then(function (d) {
          btn.disabled = false;
          done(d, out);
        })
        .catch(function (err) { btn.disabled = false; REG.fail(out, err); });
    });
  }

  function table(head, rows, empty) {
    if (!rows.length) return '<p class="muted small panel__body">' + empty + '</p>';
    return '<div class="table-scroll"><table class="tbl"><thead><tr>' +
      head.map(function (h) { return '<th scope="col">' + h + '</th>'; }).join('') +
      '</tr></thead><tbody>' + rows.join('') + '</tbody></table></div>';
  }

  /* ------------------------------------------------------------- batches */

  var STAGE = {
    assembly: { label: 'Assembly', kind: 'info', next: 'qa', action: 'Move to QA' },
    qa: { label: 'QA inspection', kind: 'warn', next: 'commissioning', action: 'Move to commissioning' },
    commissioning: { label: 'Commissioning', kind: 'ok', next: 'released', action: 'Release' },
    released: { label: 'Released', kind: 'flat', next: null }
  };

  function initBatches(root) {
    if (!root) return;
    var errEl = root.querySelector('[data-error]');
    var form = document.querySelector('[data-batch-form]');
    var listEl = root.querySelector('[data-batches]');

    ERS.data('hardware').then(function (hw) {
      var sel = form.querySelector('[name=variant]');
      (hw && hw.legVariants || []).forEach(function (v) {
        if (v.status === 'legacy') return;
        var o = document.createElement('option');
        o.value = v.id;
        o.textContent = v.name + ' · ' + v.id;
        sel.appendChild(o);
      });
    });

    // Read the range back before anything is sent: a mistyped first serial is
    // twenty-four wrong records, not one.
    var rangeEl = form.querySelector('[data-range]');
    function preview() {
      var first = form.first_serial.value.trim().toUpperCase();
      var n = parseInt(form.frame_count.value, 10);
      // (side)-(version)(product)(manufacture order #): the order number counts up.
      var m = /^([LR]-V\d{1,2}[A-Z]{1,3})(\d{3})$/.exec(first);
      if (!m || !(n >= 1)) {
        rangeEl.textContent = 'Give the first serial and the frame count to see the range.';
        return;
      }
      var last = Number(m[2]) + n - 1;
      rangeEl.innerHTML = last > 999
        ? 'That range runs past manufacture order 999.'
        : 'Covers <b class="mono">' + esc(first) + ' → ' + esc(m[1]) +
          String(last).padStart(3, '0') + '</b>, ' + n + ' frame' + (n === 1 ? '' : 's') + '.';
    }
    form.addEventListener('input', preview);

    function row(b) {
      var st = STAGE[b.stage] || STAGE.assembly;
      var qa = b.qa_inspected !== null && b.qa_inspected !== undefined
        ? num(b.qa_first_pass, 0) + ' / ' + num(b.qa_inspected, 0) + ' first time'
        : '';
      var controls = '';
      if (b.stage === 'qa' || b.stage === 'commissioning') {
        controls +=
          '<span class="qa-inputs">' +
          '<label>Inspected <input type="number" class="mono" min="0" max="' + b.frame_count + '" step="1" ' +
            'data-qa-in value="' + (b.qa_inspected === null || b.qa_inspected === undefined ? '' : b.qa_inspected) + '"></label>' +
          '<label>Passed first time <input type="number" class="mono" min="0" step="1" ' +
            'data-qa-pass value="' + (b.qa_first_pass === null || b.qa_first_pass === undefined ? '' : b.qa_first_pass) + '"></label>' +
          '<button type="button" class="btn btn--sm" data-act="qa">Save QA</button></span>';
      }
      if (st.next) {
        controls += '<button type="button" class="btn btn--sm" data-act="next" data-next="' + st.next + '">' +
          esc(st.action) + '</button>';
      }
      return '<tr data-batch="' + esc(b.batch_number) + '">' +
        '<th scope="row" class="mono">' + esc(b.batch_number) +
          '<span class="tbl__sub">Started ' + esc((b.started_at || '').slice(0, 10)) +
          (b.lots ? ' · lots ' + esc(b.lots) : '') + '</span></th>' +
        '<td class="mono">' + esc(b.variant) + '</td>' +
        '<td class="mono">' + esc(b.first_serial) + '<span class="tbl__sub">' + b.frame_count + ' frames · ' +
          b.legs_entered + ' in registry</span></td>' +
        '<td>' + pill(st.kind, st.label) + (qa ? '<span class="tbl__sub">' + esc(qa) + '</span>' : '') + '</td>' +
        '<td><div class="row-actions">' + controls + '</div></td></tr>';
    }

    function load() {
      return api('/batches').then(function (d) {
        var counts = { assembly: 0, qa: 0, commissioning: 0, released: 0 };
        d.batches.forEach(function (b) { counts[b.stage] = (counts[b.stage] || 0) + 1; });
        Object.keys(counts).forEach(function (k) { stat(document, k, counts[k]); });
        var c = root.querySelector('[data-count]');
        if (c) c.textContent = d.batches.length + ' logged';
        listEl.innerHTML = table(['Batch', 'Variant', 'Serials', 'Stage', ''],
          d.batches.map(row), 'No batches logged yet. Log the first one to enter its frames.');
      }).catch(function (err) { REG.fail(errEl, err); });
    }

    listEl.addEventListener('click', function (ev) {
      var btn = ev.target.closest('[data-act]');
      if (!btn) return;
      var tr = btn.closest('[data-batch]');
      var number = tr.getAttribute('data-batch');
      var body = btn.getAttribute('data-act') === 'next'
        ? { stage: btn.getAttribute('data-next') }
        : { qa_inspected: Number(tr.querySelector('[data-qa-in]').value),
            qa_first_pass: Number(tr.querySelector('[data-qa-pass]').value) };
      btn.disabled = true;
      api('/batches/' + encodeURIComponent(number), { method: 'PATCH', body: body })
        .then(function () { errEl.hidden = true; return load(); })
        .catch(function (err) { btn.disabled = false; REG.fail(errEl, err); });
    });

    wire(form, function (body) {
      body.frame_count = Number(body.frame_count);
      return api('/batches', { method: 'POST', body: body });
    }, function (d, out) {
      REG.note(out, 'ok', d.batch_number + ' logged',
        d.serials.length + ' frames entered as Built, <span class="mono">' + esc(d.serials[0]) + ' → ' +
        esc(d.last_serial) + '</span>. ' + (d.materials_drawn
          ? d.materials_drawn + ' BOM part' + (d.materials_drawn === 1 ? '' : 's') + ' drawn from stock.'
          : 'No parts carry a per-leg quantity yet, so no stock was drawn.'));
      form.reset();
      preview();
      load();
    });

    load();
  }

  /* ----------------------------------------------------------- materials */

  var STOCK = {
    order: { kind: 'crit', label: 'Order now' },
    at: { kind: 'warn', label: 'At reorder point' },
    stocked: { kind: 'ok', label: 'Stocked' }
  };
  var PO = {
    draft: { kind: 'warn', label: 'Awaiting approval' },
    approved: { kind: 'info', label: 'Approved' },
    received: { kind: 'ok', label: 'Received' },
    cancelled: { kind: 'flat', label: 'Cancelled' }
  };

  function initMaterials(root) {
    if (!root) return;
    var errEl = root.querySelector('[data-error]');
    var orderForm = root.querySelector('[data-order-form]');
    var moveForm = root.querySelector('[data-move-form]');
    var bySku = {};

    function load() {
      return Promise.all([api('/materials'), api('/orders')]).then(function (d) {
        var mats = d[0].materials;
        var orders = d[1].orders;
        bySku = {};
        mats.forEach(function (m) { bySku[m.sku] = m; });

        stat(document, 'parts', mats.length);
        stat(document, 'order', mats.filter(function (m) { return m.status !== 'stocked'; }).length);
        stat(document, 'drafts', orders.filter(function (o) { return o.status === 'draft'; }).length);
        stat(document, 'approved', orders.filter(function (o) { return o.status === 'approved'; }).length);

        set(root, '[data-materials]', table(
          ['Part', 'On hand', 'Reorder at', 'Per leg', 'Daily draw', 'Days of cover', 'Supplier', 'Status', ''],
          mats.map(function (m) {
            var st = STOCK[m.status];
            return '<tr>' +
              '<th scope="row">' + esc(m.name) + '<span class="tbl__sub mono">' + esc(m.sku) + '</span></th>' +
              '<td class="mono num">' + num(m.on_hand) + ' <span class="muted">' + esc(m.unit) + '</span></td>' +
              '<td class="mono num">' + num(m.reorder_at) + '</td>' +
              '<td class="mono num">' + (m.per_leg ? num(m.per_leg, 2) : '—') + '</td>' +
              '<td class="mono num">' + (m.per_day ? num(m.per_day, 2) : '—') + '</td>' +
              '<td class="mono num">' + (m.days_of_cover === null ? '—' : num(m.days_of_cover, 0) + ' d') + '</td>' +
              '<td>' + esc(m.supplier || '—') + '</td>' +
              '<td>' + pill(st.kind, st.label) + '</td>' +
              '<td><button type="button" class="btn btn--sm" data-edit="' + esc(m.sku) + '" ' +
                'aria-label="Edit ' + esc(m.name) + '">Edit</button></td></tr>';
          }),
          'No materials listed yet. Add the parts on the leg bill of materials first.'));

        // The draft starts from what is short: enough to reach the reorder
        // point plus what the last month drew, rounded up. A starting point
        // for the buyer, not a decision.
        var short = mats.filter(function (m) { return m.status !== 'stocked'; });
        set(orderForm, '[data-order-lines]', short.length
          ? short.map(function (m) {
              var qty = Math.max(1, Math.ceil(m.reorder_at - m.on_hand + (m.per_day || 0) * 30));
              return '<div class="field field--line"><label for="ol-' + esc(m.sku) + '">' + esc(m.name) +
                ' <span class="mono muted">' + esc(m.sku) + '</span></label>' +
                '<input type="number" id="ol-' + esc(m.sku) + '" class="mono" min="0" step="any" ' +
                'data-line="' + esc(m.sku) + '" value="' + qty + '"></div>';
            }).join('')
          : '<p class="small muted">Nothing is below its reorder point.</p>');

        var sel = moveForm.querySelector('[name=sku]');
        var picked = sel.value;
        sel.innerHTML = mats.map(function (m) {
          return '<option value="' + esc(m.sku) + '">' + esc(m.sku) + ' · ' + esc(m.name) + '</option>';
        }).join('');
        if (picked) sel.value = picked;

        set(root, '[data-orders]', table(['Order', 'Lines', 'Needed by', 'Status', ''],
          orders.map(function (o) {
            var st = PO[o.status];
            var acts = '';
            if (o.status === 'draft') acts += '<button type="button" class="btn btn--sm" data-po="approve">Approve</button>';
            if (o.status === 'approved') acts += '<button type="button" class="btn btn--sm" data-po="receive">Mark received</button>';
            if (o.status === 'draft' || o.status === 'approved') {
              acts += '<button type="button" class="btn btn--sm" data-po="cancel">Cancel</button>';
            }
            return '<tr data-ref="' + esc(o.reference) + '">' +
              '<th scope="row" class="mono">' + esc(o.reference) + '<span class="tbl__sub">by ' + esc(o.created_by) + '</span></th>' +
              '<td>' + o.lines.map(function (l) {
                return num(l.qty) + ' × <span class="mono">' + esc(l.sku) + '</span>';
              }).join('<br>') + '</td>' +
              '<td class="mono">' + esc(o.needed_by || '—') + '</td>' +
              '<td>' + pill(st.kind, st.label) + '</td>' +
              '<td><div class="row-actions">' + acts + '</div></td></tr>';
          }), 'No purchase orders yet.'));
      }).catch(function (err) { REG.fail(errEl, err); });
    }

    root.querySelector('[data-orders]').addEventListener('click', function (ev) {
      var btn = ev.target.closest('[data-po]');
      if (!btn) return;
      var ref = btn.closest('[data-ref]').getAttribute('data-ref');
      btn.disabled = true;
      api('/orders/' + encodeURIComponent(ref) + '/' + btn.getAttribute('data-po'), { method: 'POST' })
        .then(function () { errEl.hidden = true; return load(); })
        .catch(function (err) { btn.disabled = false; REG.fail(errEl, err); });
    });

    wire(orderForm, function (body) {
      var lines = [];
      orderForm.querySelectorAll('[data-line]').forEach(function (i) {
        if (Number(i.value) > 0) lines.push({ sku: i.getAttribute('data-line'), qty: Number(i.value) });
      });
      return api('/orders', { method: 'POST', body: { needed_by: body.needed_by, lines: lines } });
    }, function (d, out) {
      REG.note(out, 'ok', d.reference + ' sent for approval', 'An administrator other than you approves it.');
      load();
    });

    wire(moveForm, function (body) {
      var sku = body.sku;
      delete body.sku;
      body.quantity = Number(body.quantity);
      return api('/materials/' + encodeURIComponent(sku) + '/moves', { method: 'POST', body: body });
    }, function (d, out) {
      REG.note(out, 'ok', d.sku + ' now ' + num(d.on_hand), '');
      moveForm.quantity.value = '';
      moveForm.reference.value = '';
      load();
    });

    /* One form adds and edits. Editing locks the part number (it is the key
       every stock move and order line points at) and hides opening stock,
       because the count only moves through the log. */
    var addForm = root.querySelector('[data-material-form]');
    var editing = null;
    var title = root.querySelector('[data-material-title]');
    var submit = addForm.querySelector('[data-material-submit]');
    var cancel = addForm.querySelector('[data-material-cancel]');

    function mode(m) {
      editing = m ? m.sku : null;
      addForm.reset();
      addForm.sku.readOnly = !!m;
      addForm.querySelectorAll('[data-when-new]').forEach(function (el) { el.hidden = !!m; });
      addForm.querySelectorAll('[data-when-edit]').forEach(function (el) { el.hidden = !m; });
      cancel.hidden = !m;
      title.textContent = m ? 'Edit ' + m.sku : 'Add a material';
      submit.textContent = m ? 'Save changes' : 'Add material';
      if (m) {
        ['sku', 'name', 'unit', 'per_leg', 'reorder_at', 'supplier'].forEach(function (k) {
          addForm[k].value = m[k] === null || m[k] === undefined ? '' : m[k];
        });
      }
    }

    root.querySelector('[data-materials]').addEventListener('click', function (ev) {
      var btn = ev.target.closest('[data-edit]');
      if (!btn || !bySku[btn.getAttribute('data-edit')]) return;
      mode(bySku[btn.getAttribute('data-edit')]);
      addForm.querySelector('[data-result]').hidden = true;
      addForm.scrollIntoView({ behavior: 'smooth', block: 'center' });
      addForm.name.focus({ preventScroll: true });
    });
    cancel.addEventListener('click', function () { mode(null); });

    wire(addForm, function (body) {
      if (!editing) return api('/materials', { method: 'POST', body: body });
      // Every field is sent, so clearing one (a supplier) clears it.
      var change = {};
      ['name', 'unit', 'per_leg', 'reorder_at', 'supplier'].forEach(function (k) {
        change[k] = addForm[k].value;
      });
      return api('/materials/' + encodeURIComponent(editing), { method: 'PATCH', body: change });
    }, function (d, out) {
      var was = editing;
      mode(null);
      REG.note(out, 'ok', d.sku + (was ? ' saved' : ' added'), '');
      load();
    });

    load();
  }

  /* ---------------------------------------------------------- timesheets */

  var DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  function mondayOf(offsetWeeks) {
    var d = new Date();
    d.setUTCHours(0, 0, 0, 0);
    d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7) + offsetWeeks * 7);
    return d.toISOString().slice(0, 10);
  }

  function initTime(root) {
    if (!root) return;
    var errEl = root.querySelector('[data-error]');
    var clockForm = root.querySelector('[data-clock-form]');
    var offset = 0;
    var open = null;

    api('/batches').then(function (d) {
      var live = d.batches.filter(function (b) { return b.stage !== 'released'; });
      document.querySelectorAll('select[name=batch_number]').forEach(function (sel) {
        live.forEach(function (b) {
          var o = document.createElement('option');
          o.value = b.batch_number;
          o.textContent = b.batch_number + ' · ' + (STAGE[b.stage] || {}).label;
          sel.appendChild(o);
        });
      });
    }).catch(function () {});

    function load() {
      return api('/time?week=' + mondayOf(offset)).then(function (d) {
        var label = document.querySelector('[data-week-label]');
        if (label) label.textContent = 'Week of ' + d.week;
        open = d.me.open;

        var me = root.querySelector('[data-me]');
        if (me) me.textContent = d.me.name;
        var state = root.querySelector('[data-clock-state]');
        state.innerHTML = open
          ? 'On the clock since <b class="mono">' + esc(open.clock_in.slice(11, 16)) + 'Z</b>' +
            (open.batch_number ? ' on <b class="mono">' + esc(open.batch_number) + '</b>' : '') +
            ' &middot; ' + num((Date.now() - Date.parse(open.clock_in)) / 36e5) + ' h so far'
          : 'Not clocked in.';
        clockForm.querySelectorAll('[data-when-out]').forEach(function (el) { el.hidden = !!open; });
        root.querySelector('[data-clock-btn]').textContent = open ? 'Clock out' : 'Clock in';

        set(root, '[data-week-table]', table(
          ['Team member'].concat(DAYS, ['Total']),
          d.members.map(function (m) {
            return '<tr><th scope="row">' + esc(m.name) + '<span class="tbl__sub mono">' + esc(m.member) +
              (m.open ? ' · on the clock' : '') + '</span></th>' +
              m.days.map(function (h) { return '<td class="mono num">' + (h ? num(h) : '—') + '</td>'; }).join('') +
              '<td class="mono num"><b>' + num(m.total) + '</b></td></tr>';
          }),
          'No time booked this week.'));

        var most = d.by_batch.length ? d.by_batch[0].hours : 0;
        set(root, '[data-by-batch]', d.by_batch.length
          ? d.by_batch.map(function (b) {
              return '<div class="barrow"><span class="mono">' + esc(b.batch || 'Not batch work') + '</span>' +
                '<span class="meter__track"><span class="meter__fill meter__fill--' + (b.batch ? 'self' : 'flag') +
                '" data-w="' + (most ? b.hours / most * 100 : 0) + '"></span></span>' +
                '<b class="mono">' + num(b.hours) + ' h</b></div>';
            }).join('')
          : '<p class="muted small">Nothing booked yet.</p>');
      }).catch(function (err) { REG.fail(errEl, err); });
    }

    document.querySelectorAll('[data-week]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        offset += Number(btn.getAttribute('data-week'));
        load();
      });
    });

    wire(clockForm, function (body) {
      return open
        ? api('/time/clock-out', { method: 'POST' })
        : api('/time/clock-in', { method: 'POST', body: body });
    }, function (d, out) {
      out.hidden = true;
      clockForm.reset();
      load();
    });

    var entryForm = root.querySelector('[data-entry-form]');
    wire(entryForm, function (body) {
      // datetime-local has no zone: it is the browser's local time.
      body.clock_in = new Date(body.clock_in).toISOString();
      body.clock_out = new Date(body.clock_out).toISOString();
      return api('/time/entries', { method: 'POST', body: body });
    }, function (d, out) {
      REG.note(out, 'ok', 'Time entered', '');
      entryForm.reset();
      load();
    });

    load();
  }

  /* ------------------------------------------------------------- metrics */

  function initMetrics(root) {
    if (!root) return;
    var errEl = root.querySelector('[data-error]');
    var period = document.querySelector('[data-period]');

    function put(key, value, how) {
      var v = root.querySelector('[data-m="' + key + '"]');
      if (v) v.textContent = value;
      var h = root.querySelector('[data-m-how="' + key + '"]');
      if (h && how) h.textContent = how;
    }

    function load(days) {
      return api('/metrics?days=' + days).then(function (m) {
        var f = m.first_pass_yield, e = m.early_life_failures, c = m.cycle_time,
            l = m.labour_per_unit, d = m.days_of_cover;
        put('fpy', f.value === null ? '—' : num(f.value) + '%',
          f.inspected ? f.passed + ' of ' + f.inspected + ' frames passed first time, across ' + f.batches + ' batches.'
            : 'No QA results recorded in this period.');
        put('elf', e.value === null ? '—' : num(e.value) + '%',
          e.commissioned ? e.failed + ' of ' + e.commissioned + ' commissioned legs flagged or dispatched within 90 days.'
            : 'No commissioned legs from these batches yet.');
        put('cycle', c.value === null ? '—' : num(c.value) + ' d',
          c.batches ? 'Median across ' + c.batches + ' released batch' + (c.batches === 1 ? '' : 'es') + '.'
            : 'No batch released in this period.');
        put('labour', l.value === null ? '—' : num(l.value) + ' h',
          l.units ? num(l.hours) + ' h booked to ' + l.units + ' released frames.'
            : 'No hours booked against a released batch.');
        put('cover', d.value === null ? '—' : num(d.value, 0) + ' d',
          d.value === null ? 'No BOM part has been drawn in the last 30 days.' : d.name + ' (' + d.sku + ') runs out first.');

        set(root, '[data-by-batch]', table(['Batch', 'Stage', 'First-pass yield', '90-day returns'],
          m.by_batch.map(function (b) {
            var st = STAGE[b.stage] || STAGE.assembly;
            var bad = b.commissioned && b.early_failures / b.commissioned > 0.05;
            return '<tr' + (bad ? ' class="tbl__row--flagged"' : '') + '>' +
              '<th scope="row" class="mono">' + esc(b.batch_number) + '<span class="tbl__sub">' + esc(b.variant) + '</span></th>' +
              '<td>' + pill(st.kind, st.label) + '</td>' +
              '<td>' + (b.first_pass_yield === null ? '<span class="muted">not inspected</span>'
                : '<span class="meter"><span class="meter__track"><span class="meter__fill meter__fill--' +
                  (b.first_pass_yield >= 90 ? 'self' : b.first_pass_yield >= 80 ? 'flag' : 'dispatch') +
                  '" data-w="' + b.first_pass_yield + '"></span></span><b class="mono">' + num(b.first_pass_yield) + '%</b></span>') +
              '</td>' +
              '<td class="mono">' + (b.commissioned ? b.early_failures + ' / ' + b.commissioned : '—') + '</td></tr>';
          }), 'No batches in this period.'));

        var s = c.stages;
        var parts = [['assembly', 'm-info'], ['qa', 'm-flag'], ['commissioning', 'm-self']];
        var total = parts.reduce(function (n, p) { return n + (s[p[0]] || 0); }, 0);
        set(root, '[data-stages]', c.batches
          ? (total ? '<div class="mixbar mixbar--tall" aria-hidden="true">' + parts.map(function (p) {
              return '<span class="' + p[1] + '" data-w="' + ((s[p[0]] || 0) / total * 100) + '"></span>';
            }).join('') + '</div>' : '') +
            '<dl class="stagelist">' + parts.map(function (p) {
              return '<div><dt>' + esc(STAGE[p[0]].label) + '</dt><dd class="mono">' +
                (s[p[0]] === null ? '—' : num(s[p[0]]) + ' d') + '</dd></div>';
            }).join('') + '</dl>'
          : '<p class="muted small">Appears once a batch has been released.</p>');
      }).catch(function (err) { REG.fail(errEl, err); });
    }

    period.addEventListener('click', function (ev) {
      var btn = ev.target.closest('[data-days]');
      if (!btn) return;
      period.querySelectorAll('[data-days]').forEach(function (b) {
        b.setAttribute('aria-pressed', String(b === btn));
      });
      load(btn.getAttribute('data-days'));
    });

    load(90);
  }

  document.addEventListener('DOMContentLoaded', function () {
    initBatches(document.querySelector('[data-batches-page]'));
    initMaterials(document.querySelector('[data-materials-page]'));
    initTime(document.querySelector('[data-time-page]'));
    initMetrics(document.querySelector('[data-metrics-page]'));
  });
})();
