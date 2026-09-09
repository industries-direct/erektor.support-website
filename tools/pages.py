#!/usr/bin/env python3
"""Page content for the EREKTOR support portal. Run: python3 tools/pages.py"""

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from build import page, write, rel  # noqa: E402
import diagrams as D  # noqa: E402


# ===========================================================================
# Home — the hub, and the explanation of how the three routes relate
# ===========================================================================
page("index.html", 0, "Service console",
     "Service console for Erektor legs: route a fault code, flag a leg for ERS, dispatch a replacement "
     "to a site, and read the current fault table, firmware manifest and fleet catalog.",
     """
<section class="wrap dash-head">
  <div class="dash-head__id">
    <span class="eyebrow">Erektor Return System</span>
    <h1>Service console</h1>
    <p class="lede">Every leg comes home. One question routes it &mdash; can it finish this session? Fix it on
    the floor, flag it for ERS, or dispatch a replacement.</p>
  </div>
  <dl class="statbar" aria-label="Portal status">
    <div>
      <dt>Dispatch line</dt>
      <dd><span class="dot dot--ok" aria-hidden="true"></span>Staffed 24/7</dd>
    </div>
    <div>
      <dt>Fault table</dt>
      <dd class="mono" data-dash-rev="faults">rev &mdash;</dd>
    </div>
    <div>
      <dt>Firmware manifest</dt>
      <dd class="mono" data-dash-rev="firmware">rev &mdash;</dd>
    </div>
    <div>
      <dt>Local time</dt>
      <dd class="mono" data-dash-clock>&mdash;</dd>
    </div>
  </dl>
</section>

<section class="wrap console" data-triage aria-labelledby="console-title">
  <h2 id="console-title" class="console__title">Route a fault code</h2>
  <div class="console__bar">
    <label for="triage" class="visually-hidden">Fault code or symptom</label>
    <span class="console__prompt mono" aria-hidden="true">&gt;</span>
    <input type="search" id="triage" class="mono console__input" data-triage-input
           placeholder="LFT-45 — or type a symptom" autocomplete="off">
  </div>
  <p class="console__hint">Codes read <code>SUB-nn</code>, for example <code>DRV-40</code> or <code>NET-20</code>.
  The lookup picks the route and carries the code into the right form.
  <a href="docs/faults.html">Full fault code index &rarr;</a></p>
  <div data-triage-out hidden class="mt-1 limit"></div>
  <noscript>
    <p class="note note--info">The lookup needs JavaScript. The full
    <a href="docs/faults.html">fault code index</a> works without it.</p>
  </noscript>
</section>

<section class="wrap mt-2" aria-labelledby="routes-title">
  <div class="dash-secline">
    <h2 id="routes-title">Three routes</h2>
    <p>Sending a technician is the exception. Counts are live from the fault table.</p>
  </div>
  <div class="routes">
    <a class="routetile routetile--self" href="docs/faults.html">
      <span class="routetile__top">
        <span class="routetile__k">Leg keeps working</span>
        <span class="routetile__n mono"><b data-dash-count="self">&mdash;</b><small>codes</small></span>
      </span>
      <h3>Fix on the floor</h3>
      <p>Operator-serviceable. Follow the procedure on the code &mdash; no ticket, no record change.</p>
      <span class="routetile__cta">Open the procedures &rarr;</span>
    </a>
    <a class="routetile routetile--flag" href="maintenance.html">
      <span class="routetile__top">
        <span class="routetile__k">Finishes the session</span>
        <span class="routetile__n mono"><b data-dash-count="flag">&mdash;</b><small>codes</small></span>
      </span>
      <h3>Flag a leg for ERS</h3>
      <p>No truck. The flag rides on the leg&rsquo;s record and ERS diverts it at inspection when it comes home.</p>
      <span class="routetile__cta">Flag a leg &rarr;</span>
    </a>
    <a class="routetile routetile--dispatch" href="dispatch.html">
      <span class="routetile__top">
        <span class="routetile__k">Cannot finish the session</span>
        <span class="routetile__n mono"><b data-dash-count="dispatch">&mdash;</b><small>codes</small></span>
      </span>
      <h3>Dispatch a replacement</h3>
      <p>A healthy leg goes out from the pool; the failed one rides back to check-in with the driver.</p>
      <span class="routetile__cta">Request a replacement &rarr;</span>
    </a>
  </div>
</section>

<section class="wrap mt-3 panels" aria-label="Fleet reference">

  <section class="panel panel--wide" aria-labelledby="p-load">
    <header class="panel__head">
      <h2 id="p-load">Fault table by subsystem</h2>
      <span class="panel__meta mono" data-dash-meta="faults">&mdash;</span>
    </header>
    <div class="panel__body" data-dash-subsystems>
      <p class="muted small">Every code in the table belongs to one subsystem and resolves to one route.
      <a href="docs/faults.html">Open the index</a> to read them.</p>
    </div>
    <footer class="panel__foot">
      <span class="legend"><i class="swatch swatch--self"></i>Fix on the floor</span>
      <span class="legend"><i class="swatch swatch--flag"></i>Flag for ERS</span>
      <span class="legend"><i class="swatch swatch--dispatch"></i>Dispatch</span>
    </footer>
  </section>

  <section class="panel" aria-labelledby="p-fw">
    <header class="panel__head">
      <h2 id="p-fw">Controller firmware</h2>
      <span class="panel__meta mono" data-dash-meta="firmware">&mdash;</span>
    </header>
    <div class="panel__body" data-dash-firmware>
      <p class="muted small">Current versions per target, and how a signed bundle reaches a leg that has no
      internet path of its own.</p>
    </div>
    <footer class="panel__foot">
      <a href="firmware/index.html">Manifest and release notes &rarr;</a>
    </footer>
  </section>

  <section class="panel" aria-labelledby="p-fleet">
    <header class="panel__head">
      <h2 id="p-fleet">Fleet</h2>
      <span class="panel__meta mono" data-dash-meta="hardware">&mdash;</span>
    </header>
    <div class="panel__body" data-dash-fleet>
      <p class="muted small">Leg variants in the pool, the controller each one carries, and which are legacy.</p>
    </div>
    <footer class="panel__foot">
      <a href="docs/leg.html">Leg anatomy and diagrams &rarr;</a>
    </footer>
  </section>

  <section class="panel" aria-labelledby="p-id">
    <header class="panel__head">
      <h2 id="p-id">Serials and identity</h2>
      <span class="panel__meta mono">2 per leg</span>
    </header>
    <div class="panel__body" data-dash-identity>
      <p class="muted small">A leg carries two serial numbers. Firmware and pairing follow the electronics
      serial; wear, intervals and warranty follow the stamped mechanical serial.</p>
    </div>
    <footer class="panel__foot">
      <a href="docs/leg.html#identity">Read this before filing anything &rarr;</a>
    </footer>
  </section>

</section>

<section class="wrap mt-5" >
  <div class="sec-head">
    <span class="eyebrow">How the routes relate</span>
    <h2>Sending a technician is the exception, not the default.</h2>
    <p>A fielded leg is never repaired where it stands. It shares no wiring, no bus and no rigidity with
    any other leg, and its module pairing exists only in software &mdash; so the unit of service is the whole
    leg, swapped from the pool. That makes the interesting question not <em>how do we fix this</em> but
    <em>can this leg finish its session</em>.</p>
  </div>
  """ + D.TRIAGE_ROUTES + """
</section>
""")


