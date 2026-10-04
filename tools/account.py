"""
The account portal at /account/.

The home page and the fault code index are public. These pages are one
customer's own: their facilities, and the maintenance and emergency
replacements they have filed. The same sign-in also opens the docs and
firmware, and the old public request forms redirect here (src/portal.js).
They sign in with the same account as erektor-return.systems, and are gated in
the Worker (src/portal.js) the same way /internal/ is.

Like the registry pages, they carry no data of their own. Everything is
fetched from /api/account/* after the session is checked.
"""

from build import page, FAULT_CODES

NOINDEX = '\n<meta name="robots" content="noindex, nofollow">'
SCRIPT = '\n<script src="../assets/js/account.js" defer></script>'


FACILITY_FIELD = """
      <div class="field">
        <label for="facility" class="required">Facility</label>
        <select id="facility" name="facility_id" required data-facilities></select>
        <p class="field__hint">Facilities marked <em>ERS coming soon</em> are recorded but do not have an
        ERS line yet.</p>
      </div>"""


# ===========================================================================
# Sign in
# ===========================================================================
page("account/signin.html", 1, "Account sign-in",
     "Sign in to your Erektor account.",
     """
<section class="wrap wrap--narrow">
  <span class="eyebrow">Account</span>
  <h1>Sign in to your account</h1>
  <p class="lede">Your facilities, scheduled maintenance, emergency replacements and the records that go
  with them, plus the documentation and controller firmware.</p>

  <form class="form mt-2" data-account-signin>
    <div class="field limit-input">
      <label for="email" class="required">Work email</label>
      <input type="email" id="email" name="email" required autocomplete="username" maxlength="254">
    </div>
    <div class="field limit-input">
      <label for="password" class="required">Password</label>
      <input type="password" id="password" name="password" required autocomplete="current-password" maxlength="128">
      <p class="field__hint">The same email and password as the ERS console at erektor-return.systems.</p>
    </div>
    <div class="field">
      <div class="choice">
        <input type="checkbox" id="remember" name="remember">
        <label for="remember"><b>Keep me signed in on this device</b><span>For 30 days. Otherwise the session lasts 12 hours.</span></label>
      </div>
    </div>
    <div class="btn-row">
      <button type="submit" class="btn btn--primary">Sign in</button>
    </div>
  </form>

  <div id="result" hidden class="mt-1"></div>

  <noscript>
    <p class="note note--warn">The account portal needs JavaScript.</p>
  </noscript>

  <p class="small muted mt-3">No account? Email <a href="mailto:support@erektor.systems">support@erektor.systems</a>.""" + ("""
  The <a href="../docs/faults.html">fault code index</a> is open to everyone.""" if FAULT_CODES else "") + """</p>
</section>
""",
     head_extra=NOINDEX, foot_extra=SCRIPT)


