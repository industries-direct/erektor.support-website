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
page("index.html", 0, "Support", 
     "Service portal for Erektor legs: schedule maintenance, request a replacement leg on site, "
     "read the diagrams and procedures, and track controller firmware.",
     """
<section class="wrap pt-1" >
  <span class="eyebrow">Erektor Return System</span>
  <h1>Every leg comes home. This is where you tell us what to do with it.</h1>
  <p class="lede">The support portal is the operator-facing edge of ERS. Everything here is a write against
  one leg&rsquo;s record: flag it for the reconditioning line, pull a replacement from the pool, or read
  the procedure that tells you which of those you actually need.</p>
</section>

<section class="wrap mt-2"  data-triage>
  <span class="eyebrow eyebrow--plain">Start here</span>
  <div class="field limit-input" >
    <label for="triage">Fault code or symptom</label>
    <input type="search" id="triage" class="mono" data-triage-input placeholder="LFT-45" autocomplete="off">
    <p class="field__hint">Codes read <code>SUB-nn</code> &mdash; for example <code>DRV-40</code> or <code>NET-20</code>.
    The table below picks your route and carries the code into the right form.</p>
  </div>
  <div data-triage-out hidden class="mt-1 limit"></div>
  <noscript>
    <p class="note note--info">The lookup needs JavaScript. The full
    <a href="docs/faults.html">fault code index</a> works without it.</p>
  </noscript>
</section>

<section class="wrap mt-2 decision-rail" aria-labelledby="decision-title">
  <div class="decision-rail__intro">
    <h2 id="decision-title">One question decides the route.</h2>
    <p>Can the leg finish this session?</p>
  </div>
  <div class="decision-rail__steps">
    <div class="decision-rail__step">
      <span class="decision-rail__answer">Yes</span>
      <p>Keep it working, then <a href="maintenance.html">flag it for ERS</a>.</p>
    </div>
    <div class="decision-rail__step">
      <span class="decision-rail__answer">No</span>
      <p><a href="dispatch.html">Request a replacement</a> for the site.</p>
    </div>
    <div class="decision-rail__step">
      <span class="decision-rail__answer">Fix on the floor</span>
      <p><a href="docs/faults.html">Check the fault code</a> for the procedure.</p>
    </div>
  </div>
</section>

<section class="wrap mt-2">
  <div class="grid grid--3">
    <a class="card card--urgent" href="dispatch.html">
      <h3>Request a replacement leg</h3>
      <p>A leg cannot finish its session. We send a healthy one from the pool and the failed one rides
      back to check-in with the driver.</p>
      <div class="card__meta">Emergency &middot; 24/7</div>
    </a>
    <a class="card card--plan" href="maintenance.html">
      <h3>Flag a leg for ERS</h3>
      <p>Something is wrong but the leg can finish the job. No truck &mdash; the flag rides on its record
      and ERS diverts it at inspection when it returns.</p>
      <div class="card__meta">Planned &middot; no site visit</div>
    </a>
    <a class="card card--docs" href="docs/">
      <h3>Diagrams and procedures</h3>
      <p>Leg anatomy, dock and convergence, module pairing, the return line, and the safety cases &mdash;
      including the walk-off.</p>
      <div class="card__meta">Reference</div>
    </a>
  </div>
  <p class="mt-1"><a href="docs/faults.html">Browse the full fault code index &rarr;</a></p>
</section>

<div class="specstrip band-gap" >
  <div class="wrap specstrip-in">
    <div class="spec"><div class="n">3<small>&nbsp;routes</small></div><div class="k">Fix &middot; flag &middot; dispatch</div></div>
    <div class="spec"><div class="n">2<small>&nbsp;serials</small></div><div class="k">Electronics and mechanical</div></div>
    <div class="spec"><div class="n">24/7</div><div class="k">Emergency dispatch</div></div>
    <div class="spec"><div class="n">0<small>&nbsp;field repairs</small></div><div class="k">Legs are swapped, not fixed</div></div>
  </div>
</div>

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

<section class="wrap mt-5" >
  <div class="sec-head">
    <span class="eyebrow">Also here</span>
    <h2>Fleet and firmware.</h2>
  </div>
  <div class="grid grid--2">
    <a class="card card--fw" href="firmware/index.html">
      <h3>Controller firmware</h3>
      <p>Current versions per target, what changed, and how a signed bundle actually reaches a leg that
      has no internet connection of its own.</p>
      <div class="card__meta">Manifest &middot; release notes</div>
    </a>
    <a class="card" href="docs/leg.html#identity">
      <h3>Serials and identity</h3>
      <p>Why a leg carries two serial numbers, which one your request is filed against, and what happens
      to the wear history when a controller is swapped.</p>
      <div class="card__meta">Read this before filing anything</div>
    </a>
  </div>
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
    import docs  # noqa: F401  registers the remaining pages
    write()
