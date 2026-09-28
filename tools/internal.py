"""
The gated section: the leg registry at /internal/.

Not linked from anywhere public and not in the nav — it is reached by URL and
gated in the Worker (src/auth.js). These pages are ordinary static assets; what
keeps them non-public is the /internal/* entry in `run_worker_first`, which
puts the Worker in front of the asset layer. See src/index.js.

The pages carry no fleet data of their own. Everything is fetched from
/api/registry/* after the session cookie is checked, so a page that somehow
escaped the gate would leak an empty shell rather than the fleet.
"""

from build import page

NOINDEX = '\n<meta name="robots" content="noindex, nofollow">'
SCRIPT = '\n<script src="../assets/js/registry.js" defer></script>'
# The manufacturing pages build on REG from registry.js, so they load after it.
MFG = SCRIPT + '\n<script src="../assets/js/manufacturing.js" defer></script>'


def regbar(current):
    """The section's own bar. The public nav above it stays as it is: an
    operator in the registry is still one click from the fault table."""
    links = [
        ("index.html", "Fleet"),
        ("intake.html", "Enter legs"),
        ("batches.html", "Batches"),
        ("materials.html", "Materials"),
        ("timesheets.html", "Timesheets"),
        ("metrics.html", "Metrics"),
    ]
    items = "".join(
        '\n      <a href="{href}"{cur}>{label}</a>'.format(
            href=href, label=label,
            cur=' aria-current="page"' if href == current else "")
        for href, label in links
    )
    return """
<div class="wrap">
  <div class="regbar" data-regbar>
    <span class="regbar__id">Registry</span>{items}
    <span class="regbar__end">
      <a href="../index.html">Public portal</a>
      <button type="button" class="btn btn--sm" data-signout>Sign out</button>
    </span>
  </div>
</div>
""".format(items=items)


# ===========================================================================
# Sign in — the one page in the section served without a session
# ===========================================================================
page("internal/signin.html", 1, "Registry sign-in",
     "Access the internal Erektor leg registry.",
     """
<section class="wrap wrap--narrow">
  <span class="eyebrow">Internal</span>
  <h1>Leg registry</h1>
  <p class="lede">The fleet record: every frame EREKTOR has built, what is bound to it, where it is, and
  what it is carrying. Not part of the public portal.</p>

  <form class="form mt-2" data-signin>
    <div class="field limit-input">
      <label for="code" class="required">Access code</label>
      <input type="password" id="code" name="code" class="mono" required autocomplete="current-password"
             autocapitalize="off" spellcheck="false">
      <p class="field__hint">Issued per operator. A session lasts one shift.</p>
    </div>
    <div class="btn-row">
      <button type="submit" class="btn btn--primary">Sign in</button>
    </div>
  </form>

  <div id="result" hidden class="mt-1"></div>

  <noscript>
    <p class="note note--warn">The registry is an application, not a document. It needs JavaScript.</p>
  </noscript>

  <p class="small muted mt-3">Field service does not go through here. To get a leg serviced or replaced,
  use the <a href="../index.html">support portal</a>.</p>
</section>
""",
     head_extra=NOINDEX, foot_extra=SCRIPT)