# ===========================================================================
# Dispatch — replacement leg to site
# ===========================================================================
page("dispatch.html", 0, "Request a replacement leg",
     "Request immediate dispatch of a replacement Erektor leg to a site when a leg cannot finish its session.",
     """
<section class="wrap wrap--narrow">
  <p class="crumbs"><a href="index.html">Support</a><span>/</span>Dispatch</p>
  <span class="eyebrow">Emergency &middot; staffed 24/7</span>
  <h1>Request a replacement leg</h1>
  <p class="lede">Use this when a leg cannot finish its session. We send a healthy leg from the pool; the
  failed leg rides back to check-in with the same driver. Nothing is repaired on site.</p>

  <div class="note note--crit">
    <p class="note__title">Before you file</p>
    <p>Get the structure to a safe state first. If the fault is on a lift axis under load, set the station
    down on its own supports and clear the work area before doing anything else &mdash; see
    <a href="docs/safety.html#load">holding a load</a>.</p>
  </div>

  <div class="note note--info">
    <p class="note__title">If the leg can finish the job</p>
    <p>You do not need a truck. <a href="maintenance.html">Flag it for ERS</a> instead and it will be
    diverted at inspection when it comes home.</p>
  </div>

  <form class="form" data-kind="dispatch" data-result="result" class="mt-3">
    <fieldset>
      <legend>The failed leg</legend>
      <div class="field">
        <label for="el" class="required">Electronics serial</label>
        <input type="text" id="el" name="electronics_serial" class="mono" data-serial="electronics" required autocomplete="off">
        <p class="field__hint">From the ClearCore About screen, or the session controller roster. A dispatch
        is filed against the electronics serial because that is what has to come out of tonight&rsquo;s roster.</p>
        <p class="field__err" data-serial-err hidden></p>
      </div>
      <div class="field">
        <label for="mx">Mechanical serial <span class="muted">(if you can reach it)</span></label>
        <input type="text" id="mx" name="mechanical_serial" class="mono" data-serial="mechanical" autocomplete="off">
        <p class="field__hint">Stamped on the frame above the bracket face. Helps us close the wear record,
        but do not climb for it.</p>
        <p class="field__err" data-serial-err hidden></p>
      </div>
      <div class="field">
        <label for="variant">Leg variant</label>
        <select id="variant" name="leg_variant" data-leg-variant>
          <option value="">Not sure</option>
        </select>
        <p class="field__hint">Controller: <span class="mono" data-controller-out>&mdash;</span></p>
      </div>
      <div class="field">
        <label for="code">Fault code</label>
        <input type="text" id="code" name="fault_code" class="mono" placeholder="DRV-40" autocomplete="off">
        <p class="field__hint">If the controller gave one. Leave blank if it did not &mdash; do not wait for a
        code to file this.</p>
      </div>
      <div class="field">
        <label for="symptom" class="required">What the leg is doing</label>
        <textarea id="symptom" name="symptom" required placeholder="Will not turn under drive command. Lift holds fine. Module levelled before the fault."></textarea>
        <p class="field__hint">What it does, what it will not do, and what you had it doing when it stopped.</p>
      </div>
    </fieldset>

    <fieldset>
      <legend>Where to send the replacement</legend>
      <div class="field">
        <label for="facility" class="required">Facility or operator</label>
        <input type="text" id="facility" name="facility" required autocomplete="organization">
      </div>
      <div class="field">
        <label for="site" class="required">Site address</label>
        <textarea id="site" name="site_address" required placeholder="Street, city, and how a flatbed gets in."></textarea>
        <p class="field__hint">Include access notes. A replacement leg arrives on a truck and walks itself off.</p>
      </div>
      <div class="field">
        <label for="access">Site access window</label>
        <input type="text" id="access" name="access_window" placeholder="Gate open 06:00–20:00, contact on arrival">
      </div>
      <div class="field">
        <label for="stage">Where the session is</label>
        <select id="stage" name="session_stage">
          <option value="">Select…</option>
          <option>On the factory floor — pre-load</option>
          <option>Loaded on the trailer</option>
          <option>At destination — before walk-off</option>
          <option>Walked off, station not yet placed</option>
          <option>Station placed, legs releasing</option>
        </select>
        <p class="field__hint">This sets the priority. A module part-way through a walk-off outranks
        everything else in the queue.</p>
      </div>
    </fieldset>

    <fieldset>
      <legend>Who we call back</legend>
      <div class="field">
        <label for="cname" class="required">Name</label>
        <input type="text" id="cname" name="contact_name" required autocomplete="name">
      </div>
      <div class="field">
        <label for="cphone">Phone</label>
        <input type="tel" id="cphone" name="contact_phone" autocomplete="tel">
      </div>
      <div class="field">
        <label for="cemail">Email</label>
        <input type="email" id="cemail" name="contact_email" autocomplete="email">
        <p class="field__hint">Give at least one of phone or email. For an active site, give the phone.</p>
      </div>
    </fieldset>

    <div class="btn-row">
      <button type="submit" class="btn btn--primary">Request dispatch</button>
      <a class="btn" href="maintenance.html">This can wait &mdash; flag it instead</a>
    </div>
  </form>

  <div id="result" hidden class="mt-2"></div>

  <h2>What happens next</h2>
  <ol class="steps">
    <li><b>We confirm by your contact method.</b> Reference number first, then an ETA once a pool leg is
    assigned.</li>
    <li><b>Take the failed leg out of session.</b> Release it on the session controller so the module
    re-forms without it. Do not leave it claimed.</li>
    <li><b>Leave it standing.</b> A leg is stable on its own tripod. Do not lay it down and do not strap it
    to the station.</li>
    <li><b>The replacement walks itself off the truck</b> and is claimed into the session under its own
    electronics serial. The pairing re-forms in software; nothing is re-measured.</li>
    <li><b>The failed leg goes back with the driver</b> and enters ERS at check-in, where inspection
    diverts it.</li>
  </ol>
</section>
""")


