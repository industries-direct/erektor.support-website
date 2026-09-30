"""
The account portal at /account/.

The rest of the site is public: anyone standing next to a leg can read the
docs and file a request. These pages are one customer's own: their
facilities, and the maintenance and emergency replacements they have filed.
They sign in with the same account as erektor-return.systems, and are gated in
the Worker (src/portal.js) the same way /internal/ is.

Like the registry pages, they carry no data of their own. Everything is
fetched from /api/account/* after the session is checked.
"""

from build import page

NOINDEX = '\n<meta name="robots" content="noindex, nofollow">'
SCRIPT = '\n<script src="../assets/js/account.js" defer></script>'


def acctbar(current):
    links = [
        ("index.html", "Overview"),
        ("maintenance.html", "Schedule maintenance"),
        ("emergency.html", "Emergency replacement"),
    ]
    items = "".join(
        '\n      <a href="{href}"{cur}>{label}</a>'.format(
            href=href, label=label,
            cur=' aria-current="page"' if href == current else "")
        for href, label in links
    )
    return """
<div class="wrap">
  <div class="regbar">
    <span class="regbar__id" data-company>Account</span>{items}
    <span class="regbar__end">
      <span class="small muted" data-email></span>
      <button type="button" class="btn btn--sm" data-signout>Sign out</button>
    </span>
  </div>
</div>
""".format(items=items)


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
  with them. The rest of this site stays public; this part is yours.</p>

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

  <p class="small muted mt-3">No account? Field requests do not need one: use
  <a href="../dispatch.html">Dispatch</a> or <a href="../maintenance.html">Maintenance</a> on the public site.</p>
</section>
""",
     head_extra=NOINDEX, foot_extra=SCRIPT)


# ===========================================================================
# Overview
# ===========================================================================
page("account/index.html", 1, "Account",
     "Your facilities and requests.",
     acctbar("index.html") + """
<section class="wrap">
  <span class="eyebrow">Account</span>
  <h1 data-company>Your account</h1>
  <p class="lede">Every facility on your account and every request filed from it. ERS rolls out one
  facility at a time; a facility shows <em>ERS coming soon</em> until its line is online.</p>

  <div class="grid grid--2 mt-2">
    <a class="card" href="maintenance.html">
      <span class="eyebrow eyebrow--plain">Planned</span>
      <h3>Schedule maintenance</h3>
      <p class="muted">Book service for a leg against its frame, on a date that suits the facility.</p>
    </a>
    <a class="card card--urgent" href="emergency.html">
      <span class="eyebrow eyebrow--plain">Urgent</span>
      <h3>Emergency replacement</h3>
      <p class="muted">A leg cannot finish its session. Request a replacement to the site now.</p>
    </a>
  </div>

  <h2 class="mt-4">Facilities</h2>
  <div class="table-scroll">
    <table class="tbl">
      <thead><tr><th>Facility</th><th>Location</th><th>ERS</th></tr></thead>
      <tbody data-facility-rows><tr><td colspan="3" class="muted">Loading&hellip;</td></tr></tbody>
    </table>
  </div>

  <h2 class="mt-4">Requests</h2>
  <div class="table-scroll">
    <table class="tbl">
      <thead><tr><th>Reference</th><th>Type</th><th>Facility</th><th>Serial</th><th>Needed by</th><th>Status</th><th>Filed</th></tr></thead>
      <tbody data-request-rows><tr><td colspan="7" class="muted">Loading&hellip;</td></tr></tbody>
    </table>
  </div>
</section>
""",
     head_extra=NOINDEX, foot_extra=SCRIPT)


# ===========================================================================
# Schedule maintenance
# ===========================================================================
page("account/maintenance.html", 1, "Schedule maintenance",
     "Schedule maintenance for a leg.",
     acctbar("maintenance.html") + """
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
        <input type="text" id="serial" name="serial" class="mono" required autocomplete="off" placeholder="MX-24-08192">
        <p class="field__hint">The frame number, starting MX. Not the number on the ClearCore screen.
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
     acctbar("emergency.html") + """
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
        <input type="text" id="serial" name="serial" class="mono" required autocomplete="off" placeholder="EL-25-014873">
        <p class="field__hint">From the ClearCore About screen or the session controller roster, starting EL.</p>
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