# ===========================================================================
# Overview - the dashboard for a customer's legs
# ===========================================================================
page("account/index.html", 1, "Account",
     "Your legs, what they need, and the requests filed for them.",
     """
<section class="wrap dash-head">
  <div class="dash-head__id">
    <span class="eyebrow">Account</span>
    <h1 data-company>Your account</h1>
    <p class="lede">Every leg assigned to your facilities, what each one needs, and every request filed for
    them. Intervals run on motor-hours against the stamped frame serial.</p>
  </div>
  <dl class="statbar statbar--kpi" aria-label="Fleet health">
    <div><dt>Legs on account</dt><dd class="mono" data-stat="legs">&mdash;</dd></div>
    <div><dt>At your facilities</dt><dd class="mono" data-stat="deployed">&mdash;</dd></div>
    <div><dt>Need attention</dt><dd class="mono"><a href="#p-attn" data-stat="attention">&mdash;</a></dd></div>
    <div><dt>Open requests</dt><dd class="mono"><a href="#p-open" data-stat="open">&mdash;</a></dd></div>
  </dl>
</section>

<section class="wrap mt-2">
  <div class="btn-row">
    <a class="btn btn--primary" href="emergency.html">Emergency replacement</a>
    <a class="btn" href="maintenance.html">Schedule maintenance</a>
  </div>
  <div id="result" hidden class="mt-2" role="alert"></div>
</section>

<section class="wrap mt-3 panels" aria-label="Dashboard" aria-busy="true" data-dashboard>

  <section class="panel panel--span2" aria-labelledby="p-attn">
    <header class="panel__head">
      <h2 id="p-attn">Needs attention</h2>
      <span class="panel__meta mono" data-meta="attention">&mdash;</span>
    </header>
    <div class="table-scroll">
      <table class="tbl tbl--cards">
        <thead><tr><th>Leg</th><th>Facility</th><th>Why</th><th><span class="visually-hidden">Actions</span></th></tr></thead>
        <tbody data-attention-rows><tr><td colspan="4" class="muted">Loading&hellip;</td></tr></tbody>
      </table>
    </div>
  </section>

  <section class="panel" aria-labelledby="p-open">
    <header class="panel__head">
      <h2 id="p-open">In progress</h2>
      <span class="panel__meta mono" data-meta="open">&mdash;</span>
    </header>
    <div class="table-scroll">
      <table class="tbl">
        <thead><tr><th>Request</th><th>Status</th></tr></thead>
        <tbody data-open-rows><tr><td colspan="2" class="muted">Loading&hellip;</td></tr></tbody>
      </table>
    </div>
  </section>

  <section class="panel panel--wide" aria-labelledby="p-legs">
    <header class="panel__head">
      <h2 id="p-legs">Legs</h2>
      <span class="panel__meta mono" data-meta="legs">&mdash;</span>
    </header>
    <div class="table-scroll">
      <table class="tbl tbl--cards">
        <thead><tr><th>Leg</th><th>Variant</th><th>Facility</th><th>State</th><th>Since service</th><th>Last seen</th><th><span class="visually-hidden">Actions</span></th></tr></thead>
        <tbody data-leg-rows><tr><td colspan="7" class="muted">Loading&hellip;</td></tr></tbody>
      </table>
    </div>
    <footer class="panel__foot">
      <span class="legend"><i class="swatch swatch--self"></i>Room to run</span>
      <span class="legend"><i class="swatch swatch--flag"></i>Due soon</span>
      <span class="legend"><i class="swatch swatch--dispatch"></i>Due</span>
    </footer>
  </section>

  <section class="panel panel--wide" aria-labelledby="p-fac">
    <header class="panel__head">
      <h2 id="p-fac">Facilities</h2>
      <span class="panel__meta mono" data-meta="facilities">&mdash;</span>
    </header>
    <div class="table-scroll">
      <table class="tbl">
        <thead><tr><th>Facility</th><th>Location</th><th>ERS</th><th class="num">Legs</th><th class="num">Need attention</th><th class="num">Open requests</th></tr></thead>
        <tbody data-facility-rows><tr><td colspan="6" class="muted">Loading&hellip;</td></tr></tbody>
      </table>
    </div>
  </section>

  <section class="panel panel--wide" aria-labelledby="p-hist">
    <header class="panel__head">
      <h2 id="p-hist">Request history</h2>
      <span class="panel__meta mono" data-meta="requests">&mdash;</span>
    </header>
    <div class="table-scroll">
      <table class="tbl">
        <thead><tr><th>Reference</th><th>Type</th><th>Facility</th><th>Serial</th><th>Needed by</th><th>Status</th><th>Filed</th></tr></thead>
        <tbody data-request-rows><tr><td colspan="7" class="muted">Loading&hellip;</td></tr></tbody>
      </table>
    </div>
  </section>

</section>
""",
     head_extra=NOINDEX, foot_extra=SCRIPT)


