#!/usr/bin/env python3
"""Page content for the EREKTOR support portal. Run: python3 tools/pages.py"""

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from build import page, write, rel, FAULT_CODES  # noqa: E402
import diagrams as D  # noqa: E402


# ===========================================================================
# Home — the public introduction. Signed in, the Worker sends / to the
# account Overview instead (src/portal.js, serveHome).
# ===========================================================================
MARK_ERS = '<span class="hm-mark" aria-hidden="true"><i></i><i></i><i></i><i></i></span>'
MARK_ESC = '<span class="hm-mark hm-mark--esc" aria-hidden="true"><i></i><i></i><i></i><i></i></span>'

page("index.html", 0, "Service console",
     "The Erektor Service Console and the Erektor Return System: one account, and one stamped frame serial "
     "that carries every leg's history from its first build to its retirement.",
     """
<section class="wrap hm-hero">
  <div class="hm-hero__text">
    <span class="eyebrow">Erektor fleet lifecycle</span>
    <h1>Two consoles. One serial for every leg.</h1>
    <p class="lede">The Erektor Return System runs the recovery line at each of your facilities, on a dedicated
    server installed with the line, so what the line records stays on site. The Service Console is online,
    where your company looks after the fleet while it is out on builds. Every leg carries the serial stamped
    into its frame through both, so its life reads as one history.</p>
    <div class="btn-row mt-1">
      <a class="btn btn--primary" href="/account/signin.html" data-signin>Sign in</a>
      <a class="btn" href="https://erektor-return.systems/" rel="noopener">Open the Return System &#8599;</a>
    </div>
    <p class="small muted mt-0">One account signs in to both.</p>
  </div>

  <div class="hm-flow" role="img" aria-label="The Return System at the facility and the Service Console online share one account and follow each leg by its frame serial.">
    <div class="hm-node">
      """ + MARK_ERS + """
      <div><strong>Erektor Return System</strong><span>On a server at each facility &middot; when a leg comes home</span></div>
    </div>
    <div class="hm-link" aria-hidden="true"></div>
    <div class="hm-node hm-node--record">
      <span class="hm-node__key mono">Frame serial</span>
      <div><strong>One account &middot; one serial</strong><span>Your company, facilities and the stamped frame serial</span></div>
    </div>
    <div class="hm-link" aria-hidden="true"></div>
    <div class="hm-node">
      """ + MARK_ESC + """
      <div><strong>Service Console</strong><span>Online &middot; while a leg is out on a build</span></div>
    </div>
  </div>
</section>

<section class="wrap mt-5" aria-labelledby="cmp-title">
  <div class="sec-head">
    <span class="eyebrow">Side by side</span>
    <h2 id="cmp-title">Each console covers half of a leg&rsquo;s life.</h2>
    <p>A leg spends its working life going out to builds and coming home again. The Return System records
    what happens when it comes home; the Service Console covers the time it is out. One account signs in to
    both.</p>
  </div>
  <div class="table-scroll">
    <table class="hm-compare">
      <thead>
        <tr>
          <th scope="col"><span class="visually-hidden">Compared</span></th>
          <th scope="col"><span class="hm-colhead">""" + MARK_ERS + """Erektor Return System</span></th>
          <th scope="col"><span class="hm-colhead">""" + MARK_ESC + """Service Console</span></th>
        </tr>
      </thead>
      <tbody>
        <tr><th scope="row">Where it runs</th>
          <td>At each facility, beside the recovery conveyor</td>
          <td>In the field and the office, anywhere with a browser</td></tr>
        <tr><th scope="row">Who uses it</th>
          <td>Facility operations teams</td>
          <td>Your field crews and fleet managers</td></tr>
        <tr><th scope="row">Part of the leg&rsquo;s life</th>
          <td>Coming home: check-in, inspection, cleaning, battery swap, diagnostics, controller check-in, back to
          the pool</td>
          <td>Out on builds: delivery to site, flags raised in the field, replacements dispatched</td></tr>
        <tr><th scope="row">What you do there</th>
          <td>Recondition legs and keep the available pool full</td>
          <td>Request a replacement, schedule maintenance, read the procedures and the firmware manifest</td></tr>
        <tr><th scope="row">What it records</th>
          <td>Check-ins, inspection and diagnostic results, pack swaps, service records</td>
          <td>Maintenance flags, emergency replacements and the fleet&rsquo;s leg registry</td></tr>
        <tr><th scope="row">Where the data lives</th>
          <td>On a dedicated server at the facility, installed with the line</td>
          <td>Online, in the Erektor leg registry</td></tr>
        <tr><th scope="row">Without the internet</th>
          <td>Keeps running; the line never waits on a connection</td>
          <td>Needs a connection</td></tr>
      </tbody>
    </table>
  </div>
</section>

<section class="wrap mt-5" aria-labelledby="life-title">
  <div class="sec-head">
    <span class="eyebrow">The life of a leg</span>
    <h2 id="life-title">From stamped frame to retirement, nothing falls between the two.</h2>
  </div>
  <ol class="hm-life">
    <li class="hm-life__end"><b>Built &amp; commissioned</b><span>Frame stamped, electronics bound and tested</span></li>
    <li class="hm-life__loop">
      <div class="hm-life__half">
        <span class="hm-life__who">""" + MARK_ESC + """Service Console</span>
        <ol>
          <li>Assigned out</li><li>Delivered to site</li><li>Working builds</li><li>Flagged or replaced</li>
        </ol>
      </div>
      <div class="hm-life__half">
        <span class="hm-life__who">""" + MARK_ERS + """Return System</span>
        <ol>
          <li>Checked in</li><li>Inspected &amp; serviced</li><li>Pack swapped</li><li>Back to the pool</li>
        </ol>
      </div>
      <span class="hm-life__repeat small muted">Repeats for every build, under the same frame serial</span>
    </li>
    <li class="hm-life__end"><b>Retired</b><span>Out of the fleet, with its history intact</span></li>
  </ol>
</section>

<section class="wrap mt-5" aria-labelledby="ins-title">
  <div class="sec-head">
    <span class="eyebrow">What the manufacturer sees</span>
    <h2 id="ins-title">The lifespan of every Erektor asset, in one place.</h2>
    <p>Every leg is followed by the serial stamped into its frame, on the line and in the field, so decisions
    about servicing, reconditioning and retiring it rest on its whole working life, not on whichever site saw
    it last.</p>
  </div>
  <div class="grid grid--3 hm-insights">
    <article class="card hm-insight">
      <span class="hm-insight__fig">1 serial</span>
      <h3>History stays with the frame</h3>
      <p>Every leg is keyed on its stamped mechanical serial. Swap a controller and the operational identity
      rolls over, but wear, intervals and warranty stay with the frame.</p>
    </article>
    <article class="card hm-insight">
      <span class="hm-insight__fig">2,500 h</span>
      <h3>Service by use, not the calendar</h3>
      <p>Intervals accrue in motor-hours against the frame and are flagged at 85%, so maintenance is booked
      ahead of time, from how hard each leg has actually worked.</p>
    </article>
    <article class="card hm-insight">
      <span class="hm-insight__fig">Repeat faults</span>
      <h3>Failures traced to the frame</h3>
      <p>ERS records every inspection and diagnostic failure against the frame serial, and every replacement
      dispatched from the field is filed under that same serial. A leg that keeps coming back stands out, and
      quarantining or retiring it rests on evidence.</p>
    </article>
    <article class="card hm-insight">
      <span class="hm-insight__fig">45 days</span>
      <h3>No leg quietly disappears</h3>
      <p>Every departure, delivery and return is logged. A leg the fleet has not heard from in 45 days is
      reported, and a leg that moved between facilities is settled on the books instead of being written off
      as lost.</p>
    </article>
    <article class="card hm-insight">
      <span class="hm-insight__fig">56 V &middot; 24 V</span>
      <h3>Battery packs have their own lives</h3>
      <p>Packs are swapped on the line and charged off it, and ERS tracks each one on its own, so pack wear
      never hides inside the leg&rsquo;s history.</p>
    </article>
    <article class="card hm-insight">
      <span class="hm-insight__fig">Firmware</span>
      <h3>What every leg is running</h3>
      <p>Controllers re-register at check-in on the line, and every firmware update is recorded in the leg
      registry, so the fleet&rsquo;s software state is known rather than assumed.</p>
    </article>
  </div>
</section>

<section class="wrap mt-5">
  <div class="hm-cta">
    <div>
      <h2>See your fleet&rsquo;s record.</h2>
      <p class="muted">Sign in with your Erektor account to see every leg assigned to your facilities, what
      each one needs next, and every request filed for them.</p>
    </div>
    <div class="btn-row">
      <a class="btn btn--primary" href="/account/signin.html" data-signin>Sign in</a>
      <a class="btn" href="mailto:support@erektor.systems">Request an account</a>
    </div>
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
  <p class="crumbs"><a href="index.html">Service console</a><span>/</span>Dispatch</p>
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
        <p class="field__hint">The controller&rsquo;s number: the ERS tablet shows it when the controller is connected, and so does the session controller roster. A dispatch
        is filed against the electronics serial because that is what has to come out of tonight&rsquo;s roster.</p>
        <p class="field__err" data-serial-err hidden></p>
      </div>
      <div class="field">
        <label for="mx">Mechanical serial <span class="muted">(if you can reach it)</span></label>
        <input type="text" id="mx" name="mechanical_serial" class="mono" data-serial="mechanical" autocomplete="off">
        <p class="field__hint">Stamped on the leg frame, for example <span class="mono">L-V3BE123</span>. Helps us
        close the wear record, but do not climb for it.</p>
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
        <textarea id="symptom" name="symptom" required placeholder="Will not turn under drive command. Lift holds fine. Deployment levelled before the fault."></textarea>
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
        <textarea id="site" name="site_address" required placeholder="Street, city, and how a low-deck trailer (50 ft+) gets in and where the slab is."></textarea>
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
        <p class="field__hint">This sets the priority. A deployment part-way through a walk-off outranks
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
    <li><b>Take the failed leg out of session.</b> Release it on the session controller so the deployment
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
  <p class="crumbs"><a href="index.html">Service console</a><span>/</span>Maintenance</p>
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
        <p class="field__hint">Stamped on the leg frame, for example <span class="mono">L-V3BE123</span>: side,
        version, product and manufacture order. Not the controller&rsquo;s number.</p>
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
        <textarea id="reason" name="reason" required placeholder="Drive current climbing over the last few sessions. Still completes convergence, but slower than the other legs in the deployment."></textarea>
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
  it.</p>
</section>

<section class="wrap" data-members hidden>
  <div class="grid grid--3">
    <a class="card card--urgent" href="/account/emergency.html">
      <h3>Request a replacement leg</h3>
      <p>A leg cannot finish its session and you need a healthy one from the pool today.</p>
      <div class="card__meta">Emergency &middot; 24/7</div>
    </a>
    <a class="card card--plan" href="/account/maintenance.html">
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

""" + ("""<section class="wrap mt-4">
  <div class="sec-head">
    <span class="eyebrow">Looking for a code?</span>
    <h2>Every fault code has a page.</h2>
    <p>The index resolves a code to one of the three routes and carries it into the right form.</p>
  </div>
  <p><a href="/docs/faults.html">Open the fault code index &rarr;</a></p>
</section>
""" if FAULT_CODES else "") + """""",
     head_extra='\n<meta name="robots" content="noindex">')

if __name__ == "__main__":
    import docs      # noqa: F401  registers the documentation and firmware pages
    import internal  # noqa: F401  registers the gated registry pages
    import account   # noqa: F401  registers the customer account portal
    write()