# ===========================================================================
# Fleet console
# ===========================================================================
page("internal/index.html", 1, "Fleet",
     "Internal leg registry: fleet state, open flags, service intervals and reconciliation.",
     regbar("index.html") + """
<section class="wrap dash-head">
  <div class="dash-head__id">
    <span class="eyebrow">Internal &middot; leg registry</span>
    <h1>Fleet</h1>
    <p class="lede">Every leg is keyed on its <b>mechanical</b> serial, because that number is stamped into
    the frame and outlives any ClearCore bolted to it. The electronics serial below is a current binding,
    and swapping it is an event on the record rather than a new leg.</p>
  </div>
  <dl class="statbar" aria-label="Fleet at a glance">
    <div><dt>Frames</dt><dd class="mono" data-k="fleet">&mdash;</dd></div>
    <div><dt>In pool</dt><dd class="mono" data-k="pool">&mdash;</dd></div>
    <div><dt>Out in the field</dt><dd class="mono" data-k="field">&mdash;</dd></div>
    <div><dt>Carrying a flag</dt><dd class="mono" data-k="flagged">&mdash;</dd></div>
    <div><dt>At interval</dt><dd class="mono" data-k="due">&mdash;</dd></div>
    <div><dt>Unmatched intake</dt><dd class="mono" data-k="unmatched">&mdash;</dd></div>
  </dl>
</section>

<section class="wrap mt-2" data-console>
  <div data-error hidden></div>

  <form class="filters" data-filters role="search" aria-label="Filter the fleet">
    <div class="field field--grow">
      <label for="q">Find a leg</label>
      <input type="search" id="q" name="q" class="mono" placeholder="MX-24-08192, EL-25-014873, a facility…"
             autocomplete="off">
    </div>
    <div class="field">
      <label for="fstate">State</label>
      <select id="fstate" name="state"><option value="">Any</option></select>
    </div>
    <div class="field">
      <label for="fvariant">Variant</label>
      <select id="fvariant" name="variant"><option value="">Any</option></select>
    </div>
    <div class="toggles">
      <label><input type="checkbox" name="flagged" value="1"> Flagged</label>
      <label><input type="checkbox" name="due" value="1"> At interval</label>
      <label><input type="checkbox" name="stale" value="1"> No recent contact</label>
    </div>
  </form>

  <div class="dash-secline mt-2">
    <h2>Legs <span class="muted mono small" data-count></span></h2>
    <p>A leg is looked up in the field from whichever number is legible &mdash; the search takes either serial.</p>
  </div>
  <div data-legs><p class="muted">Loading the fleet&hellip;</p></div>

  <section class="panel mt-2" data-orphans hidden aria-labelledby="p-orphans">
    <header class="panel__head">
      <h2 id="p-orphans">Field requests with no record</h2>
      <span class="panel__meta mono">unmatched</span>
    </header>
    <div class="panel__body" data-orphan-body></div>
    <footer class="panel__foot">
      <span class="small muted">A flag or dispatch was filed against a serial the registry does not hold.
      That is a bookkeeping gap, not a lost message &mdash; enter the leg and the request has somewhere to land.</span>
    </footer>
  </section>

  <div class="panels mt-3">
    <section class="panel" aria-labelledby="p-dist">
      <header class="panel__head">
        <h2 id="p-dist">Where the fleet is</h2>
        <span class="panel__meta mono">by state</span>
      </header>
      <div class="panel__body" data-distribution>
        <p class="muted small">Counted from the registry, not typed here.</p>
      </div>
      <footer class="panel__foot">
        <span class="legend"><i class="swatch swatch--self"></i>Working</span>
        <span class="legend"><i class="swatch swatch--flag"></i>Held or moving</span>
        <span class="legend"><i class="swatch swatch--dispatch"></i>Out of the fleet</span>
      </footer>
    </section>

    <section class="panel" aria-labelledby="p-act">
      <header class="panel__head">
        <h2 id="p-act">Latest activity</h2>
        <span class="panel__meta mono">append-only</span>
      </header>
      <div class="panel__body" data-activity>
        <p class="muted small">Every state change is an event on a leg, and events are never rewritten.</p>
      </div>
      <footer class="panel__foot">
        <a class="small" href="/api/registry/export">Export the fleet as CSV &rarr;</a>
      </footer>
    </section>
  </div>
</section>
""",
     head_extra=NOINDEX, foot_extra=SCRIPT)