# ===========================================================================
# Schedule maintenance
# ===========================================================================
page("account/maintenance.html", 1, "Schedule maintenance",
     "Schedule maintenance for a leg.",
     """
<section class="wrap wrap--narrow">
  <span class="eyebrow">Planned</span>
  <h1>Schedule maintenance</h1>
  <p class="lede">For a leg that is working but due for service, or showing wear. It is filed against the
  frame, so the record survives a controller swap.</p>

  <form class="form mt-2" data-account-request="maintenance">
    <fieldset>
      <legend>Where and which leg</legend>""" + FACILITY_FIELD + """
      <div class="field">
        <label for="serial" class="required">Mechanical serial</label>
        <input type="text" id="serial" name="serial" class="mono" required autocomplete="off" placeholder="L-V3BE123">
        <p class="field__hint">Stamped on the leg frame: side, version, product and manufacture order, as in
        <span class="mono">L-V3BE123</span>. Not the controller&rsquo;s number.
        <a href="../docs/leg.html#identity">Why there are two serials</a>.</p>
      </div>
    </fieldset>
    <fieldset>
      <legend>When and why</legend>
      <div class="field limit-input">
        <label for="needed">Preferred date</label>
        <input type="date" id="needed" name="needed_by">
      </div>
      <div class="field">
        <label for="details" class="required">What needs doing</label>
        <textarea id="details" name="details" required maxlength="2000" placeholder="Due for its 2,500-hour service. Drive current has crept up over the last few sessions."></textarea>
      </div>
      <div class="field limit-input">
        <label for="contact">Contact on site <span class="muted">(optional)</span></label>
        <input type="text" id="contact" name="contact" maxlength="120" autocomplete="tel">
      </div>
    </fieldset>
    <div class="btn-row">
      <button type="submit" class="btn btn--primary">Schedule maintenance</button>
    </div>
  </form>
  <div id="result" hidden class="mt-1"></div>
</section>
""",
     head_extra=NOINDEX, foot_extra=SCRIPT)


# ===========================================================================
# Emergency replacement
# ===========================================================================
page("account/emergency.html", 1, "Emergency replacement",
     "Request an emergency replacement leg.",
     """
<section class="wrap wrap--narrow">
  <span class="eyebrow">Urgent</span>
  <h1>Emergency replacement</h1>
  <p class="lede">A leg cannot finish its session. A replacement is sent to the site; the failed leg comes
  back through ERS. Filed against the electronics serial, because that is how tonight&rsquo;s roster knows
  the leg.</p>

  <div class="note note--crit">
    <p class="note__title">Take the failed leg out of session first</p>
    <p>Release it on the session controller so the deployment re-forms without it, and never manually
    override a leg that is out of session.</p>
  </div>

  <form class="form mt-2" data-account-request="emergency">
    <fieldset>
      <legend>Where and which leg</legend>""" + FACILITY_FIELD + """
      <div class="field">
        <label for="serial" class="required">Electronics serial</label>
        <input type="text" id="serial" name="serial" class="mono" required autocomplete="off" placeholder="305419896">
        <p class="field__hint">The controller&rsquo;s number: the ERS tablet shows it when the controller is connected, and so does the session controller roster.</p>
      </div>
    </fieldset>
    <fieldset>
      <legend>What happened</legend>
      <div class="field">
        <label for="details" class="required">What the leg is doing</label>
        <textarea id="details" name="details" required maxlength="2000" placeholder="Will not turn under drive command. Lift holds fine. NET-20 on the controller."></textarea>
      </div>
      <div class="field limit-input">
        <label for="contact" class="required">Phone on site</label>
        <input type="tel" id="contact" name="contact" required maxlength="120" autocomplete="tel">
        <p class="field__hint">The dispatcher calls this number with an ETA.</p>
      </div>
    </fieldset>
    <div class="btn-row">
      <button type="submit" class="btn btn--primary">Request replacement</button>
    </div>
  </form>
  <div id="result" hidden class="mt-1"></div>
</section>
""",
     head_extra=NOINDEX, foot_extra=SCRIPT)