# ===========================================================================
# Maintenance — flag for the ERS line
# ===========================================================================
page("maintenance.html", 0, "Flag a leg for ERS",
     "Flag an Erektor leg for the reconditioning line so it is diverted at inspection when it next returns. No site visit.",
     """
<section class="wrap wrap--narrow">
  <p class="crumbs"><a href="index.html">Support</a><span>/</span>Maintenance</p>
  <span class="eyebrow">Planned &middot; no site visit</span>
  <h1>Flag a leg for ERS</h1>
  <p class="lede">Use this when something is wrong but the leg can still finish its session. No truck is
  sent. The flag rides on the leg&rsquo;s record, and ERS diverts it out of the line at inspection when it
  next comes home.</p>

  <div class="note note--warn">
    <p class="note__title">Filed against the mechanical serial</p>
    <p>Wear, service intervals and warranty accrue against the stamped frame number, not the electronics.
    A flag filed against the frame survives a controller swap; one filed against the electronics would be
    lost the next time the ClearCore is replaced. <a href="docs/leg.html#identity">Why there are two
    serials</a>.</p>
  </div>

  <form class="form" data-kind="flag" data-result="result" class="mt-3">
    <fieldset>
      <legend>The leg</legend>
      <div class="field">
        <label for="mx" class="required">Mechanical serial</label>
        <input type="text" id="mx" name="mechanical_serial" class="mono" data-serial="mechanical" required autocomplete="off">
        <p class="field__hint">Stamped on the frame above the bracket face. Not the number on the
        ClearCore screen.</p>
        <p class="field__err" data-serial-err hidden></p>
      </div>
      <div class="field">
        <label for="el">Electronics serial <span class="muted">(optional)</span></label>
        <input type="text" id="el" name="electronics_serial" class="mono" data-serial="electronics" autocomplete="off">
        <p class="field__hint">Useful for correlating with controller logs, but the flag follows the frame.</p>
        <p class="field__err" data-serial-err hidden></p>
      </div>
      <div class="field">
        <label for="variant">Leg variant</label>
        <select id="variant" name="leg_variant" data-leg-variant>
          <option value="">Not sure</option>
        </select>
        <p class="field__hint">Controller: <span class="mono" data-controller-out>&mdash;</span></p>
      </div>
    </fieldset>

    <fieldset>
      <legend>Why</legend>
      <div class="field">
        <label for="code">Fault code</label>
        <input type="text" id="code" name="fault_code" class="mono" placeholder="DRV-21" autocomplete="off">
      </div>
      <div class="field">
        <label for="reason" class="required">What you observed</label>
        <textarea id="reason" name="reason" required placeholder="Drive current climbing over the last few sessions. Still completes convergence, but slower than the other legs in the module."></textarea>
      </div>
      <div class="field">
        <label for="urgency">How long it can stay in rotation</label>
        <div class="choice">
          <input type="radio" id="u1" name="urgency" value="next-return" checked>
          <label for="u1"><b>Divert on its next return</b><span>Default. The leg finishes this session and leaves the line at inspection.</span></label>
        </div>
        <div class="choice">
          <input type="radio" id="u2" name="urgency" value="restrict">
          <label for="u2"><b>Restrict until serviced</b><span>Keep it in rotation but exclude it from walk-off sessions and full-load modules.</span></label>
        </div>
        <div class="choice">
          <input type="radio" id="u3" name="urgency" value="pull">
          <label for="u3"><b>Pull at end of session</b><span>Do not let it be claimed again. It goes to ERS and stays there.</span></label>
        </div>
      </div>
      <div class="field">
        <label for="hours">Approximate motor-hours <span class="muted">(if the roster shows them)</span></label>
        <input type="text" id="hours" name="motor_hours" class="mono" placeholder="1840" autocomplete="off">
      </div>
    </fieldset>

    <fieldset>
      <legend>Who filed it</legend>
      <div class="field">
        <label for="facility" class="required">Facility</label>
        <input type="text" id="facility" name="facility" required autocomplete="organization">
      </div>
      <div class="field">
        <label for="cname" class="required">Name</label>
        <input type="text" id="cname" name="contact_name" required autocomplete="name">
      </div>
      <div class="field">
        <label for="cemail">Email</label>
        <input type="email" id="cemail" name="contact_email" autocomplete="email">
      </div>
      <div class="field">
        <label for="cphone">Phone</label>
        <input type="tel" id="cphone" name="contact_phone" autocomplete="tel">
        <p class="field__hint">Give at least one of email or phone.</p>
      </div>
    </fieldset>

    <div class="btn-row">
      <button type="submit" class="btn btn--primary">File the flag</button>
      <a class="btn" href="dispatch.html">This cannot wait &mdash; request a swap</a>
    </div>
  </form>

  <div id="result" hidden class="mt-2"></div>

  <h2>Where the flag goes</h2>
  """ + D.ERS_LINE + """
  <p>The flag is read at inspection, the second stage of the line. A flagged leg is diverted there instead
  of continuing to cleaning and battery swap. Because the leg was coming home anyway, this costs no
  transport and no site time &mdash; which is the whole reason the route exists.</p>
  <p><a href="docs/ers.html">More on the return line and service intervals &rarr;</a></p>
</section>
""")