# ===========================================================================
# One leg
# ===========================================================================
page("internal/leg.html", 1, "Leg record",
     "One leg's registry record: identity, state, service interval and full event history.",
     regbar("") + """
<section class="wrap" data-leg>
  <p class="crumbs"><a href="index.html">Fleet</a><span>/</span><span class="mono" data-leg-serial>&mdash;</span></p>
  <div data-error hidden></div>

  <span class="eyebrow">Leg record</span>
  <h1 class="mono" data-leg-serial>&mdash;</h1>
  <p class="lede" data-f="state">&mdash;</p>

  <div data-flag hidden class="mt-1"></div>

  <h2 class="mt-2">Identity</h2>
  <dl class="ident">
    <div class="ident--key">
      <dt>Mechanical serial</dt>
      <dd class="mono" data-leg-serial>&mdash;</dd>
      <span class="small">The registry key. Wear, intervals, warranty and the lease record accrue here and
      survive any electronics swap.</span>
    </div>
    <div>
      <dt>Electronics serial</dt>
      <dd data-f="electronics">&mdash;</dd>
      <span class="small">The current binding. Firmware, pairing and session assignment follow it &mdash; and it
      is what a controller screen and a session roster show.</span>
    </div>
    <div>
      <dt>Service interval</dt>
      <dd data-f="interval">&mdash;</dd>
      <span class="small">Motor-hours since the last <em>closed</em> service record. A controller swap does
      not reset it.</span>
    </div>
  </dl>

  <div class="table-scroll mt-1">
    <table>
      <caption>Registry fields</caption>
      <tbody>
        <tr><th scope="row">Variant</th><td class="mono" data-f="variant">&mdash;</td>
            <th scope="row">Controller</th><td class="mono" data-f="controller">&mdash;</td></tr>
        <tr><th scope="row">Firmware</th><td class="mono" data-f="firmware">&mdash;</td>
            <th scope="row">Motor-hours</th><td class="mono" data-f="hours">&mdash;</td></tr>
        <tr><th scope="row">Held by</th><td data-f="holder">&mdash;</td>
            <th scope="row">Location</th><td data-f="location">&mdash;</td></tr>
        <tr><th scope="row">Work order</th><td class="mono" data-f="batch">&mdash;</td>
            <th scope="row">Built</th><td class="mono" data-f="built">&mdash;</td></tr>
        <tr><th scope="row">Last service closed</th><td class="mono" data-f="service">&mdash;</td>
            <th scope="row">Last seen</th><td class="mono" data-f="seen">&mdash;</td></tr>
      </tbody>
    </table>
  </div>

  <section class="mt-3">
    <div class="dash-secline">
      <h2>Record what happened</h2>
      <p>State moves only by recording an event, so the history always explains the current state. The list
      offers only the moves this leg can actually make from where it is.</p>
    </div>
    <form class="form" data-event-form>
      <div class="field">
        <label for="etype" class="required">Event</label>
        <select id="etype" name="type" required></select>
        <p class="field__hint" data-event-note hidden></p>
      </div>

      <div class="field" data-when="binds" hidden>
        <label for="eel" class="required">Electronics serial</label>
        <input type="text" id="eel" name="electronics_serial" class="mono" data-serial="electronics" autocomplete="off">
        <p class="field__hint">The ClearCore going in. Binding one that is already on another leg is refused
        &mdash; two live legs cannot answer to the same controller.</p>
        <p class="field__err" data-serial-err hidden></p>
      </div>

      <div class="field" data-when="flag" hidden>
        <label for="ecode" class="required">Fault code</label>
        <input type="text" id="ecode" name="fault_code" class="mono" placeholder="SES-30" autocomplete="off">
        <p class="field__hint">Inspection reads this off the frame and diverts the leg out of the line.</p>
      </div>

      <div class="field" data-when="stage" hidden>
        <label for="estage">Station on the line</label>
        <select id="estage" name="stage"></select>
      </div>

      <div class="field" data-when="move" hidden>
        <label for="eholder">Held by</label>
        <input type="text" id="eholder" name="holder" autocomplete="organization">
        <p class="field__hint">The facility or operator taking custody. This is what a reconciliation
        question is answered from.</p>
      </div>

      <div class="grid grid--2">
        <div class="field">
          <label for="ehours">Motor-hours reading</label>
          <input type="number" id="ehours" name="motor_hours" class="mono" min="0" step="0.1" inputmode="decimal">
          <p class="field__hint">Lifetime total off the controller, not a delta. It cannot go down.</p>
        </div>
        <div class="field">
          <label for="eref">Reference</label>
          <input type="text" id="eref" name="reference" class="mono" placeholder="FLG-20260909-A1B2" autocomplete="off">
        </div>
      </div>

      <div class="field">
        <label for="edetail">Detail</label>
        <textarea id="edetail" name="detail" placeholder="What was found, what was done, what to watch."></textarea>
      </div>

      <div class="btn-row">
        <button type="submit" class="btn btn--primary">Record it</button>
      </div>
    </form>
  </section>

  <section class="mt-3">
    <div class="dash-secline">
      <h2>Registry fields</h2>
      <p>Descriptive facts, editable in place. State is not among them.</p>
    </div>
    <form class="form" data-meta-form>
      <div class="grid grid--2">
        <div class="field"><label for="mvariant">Variant</label>
          <input type="text" id="mvariant" name="variant" class="mono"></div>
        <div class="field"><label for="mcontroller">Controller</label>
          <input type="text" id="mcontroller" name="controller" class="mono"></div>
        <div class="field"><label for="mfirmware">Firmware</label>
          <input type="text" id="mfirmware" name="firmware" class="mono"></div>
        <div class="field"><label for="mbatch">Work order</label>
          <input type="text" id="mbatch" name="batch" class="mono"></div>
        <div class="field"><label for="mholder">Held by</label>
          <input type="text" id="mholder" name="holder"></div>
        <div class="field"><label for="mlocation">Location</label>
          <input type="text" id="mlocation" name="location"></div>
      </div>
      <div class="field">
        <label for="mnotes">Notes</label>
        <textarea id="mnotes" name="notes"></textarea>
      </div>
      <div class="btn-row"><button type="submit" class="btn">Save fields</button></div>
    </form>
  </section>

  <section class="mt-3">
    <div class="dash-secline">
      <h2>History</h2>
      <p>Append-only, newest first. Nothing here is ever edited &mdash; a correction is another event.</p>
    </div>
    <div data-timeline><p class="muted">Loading&hellip;</p></div>
  </section>
</section>
""",
     head_extra=NOINDEX, foot_extra=SCRIPT)