# ===========================================================================
# 404 — served by the asset layer in place of any missing path
#
# Depth "/" rather than 0: this page answers requests at every depth, so its
# links have to be root-absolute.
# ===========================================================================
page("404.html", "/", "Page not found",
     "That page does not exist. The service routes, the fault code index and the "
     "procedures are all one click from here.",
     """
<section class="wrap pt-1">
  <span class="eyebrow">404</span>
  <h1>That page is not here.</h1>
  <p class="lede">The link may be from an older generation of this site, or a label may have been
  mis-keyed. Nothing you were trying to file has been lost &mdash; nothing is submitted until you send
  it from one of the two forms below.</p>
</section>

<section class="wrap">
  <div class="grid grid--3">
    <a class="card card--urgent" href="/dispatch.html">
      <h3>Request a replacement leg</h3>
      <p>A leg cannot finish its session and you need a healthy one from the pool today.</p>
      <div class="card__meta">Emergency &middot; 24/7</div>
    </a>
    <a class="card card--plan" href="/maintenance.html">
      <h3>Flag a leg for ERS</h3>
      <p>The leg can finish the job. The flag rides on its record and diverts it at inspection.</p>
      <div class="card__meta">Planned &middot; no site visit</div>
    </a>
    <a class="card card--docs" href="/docs/">
      <h3>Diagrams and procedures</h3>
      <p>Leg anatomy, operating procedures, the return line, and the safety cases.</p>
      <div class="card__meta">Reference</div>
    </a>
  </div>
</section>

<section class="wrap mt-4">
  <div class="sec-head">
    <span class="eyebrow">Looking for a code?</span>
    <h2>Every fault code has a page.</h2>
    <p>The index resolves a code to one of the three routes and carries it into the right form.</p>
  </div>
  <p><a href="/docs/faults.html">Open the fault code index &rarr;</a></p>
</section>
""",
     head_extra='\n<meta name="robots" content="noindex">')

if __name__ == "__main__":
    import docs      # noqa: F401  registers the documentation and firmware pages
    import internal  # noqa: F401  registers the gated registry pages
    write()