# ===========================================================================
# Intake — entering legs as they are built
# ===========================================================================
page("internal/intake.html", 1, "Enter legs",
     "Enter newly manufactured Erektor legs into the registry, one at a time or a work order at once.",
     regbar("intake.html") + """
<section class="wrap wrap--narrow" data-intake>
  <p class="crumbs"><a href="index.html">Fleet</a><span>/</span>Enter legs</p>
  <span class="eyebrow">Manufacturing intake</span>
  <h1>Enter legs</h1>
  <p class="lede">A leg enters the registry when its frame is stamped, not when it ships. The mechanical
  serial is the record; everything that happens to the leg afterwards attaches to it.</p>

  <div data-error hidden></div>

  <div class="note note--info">
    <p class="note__title">Two identities, entered at two different moments</p>
    <p>A frame with no ClearCore bound has no operational identity, so it enters as <b>Built</b> and cannot
    be assigned. It becomes <b>Commissioned</b> when electronics go in &mdash; recorded on the leg&rsquo;s own page,
    which is also where a later swap is recorded. See
    <a href="../docs/leg.html#identity">serials and identity</a>.</p>
  </div>

  <h2 class="mt-2">A work order</h2>
  <p>A production run is consecutive frames, so give the first serial and the count rather than typing
  fifty numbers. Nothing is sent until you have read the list back.</p>

  <form class="form" data-batch>
    <div class="grid grid--2">
      <div class="field">
        <label for="bfirst" class="required">First mechanical serial</label>
        <input type="text" id="bfirst" name="first" class="mono" placeholder="MX-26-00101"
               autocomplete="off" autocapitalize="characters" spellcheck="false">
      </div>
      <div class="field">
        <label for="bcount" class="required">How many frames</label>
        <input type="number" id="bcount" name="count" class="mono" min="1" max="200" step="1" inputmode="numeric">
      </div>
      <div class="field">
        <label for="bvariant" class="required">Variant</label>
        <select id="bvariant" name="variant"><option value="">Select&hellip;</option></select>
      </div>
      <div class="field">
        <label for="bbatch">Work order</label>
        <input type="text" id="bbatch" name="batch" class="mono" placeholder="WO-2026-014" autocomplete="off">
      </div>
    </div>
    <input type="hidden" name="controller" value="">
  </form>
  <div data-preview class="mt-1"></div>

  <h2 class="mt-3">One leg</h2>
  <p>For a frame that does not belong to a run, or one already carrying its electronics.</p>

  <form class="form" data-intake-form>
    <div class="field">
      <label for="imx" class="required">Mechanical serial</label>
      <input type="text" id="imx" name="mechanical_serial" class="mono" data-serial="mechanical" required autocomplete="off">
      <p class="field__hint">Stamped into the frame above the bracket face. This is the registry key.</p>
      <p class="field__err" data-serial-err hidden></p>
    </div>
    <div class="field">
      <label for="ivariant" class="required">Variant</label>
      <select id="ivariant" name="variant" required><option value="">Select&hellip;</option></select>
    </div>
    <div class="field">
      <label for="iel">Electronics serial <span class="muted">(if already bound)</span></label>
      <input type="text" id="iel" name="electronics_serial" class="mono" data-serial="electronics" autocomplete="off">
      <p class="field__hint">Leave blank for a bare frame. Giving one enters the leg as Commissioned.</p>
      <p class="field__err" data-serial-err hidden></p>
    </div>
    <div class="grid grid--2">
      <div class="field">
        <label for="icontroller">Controller</label>
        <input type="text" id="icontroller" name="controller" class="mono" placeholder="CC-1" autocomplete="off">
      </div>
      <div class="field">
        <label for="ibatch">Work order</label>
        <input type="text" id="ibatch" name="batch" class="mono" autocomplete="off">
      </div>
    </div>
    <div class="field">
      <label for="inotes">Notes</label>
      <textarea id="inotes" name="notes" placeholder="Anything about this frame that will not be obvious in six months."></textarea>
    </div>
    <div class="btn-row">
      <button type="submit" class="btn btn--primary">Enter this leg</button>
    </div>
  </form>
</section>
""",
     head_extra=NOINDEX, foot_extra=SCRIPT)


# ===========================================================================
# Manufacturing — the facility's side: batches, stock, time, and the numbers
#
# Same gate, same database as the fleet. A batch is the run that put frames
# into the registry, so its frames are entered from here and every metric
# joins the two: a batch's first-pass yield against its field returns.
# ===========================================================================
page("internal/batches.html", 1, "Batches",
     "Log a production batch, enter its frames into the registry, and move it through QA to release.",
     regbar("batches.html") + """
<section class="wrap dash-head">
  <div class="dash-head__id">
    <span class="eyebrow">Manufacturing &middot; build</span>
    <h1>Batches</h1>
    <p class="lede">A batch is one production run of one variant. Logging it enters every frame into the registry
    as <b>Built</b> and draws its bill of materials from stock, in one step &mdash; a run that cannot be entered
    whole is not entered at all.</p>
  </div>
  <dl class="statbar" aria-label="Batches at a glance">
    <div><dt>In assembly</dt><dd class="mono" data-k="assembly">&mdash;</dd></div>
    <div><dt>In QA</dt><dd class="mono" data-k="qa">&mdash;</dd></div>
    <div><dt>Commissioning</dt><dd class="mono" data-k="commissioning">&mdash;</dd></div>
    <div><dt>Released</dt><dd class="mono" data-k="released">&mdash;</dd></div>
  </dl>
</section>

<section class="wrap mt-2" data-batches-page>
  <div data-error hidden></div>

  <div class="panels">
    <section class="panel panel--span2" aria-labelledby="p-batches">
      <header class="panel__head">
        <h2 id="p-batches">All batches</h2>
        <span class="panel__meta mono" data-count></span>
      </header>
      <div data-batches><p class="muted small panel__body">Loading&hellip;</p></div>
      <footer class="panel__foot">
        <span class="small muted">Stages move forward one at a time. A batch is not released until its QA
        result is recorded, so first-pass yield never has a hole in it.</span>
      </footer>
    </section>

    <section class="panel" aria-labelledby="p-new">
      <header class="panel__head"><h2 id="p-new">Log a batch</h2></header>
      <form class="panel__body form" data-batch-form>
        <div class="field">
          <label for="bnum" class="required">Batch number</label>
          <input type="text" id="bnum" name="batch_number" class="mono" required placeholder="B-2609-A"
                 autocomplete="off" autocapitalize="characters" spellcheck="false">
        </div>
        <div class="field">
          <label for="bvar" class="required">Variant</label>
          <select id="bvar" name="variant" required><option value="">Select&hellip;</option></select>
        </div>
        <div class="grid grid--2 grid--tight">
          <div class="field">
            <label for="bfirst" class="required">First serial</label>
            <input type="text" id="bfirst" name="first_serial" class="mono" required placeholder="MX-24-08237"
                   autocomplete="off" autocapitalize="characters" spellcheck="false">
          </div>
          <div class="field">
            <label for="bcount" class="required">Frames</label>
            <input type="number" id="bcount" name="frame_count" class="mono" required min="1" max="200" step="1"
                   inputmode="numeric">
          </div>
        </div>
        <p class="field__hint" data-range aria-live="polite">Give the first serial and the frame count to see the range.</p>
        <div class="field">
          <label for="blots">Material lots used</label>
          <input type="text" id="blots" name="lots" placeholder="Extrusion lot, bracket lot" autocomplete="off">
          <p class="field__hint">Lets a field failure be traced to a lot, not just a batch.</p>
        </div>
        <div class="btn-row">
          <button type="submit" class="btn btn--primary">Log batch and enter its frames</button>
        </div>
        <div data-result hidden></div>
      </form>
    </section>
  </div>
</section>
""",
     head_extra=NOINDEX, foot_extra=MFG)


page("internal/materials.html", 1, "Materials",
     "Stock against the leg bill of materials, reorder points, and purchase orders for approval.",
     regbar("materials.html") + """
<section class="wrap dash-head">
  <div class="dash-head__id">
    <span class="eyebrow">Manufacturing &middot; supply</span>
    <h1>Materials</h1>
    <p class="lede">What is on the shelf against what the line draws. A part with a <b>per leg</b> quantity is on the
    bill of materials, and every logged batch draws it automatically. The count only ever moves by a recorded
    delivery, use or stock count &mdash; never by editing the number.</p>
  </div>
  <dl class="statbar" aria-label="Stock at a glance">
    <div><dt>Parts listed</dt><dd class="mono" data-k="parts">&mdash;</dd></div>
    <div><dt>Below reorder point</dt><dd class="mono" data-k="order">&mdash;</dd></div>
    <div><dt>Orders awaiting approval</dt><dd class="mono" data-k="drafts">&mdash;</dd></div>
    <div><dt>Orders to receive</dt><dd class="mono" data-k="approved">&mdash;</dd></div>
  </dl>
</section>

<section class="wrap mt-2" data-materials-page>
  <div data-error hidden></div>

  <div class="dash-secline">
    <h2>Stock</h2>
    <p>Days of cover is stock divided by the last 30 days&rsquo; average daily draw.</p>
  </div>
  <div data-materials><p class="muted">Loading&hellip;</p></div>

  <div class="panels mt-2">
    <section class="panel panel--span2" aria-labelledby="p-orders">
      <header class="panel__head">
        <h2 id="p-orders">Purchase orders</h2>
        <span class="panel__meta mono">draft &rarr; approved &rarr; received</span>
      </header>
      <div data-orders><p class="muted small panel__body">Loading&hellip;</p></div>
      <footer class="panel__foot">
        <span class="small muted">An order is approved by an administrator other than whoever drafted it.
        Receiving it books every line onto the shelf.</span>
      </footer>
    </section>

    <section class="panel" aria-labelledby="p-draft">
      <header class="panel__head"><h2 id="p-draft">Draft an order</h2></header>
      <form class="panel__body form" data-order-form>
        <p class="small muted mt-0">Parts below their reorder point are filled in. Set a quantity of 0 to leave one off.</p>
        <div data-order-lines></div>
        <div class="field">
          <label for="oneed">Needed by</label>
          <input type="date" id="oneed" name="needed_by">
        </div>
        <div class="btn-row"><button type="submit" class="btn btn--primary">Send for approval</button></div>
        <div data-result hidden></div>
      </form>
    </section>
  </div>

  <div class="grid grid--2 mt-3">
    <section class="panel" aria-labelledby="p-move">
      <header class="panel__head"><h2 id="p-move">Record a stock move</h2></header>
      <form class="panel__body form" data-move-form>
        <div class="field">
          <label for="msku" class="required">Part</label>
          <select id="msku" name="sku" required></select>
        </div>
        <div class="grid grid--2 grid--tight">
          <div class="field">
            <label for="mreason" class="required">What happened</label>
            <select id="mreason" name="reason" required>
              <option value="received">Received</option>
              <option value="used">Used, off the BOM</option>
              <option value="count">Stock count</option>
            </select>
          </div>
          <div class="field">
            <label for="mqty" class="required">Quantity</label>
            <input type="number" id="mqty" name="quantity" class="mono" required min="0" step="any" inputmode="decimal">
          </div>
        </div>
        <p class="field__hint">A stock count gives what is on the shelf now; the difference is recorded.</p>
        <div class="field">
          <label for="mref">Reference</label>
          <input type="text" id="mref" name="reference" class="mono" placeholder="Delivery note, reason" autocomplete="off">
        </div>
        <div class="btn-row"><button type="submit" class="btn">Record it</button></div>
        <div data-result hidden></div>
      </form>
    </section>

    <section class="panel" aria-labelledby="p-add">
      <header class="panel__head"><h2 id="p-add">Add a material</h2></header>
      <form class="panel__body form" data-material-form>
        <div class="grid grid--2 grid--tight">
          <div class="field">
            <label for="asku" class="required">Part number</label>
            <input type="text" id="asku" name="sku" class="mono" required placeholder="BRK-U2" autocomplete="off"
                   autocapitalize="characters" spellcheck="false">
          </div>
          <div class="field">
            <label for="aname" class="required">Name</label>
            <input type="text" id="aname" name="name" required placeholder="Rail bracket" autocomplete="off">
          </div>
          <div class="field">
            <label for="aper">Per leg</label>
            <input type="number" id="aper" name="per_leg" class="mono" min="0" step="any" inputmode="decimal" placeholder="0">
          </div>
          <div class="field">
            <label for="areorder">Reorder at</label>
            <input type="number" id="areorder" name="reorder_at" class="mono" min="0" step="any" inputmode="decimal" placeholder="0">
          </div>
          <div class="field">
            <label for="aonhand">Opening stock</label>
            <input type="number" id="aonhand" name="on_hand" class="mono" min="0" step="any" inputmode="decimal" placeholder="0">
          </div>
          <div class="field">
            <label for="aunit">Unit</label>
            <input type="text" id="aunit" name="unit" placeholder="each" autocomplete="off">
          </div>
        </div>
        <div class="field">
          <label for="asupplier">Supplier</label>
          <input type="text" id="asupplier" name="supplier" autocomplete="off">
        </div>
        <div class="btn-row"><button type="submit" class="btn">Add material</button></div>
        <div data-result hidden></div>
      </form>
    </section>
  </div>
</section>
""",
     head_extra=NOINDEX, foot_extra=MFG)


page("internal/timesheets.html", 1, "Timesheets",
     "Clock in and out, book hours against a batch, and see the facility team's week.",
     regbar("timesheets.html") + """
<section class="wrap dash-head">
  <div class="dash-head__id">
    <span class="eyebrow">Manufacturing &middot; team</span>
    <h1>Timesheets</h1>
    <p class="lede">Hours are booked against the batch they were spent on, so every batch carries its real labour
    cost. You clock yourself in and out; an administrator can enter a finished stretch for anyone.</p>
  </div>
  <div class="btn-row weeknav" role="group" aria-label="Week">
    <button type="button" class="btn btn--sm" data-week="-1" aria-label="Previous week">&larr;</button>
    <span class="mono" data-week-label>&mdash;</span>
    <button type="button" class="btn btn--sm" data-week="1" aria-label="Next week">&rarr;</button>
  </div>
</section>

<section class="wrap mt-2" data-time-page>
  <div data-error hidden></div>

  <div class="panels">
    <section class="panel" aria-labelledby="p-clock">
      <header class="panel__head">
        <h2 id="p-clock">Your time</h2>
        <span class="panel__meta" data-me></span>
      </header>
      <form class="panel__body form" data-clock-form>
        <p class="clock" data-clock-state aria-live="polite">&mdash;</p>
        <div class="field" data-when-out>
          <label for="cbatch">Working on</label>
          <select id="cbatch" name="batch_number"><option value="">Not batch work</option></select>
        </div>
        <div class="field" data-when-out>
          <label for="cact">Activity</label>
          <input type="text" id="cact" name="activity" placeholder="Assembly, QA, receiving…" autocomplete="off">
        </div>
        <div class="btn-row"><button type="submit" class="btn btn--primary" data-clock-btn>Clock in</button></div>
        <div data-result hidden></div>
      </form>
    </section>

    <section class="panel panel--span2" aria-labelledby="p-week">
      <header class="panel__head">
        <h2 id="p-week">Facility team &middot; this week</h2>
        <span class="panel__meta mono">hours</span>
      </header>
      <div data-week-table><p class="muted small panel__body">Loading&hellip;</p></div>
    </section>
  </div>

  <div class="grid grid--2 mt-2">
    <section class="panel" aria-labelledby="p-bybatch">
      <header class="panel__head"><h2 id="p-bybatch">Hours by batch</h2></header>
      <div class="panel__body" data-by-batch></div>
    </section>

    <section class="panel" aria-labelledby="p-entry">
      <header class="panel__head">
        <h2 id="p-entry">Enter time for someone</h2>
        <span class="panel__meta">administrators</span>
      </header>
      <form class="panel__body form" data-entry-form>
        <div class="grid grid--2 grid--tight">
          <div class="field">
            <label for="emember" class="required">Operator id</label>
            <input type="text" id="emember" name="member" class="mono" required autocomplete="off">
          </div>
          <div class="field">
            <label for="ename" class="required">Name</label>
            <input type="text" id="ename" name="member_name" required autocomplete="off">
          </div>
          <div class="field">
            <label for="ein" class="required">Start</label>
            <input type="datetime-local" id="ein" name="clock_in" required>
          </div>
          <div class="field">
            <label for="eout" class="required">End</label>
            <input type="datetime-local" id="eout" name="clock_out" required>
          </div>
        </div>
        <div class="field">
          <label for="ebatch">Batch</label>
          <select id="ebatch" name="batch_number"><option value="">Not batch work</option></select>
        </div>
        <div class="btn-row"><button type="submit" class="btn">Enter it</button></div>
        <div data-result hidden></div>
      </form>
    </section>
  </div>
</section>
""",
     head_extra=NOINDEX, foot_extra=MFG)


page("internal/metrics.html", 1, "Metrics",
     "Manufacturing metrics: first-pass yield, early-life failures, cycle time, labour per unit and days of cover.",
     regbar("metrics.html") + """
<section class="wrap dash-head">
  <div class="dash-head__id">
    <span class="eyebrow">Manufacturing &middot; performance</span>
    <h1>Metrics</h1>
    <p class="lede">Five numbers, one per question: are we building it right, does it hold up in the field, how
    fast, what it costs in hours, and whether we will run out. Each is computed from the records on these pages;
    none is typed in, and a number with nothing behind it shows as a gap rather than a zero.</p>
  </div>
  <div class="btn-row" role="group" aria-label="Period" data-period>
    <button type="button" class="btn btn--sm" data-days="30" aria-pressed="false">30 days</button>
    <button type="button" class="btn btn--sm" data-days="90" aria-pressed="true">90 days</button>
    <button type="button" class="btn btn--sm" data-days="365" aria-pressed="false">Year</button>
  </div>
</section>

<section class="wrap mt-2" data-metrics-page>
  <div data-error hidden></div>

  <div class="kpis">
    <article class="kpi kpi--quality">
      <span class="kpi__k">Quality</span>
      <h2>First-pass yield</h2>
      <b class="kpi__v" data-m="fpy">&mdash;</b>
      <p class="kpi__how" data-m-how="fpy">Frames passing QA first time, of all inspected.</p>
    </article>
    <article class="kpi kpi--reliability">
      <span class="kpi__k">Reliability</span>
      <h2>Early-life failures</h2>
      <b class="kpi__v" data-m="elf">&mdash;</b>
      <p class="kpi__how" data-m-how="elf">Commissioned legs flagged or dispatched within 90 days.</p>
    </article>
    <article class="kpi kpi--speed">
      <span class="kpi__k">Speed</span>
      <h2>Batch cycle time</h2>
      <b class="kpi__v" data-m="cycle">&mdash;</b>
      <p class="kpi__how" data-m-how="cycle">Logged to released, median across batches.</p>
    </article>
    <article class="kpi kpi--cost">
      <span class="kpi__k">Cost</span>
      <h2>Labour per unit</h2>
      <b class="kpi__v" data-m="labour">&mdash;</b>
      <p class="kpi__how" data-m-how="labour">Hours booked to released batches, over their frames.</p>
    </article>
    <article class="kpi kpi--supply">
      <span class="kpi__k">Supply</span>
      <h2>Shortest cover</h2>
      <b class="kpi__v" data-m="cover">&mdash;</b>
      <p class="kpi__how" data-m-how="cover">Days until the tightest BOM part runs out at its current draw.</p>
    </article>
  </div>

  <div class="panels mt-2">
    <section class="panel panel--span2" aria-labelledby="p-yield">
      <header class="panel__head">
        <h2 id="p-yield">Yield and field returns by batch</h2>
        <span class="panel__meta mono">latest 12</span>
      </header>
      <div data-by-batch><p class="muted small panel__body">Loading&hellip;</p></div>
      <footer class="panel__foot">
        <span class="small muted">A batch with low yield that also comes back from the field points at a part lot or
        a process step. The lots are on the batch record.</span>
      </footer>
    </section>

    <section class="panel" aria-labelledby="p-stages">
      <header class="panel__head">
        <h2 id="p-stages">Where cycle time goes</h2>
        <span class="panel__meta mono">median days</span>
      </header>
      <div class="panel__body" data-stages></div>
      <footer class="panel__foot">
        <span class="legend"><i class="swatch swatch--info"></i>Assembly</span>
        <span class="legend"><i class="swatch swatch--flag"></i>QA</span>
        <span class="legend"><i class="swatch swatch--self"></i>Commissioning</span>
      </footer>
    </section>
  </div>
</section>
""",
     head_extra=NOINDEX, foot_extra=MFG)
