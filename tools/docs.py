"""Documentation and firmware pages."""

from build import page
import diagrams as D


CRUMB = '<p class="crumbs"><a href="../index.html">Support</a><span>/</span><a href="../docs/">Documentation</a><span>/</span>{}</p>'


# ===========================================================================
page("docs/index.html", 1, "Documentation",
     "Product diagrams, operating procedures, the ERS return line, fault codes and safety cases for Erektor legs.",
     """
<section class="wrap">
  <p class="crumbs"><a href="../index.html">Support</a><span>/</span>Documentation</p>
  <span class="eyebrow">Reference</span>
  <h1>Documentation</h1>
  <p class="lede">What a leg is made of, how to run one, what happens when it comes home, and the cases
  where getting it wrong hurts someone.</p>

  <div class="grid grid--2 mt-3" >
    <a class="card card--docs" href="leg.html">
      <h3>Leg anatomy and diagrams</h3>
      <p>Elevation and plan drawings, the two axes, power, controller and radio &mdash; and why a leg carries
      two serial numbers that mean different things.</p>
      <div class="card__meta">Diagrams &middot; identity</div>
    </a>
    <a class="card card--docs" href="operating.html">
      <h3>Operating procedures</h3>
      <p>Claim, converge, dock, pair, level, self-load, walk off, place, release. The whole cycle, in the
      order you do it.</p>
      <div class="card__meta">How-to</div>
    </a>
    <a class="card card--docs" href="ers.html">
      <h3>The return line</h3>
      <p>Check-in through to the available pool, why charging happens off the belt, service intervals, and
      the registry that stops a leg being called lost.</p>
      <div class="card__meta">ERS</div>
    </a>
    <a class="card card--urgent" href="faults.html">
      <h3>Fault code index</h3>
      <p>Every code, what it means, and which of the three service routes it puts you on.</p>
      <div class="card__meta">Triage</div>
    </a>
    <a class="card" href="safety.html">
      <h3>Safety</h3>
      <p>Working under a held load, the walk-off as the governing load case, and transport securement.</p>
      <div class="card__meta">Read before a walk-off</div>
    </a>
    <a class="card card--fw" href="../firmware/index.html">
      <h3>Controller firmware</h3>
      <p>Current versions, release notes, and how a bundle reaches a leg that has no internet connection.</p>
      <div class="card__meta">Fleet</div>
    </a>
  </div>

  <h2 id="intervals">Service intervals at a glance</h2>
  <div class="table-scroll">
    <table>
      <thead><tr><th>Trigger</th><th>Accrues against</th><th>Route</th></tr></thead>
      <tbody>
        <tr><td>Motor-hours interval reached</td><td class="mono">MX &mdash; mechanical</td><td>Flag for ERS</td></tr>
        <tr><td>Twelve months since last closed service</td><td class="mono">MX &mdash; mechanical</td><td>Flag for ERS</td></tr>
        <tr><td>Drive current trending high</td><td class="mono">MX &mdash; mechanical</td><td>Flag for ERS</td></tr>
        <tr><td>Firmware behind the fleet</td><td class="mono">EL &mdash; electronics</td><td>Automatic at next dock</td></tr>
        <tr><td>Leg cannot finish its session</td><td class="mono">EL &mdash; electronics</td><td>Dispatch a replacement</td></tr>
      </tbody>
    </table>
  </div>
  <p class="small muted">The split matters: a service interval that followed the electronics would reset
  every time a ClearCore was swapped, and a leg could run indefinitely without ever reaching its
  interval. See <a href="leg.html#identity">serials and identity</a>.</p>
</section>
""")


# ===========================================================================
page("docs/leg.html", 1, "Leg anatomy",
     "Product diagrams and component reference for an Erektor leg: lift and drive axes, power, ClearCore controller, XBee radio, and the dual serial identity.",
     CRUMB.format("Leg anatomy") + """
<section class="wrap">
  <span class="eyebrow">Diagrams</span>
  <h1>Leg anatomy</h1>
  <p class="lede">There is no persistent machine above the leg. A leg is the durable asset, and it is
  built to be one: it carries its own power, its own control, its own radio, and it stands up by itself.</p>
</section>

<section class="wrap">
  """ + D.LEG_ELEVATION + """

  <ul class="spec-list limit" >
    <li><span>Motors per leg</span><span>2 &mdash; drive axis + lift axis</span></li>
    <li><span>Servo</span><span>Teknic ClearPath-SC</span></li>
    <li><span>Casters per leg</span><span>3 &mdash; 1 driven, 2 free</span></li>
    <li><span>Control</span><span>ClearCore &middot; 24 V logic</span></li>
    <li><span>Motor bus</span><span>56 V direct</span></li>
    <li><span>Comms</span><span>XBee radio node &middot; 300 m+ to controller</span></li>
    <li><span>Shared with other legs</span><span>nothing</span></li>
  </ul>
</section>

<section class="wrap">
  """ + D.LEG_PLAN + """
</section>

<section class="wrap prose">
  <h2 id="power">Power</h2>
  <p>Each leg carries a 56&nbsp;V motor bus and a 24&nbsp;V logic supply from its own pack. Nothing is drawn
  from a neighbouring leg or from the station, which is what allows an arbitrary number of legs to be
  claimed into a build without any power planning.</p>
  <p>Two consequences for service:</p>
  <ul>
    <li><b>Charge is not a field repair.</b> Legs do not charge on the belt or on site &mdash; packs are swapped
    at the facility bank. A leg that is short of charge for its declared session
    (<code>PWR-12</code>) is refused at claim, not rescued later.</li>
    <li><b>A 24&nbsp;V rail that browns out under motor load</b> (<code>PWR-34</code>) presents as a healthy
    leg at rest that drops mid-lift. Treat it as a dispatch even though it passes a standing check.</li>
  </ul>
  <div class="note note--crit">
    <p class="note__title">Never bypass the pack interlock</p>
    <p>A <code>PWR-30</code> bus fault inhibits both axes deliberately. A leg that cannot hold cannot be
    trusted to walk itself to transport either &mdash; it is carried out.</p>
  </div>

  <h2 id="lift">Lift axis</h2>
  <p>A ClearPath-SC servo drives the lift column. Under a module, lift is commanded collectively: the
  session controller holds the target height and each leg closes its own loop against it, which is how
  the structure levels on uneven ground without any leg knowing about the others.</p>
  <p>Disagreement between commanded and reported height is graded. Four to ten millimetres on one leg is
  a levelling problem (<code>LFT-15</code>) &mdash; re-run levelling. Drift under a static hold
  (<code>LFT-22</code>) is a wear problem and belongs on the frame&rsquo;s record. A column that will not hold
  under load (<code>LFT-45</code>) is a safety event, not a fault report.</p>

  <h2 id="drive">Drive axis</h2>
  <p>One caster is driven by the second ClearPath-SC; the other two swivel freely. That is enough to
  converge a leg on its assigned mounting point, and enough for the unified structure to drive onto and
  off a trailer.</p>
  <p>Drive current is the fleet&rsquo;s best early-wear signal. A leg whose current climbs above its envelope
  for the same commanded travel (<code>DRV-21</code>) is showing gearbox wear long before it stalls. That
  trend accrues against the mechanical serial, so it survives a controller swap.</p>

  <h2 id="controller">ClearCore and radio</h2>
  <p>The ClearCore runs the leg and holds its operational identity. The XBee node gives it 300&nbsp;m or more
  to the session controller. The leg has no internet path of its own &mdash; everything it learns about the
  fleet, including firmware, arrives through a paired session controller.</p>
  <p>When the session controller stops hearing a claimed leg (<code>NET-20</code>), motion inhibits across
  the entire module by design. This is the behaviour you want: a leg that cannot be commanded must not be
  holding a load that other legs think is shared.</p>
  <div class="note note--crit">
    <p class="note__title">Never manually override a leg that is out of session</p>
    <p>The inhibit is not a nuisance lock. A module that has lost a leg does not know what that leg is
    doing with its share of the load.</p>
  </div>

  <h2 id="identity">Serials and identity</h2>
  <p>A leg carries two serial numbers and they are not interchangeable. This is the single most common
  source of misfiled service requests, so it is worth being precise about.</p>

  <div class="table-scroll">
    <table>
      <thead><tr><th>&nbsp;</th><th>Electronics serial</th><th>Mechanical serial</th></tr></thead>
      <tbody>
        <tr><th scope="row">Format</th><td class="mono">EL-25-014873</td><td class="mono">MX-24-08192</td></tr>
        <tr><th scope="row">Where</th><td>ClearCore About screen, session controller roster</td><td>Stamped on the frame above the bracket face</td></tr>
        <tr><th scope="row">Lifetime</th><td>Rolls over when the controller is replaced</td><td>Permanent for the life of the leg</td></tr>
        <tr><th scope="row">Governs</th><td>Firmware, pairing, session assignment, uplink identity</td><td>Motor-hours, gearbox wear, service interval, warranty, lease record</td></tr>
        <tr><th scope="row">File against it</th><td><a href="../dispatch.html">Dispatch requests</a></td><td><a href="../maintenance.html">Maintenance flags</a></td></tr>
      </tbody>
    </table>
  </div>

  <p>The split is deliberate. Swap the electronics and the operational asset rolls over &mdash; new identity,
  new firmware target, clean pairing history. But motor-hours and gearbox wear stay with the frame that
  actually did the work, so maintenance stays usage-accurate instead of resetting every time a controller
  is replaced.</p>

  <div class="note note--warn">
    <p class="note__title">What this means when you file</p>
    <p>A maintenance flag filed against an electronics serial is lost the next time that ClearCore is
    swapped. Wear belongs on the frame. Conversely, a dispatch filed against a mechanical serial cannot be
    matched to tonight&rsquo;s roster, because the session controller does not know legs by their frame
    numbers.</p>
  </div>
</section>
""")


# ===========================================================================
page("docs/operating.html", 1, "Operating procedures",
     "How to run an Erektor session: claim, converge, dock, pair, level, self-load, walk off, place and release.",
     CRUMB.format("Operating procedures") + """
<section class="wrap">
  <span class="eyebrow">How-to</span>
  <h1>Operating procedures</h1>
  <p class="lede">The cycle in the order you do it. Each stage assumes the one before it closed cleanly;
  where a stage can fail, the fault code and its route are named.</p>
</section>

<section class="wrap">
  """ + D.MODULE_TOPOLOGY + """
</section>

<section class="wrap prose">
  <h2 id="reserve">1. Claim legs and check reserve</h2>
  <ol class="steps">
    <li><b>Declare the build on the session controller.</b> Station length sets how many modules you need
    &mdash; three to six. The controller claims legs from the available pool.</li>
    <li><b>Check the reserve figure, not the charge figure.</b> The controller reports whether remaining
    charge covers the declared session <em>plus</em> the return transit. A leg that fails this refuses the
    claim with <code>PWR-12</code>.</li>
    <li><b>Swap the pack at the bank if reserve is short.</b> Do not claim it anyway and plan to top up
    later &mdash; legs do not charge on the belt or on site.</li>
    <li><b>Confirm the roster.</b> Both serials show per leg. Note any leg carrying a restriction from a
    maintenance flag; restricted legs are excluded from walk-off sessions automatically, but check.</li>
  </ol>

  <h2 id="converge">2. Converge</h2>
  <p>Claimed legs drive themselves to their assigned mounting points. Each leg navigates on its own driven
  caster; there is no convoy and no leader.</p>
  <ol class="steps">
    <li><b>Clear the approach lanes.</b> Debris and standing water cause driven-caster slip
    (<code>DRV-08</code>), which is an operator fix, not a fault to report.</li>
    <li><b>Let convergence complete before touching anything.</b> A leg mid-approach is under its own
    command and is not expecting a person in its lane.</li>
    <li><b>If a leg will not converge at all</b> &mdash; drive stalled, <code>DRV-40</code> &mdash; it cannot walk
    itself out either. That is a <a href="../dispatch.html">dispatch</a>, and the leg has to be carried.</li>
  </ol>

  <h2 id="dock">3. Dock to the rail</h2>
  <p>Legs bolt to fixed mounting points on the station&rsquo;s aluminium rail. The rail bears full lift load
  along its entire length, which is why one bracket geometry serves every station variant and why no
  design change is needed per product.</p>
  <div class="note note--info">
    <p class="note__title">Attachment is a lookup, not a measurement</p>
    <p>Mounting points are known geometry. Nothing is sensed, aligned or calibrated at dock &mdash; which is
    why there are no docking sensors to fail, and why a bracket that will not seat means damage rather
    than misalignment.</p>
  </div>
  <ol class="steps">
    <li><b>Seat and torque each bracket to spec.</b> A fastener below the seating window reports
    <code>DCK-09</code>. Re-seat and re-torque.</li>
    <li><b>Never shim a bracket to close a gap.</b> If the face will not meet the rail, something is bent.</li>
    <li><b>If a bracket will not seat at all</b> (<code>DCK-18</code>), inspect the rail mounting point
    first. If the rail is sound, the bracket face is out and the leg is exchanged.</li>
    <li><b>Legacy legs need the adapter.</b> Pilot-fleet legs carry BRK-U1, which does not fit the current
    rail without <code>KIT-U1U2</code>.</li>
  </ol>

  <h2 id="pairing">4. Pair into modules</h2>
  <p>A module is one left leg and one right leg, paired in software only. Nothing physical joins them &mdash;
  the pairing is a fact the session controller holds, and it is re-formed from scratch every session.</p>
  <ol class="steps">
    <li><b>Confirm the pairing on the roster.</b> Which leg pairs with which is arbitrary; do not try to
    keep historical pairs together.</li>
    <li><b>If two legs refuse to pair</b> (<code>SES-07</code>), it is usually a variant or firmware
    mismatch. Release both and claim a different pair rather than forcing it.</li>
    <li><b>Do not claim a leg the registry has not seen recently.</b> A leg another facility believes it
    holds (<code>SES-41</code>) is reported, not used &mdash; see <a href="ers.html#registry">the registry</a>.</li>
  </ol>

  <h2 id="levelling">5. Level the structure</h2>
  <p>Once every claimed leg has attached, the station&rsquo;s rail is the robot&rsquo;s chassis and the whole
  assembly behaves as one rigid body. Levelling establishes the shared height reference.</p>
  <ol class="steps">
    <li><b>Run module levelling from the session controller.</b> Each leg closes its own loop against the
    commanded height.</li>
    <li><b>A 4&ndash;10&nbsp;mm disagreement on one leg</b> (<code>LFT-15</code>) means re-run levelling. If it
    returns within ten cycles, <a href="../maintenance.html">flag the leg</a>.</li>
    <li><b>Drift under a static hold</b> (<code>LFT-22</code>) is wear. The leg is safe below 80% rated
    module load, but must not be assigned to a walk-off until it has been through the line.</li>
  </ol>

  <h2 id="outfit">6. Outfit</h2>
  <p>Internal and charging-specification components are installed while the unified structure continues
  down the line. From a service point of view nothing changes here: the legs are holding a load and the
  work area rules in <a href="safety.html#load">holding a load</a> apply throughout.</p>

  <h2 id="selfload">7. Self-load onto the trailer</h2>
  <ol class="steps">
    <li><b>Confirm every leg is still in session</b> before commanding drive. A module that has silently
    lost a leg (<code>NET-20</code>) will inhibit part-way up the ramp, which is the worst place for it.</li>
    <li><b>Drive the full structure and payload onto the flatbed</b> under collective command.</li>
    <li><b>Self-secure to FMCSA cargo standards</b> (&sect;393.100&ndash;136). Securement is checked before the
    session controller will release the drive lock.</li>
  </ol>

  <h2 id="walkoff">8. Walk off the edge</h2>
  <div class="note note--crit">
    <p class="note__title">This is the governing load case</p>
    <p>Walking off the trailer lip under full payload is the highest-risk stability event in the cycle,
    and the case the whole frame is engineered against. Read
    <a href="safety.html#walkoff">the walk-off</a> in full before commanding it. Legs carrying an
    <code>LFT-22</code> drift flag or a beta firmware build are excluded from walk-off sessions.</p>
  </div>

  <h2 id="place">9. Place the station</h2>
  <ol class="steps">
    <li><b>Position over the marked location</b> under collective drive.</li>
    <li><b>Lower under compliant force control.</b> The structure sets itself down gently rather than to a
    commanded height &mdash; the ground decides where it stops.</li>
    <li><b>Confirm the station is bearing on its own supports</b> before any leg releases. Nothing is
    released off a load.</li>
  </ol>

  <h2 id="release">10. Release and return</h2>
  <ol class="steps">
    <li><b>Release brackets</b> once the station is bearing independently.</li>
    <li><b>Legs disperse under their own drive</b> and the module pairings dissolve. They are individual
    assets again the moment the session closes.</li>
    <li><b>Return to the facility</b> and enter <a href="ers.html">ERS at check-in</a>. Any leg carrying a
    maintenance flag is diverted at inspection.</li>
  </ol>

  <h2 id="radio">Radio and the session network</h2>
  <p>XBee gives 300&nbsp;m or more between a leg and its session controller. Marginal links show as
  <code>NET-11</code> before they fail outright.</p>
  <ul>
    <li><b>Move the session controller, not the leg.</b> Line of sight and the range budget are almost
    always the issue.</li>
    <li><b>A lost leg inhibits its whole module</b> (<code>NET-20</code>). Re-establish the link; never
    override.</li>
    <li><b>The uplink is separate from the radio.</b> Losing the uplink (<code>NET-25</code>) means no
    portal, no firmware and no fleet sync &mdash; but sessions run offline normally and reconcile when it
    returns.</li>
  </ul>
</section>
""")


# ===========================================================================
page("docs/ers.html", 1, "The return line",
     "How the Erektor Return System reconditions a leg: check-in, inspection, cleaning, battery swap, diagnostics, and back to the pool.",
     CRUMB.format("The return line") + """
<section class="wrap">
  <span class="eyebrow">ERS</span>
  <h1>The return line</h1>
  <p class="lede">ERS is both a reconditioning conveyor and the software that tracks every leg across the
  fleet. Because every leg comes home, the line is also where almost all maintenance actually happens.</p>
</section>

<section class="wrap">
  """ + D.ERS_LINE + """
</section>

<section class="wrap prose">
  <h2 id="checkin">Check-in</h2>
  <p>A returning leg is read into the line against its electronics serial and reconciled with the central
  registry. This is the moment a leg stops being part of a session and becomes an asset in transit again.</p>

  <h2 id="inspection">Inspection</h2>
  <p>Inspection is where flags are read and acted on. A leg carrying a
  <a href="../maintenance.html">maintenance flag</a> is diverted out of the line here rather than
  continuing to cleaning; so is a leg that fails inspection on its own merits.</p>
  <p>This is the reason the flag route exists at all. The leg was already coming back, so diverting it at
  inspection costs no transport and no site time. Sending a technician to a standing station to look at a
  leg that will be on this belt within the week is waste.</p>
  <div class="note note--info">
    <p class="note__title">Flags are read against the frame</p>
    <p>Inspection matches on the mechanical serial. A flag filed against the electronics serial will not
    be found if the ClearCore was swapped in the meantime &mdash; see
    <a href="leg.html#identity">serials and identity</a>.</p>
  </div>

  <h2 id="cleaning">Cleaning</h2>
  <p>Cleaning is a lifespan measure rather than a cosmetic one. Contamination in the caster assemblies and
  around the bracket face is what turns a wear trend into a stall.</p>

  <h2 id="swap">Battery swap, not charging</h2>
  <p>Depleted packs come off at the swap station and charged packs go straight in. Charging happens
  off-belt, in parallel, on its own bank.</p>
  <div class="note note--ok">
    <p class="note__title">Why this is the important decision on the line</p>
    <p>A leg&rsquo;s time in reconditioning is the swap &mdash; about an hour &mdash; not the three-hour charge. That
    single choice takes reconditioning off the critical path: the line sustains one station per hour for
    as long as the charged-pack shelf never starves, which is an inventory problem rather than a hard
    throughput constraint.</p>
  </div>

  <h2 id="diagnostics">Diagnostics</h2>
  <p>The health check before a leg is returned to the pool. Wear trends are updated against the mechanical
  serial here, and firmware is brought to the fleet&rsquo;s stable channel if the leg is behind
  (<code>CTL-05</code>). A leg that is due a beta build is held for an
  <a href="../firmware/index.html">ERS-only application</a>, because that update re-runs axis calibration
  on first boot and must not do so at a site.</p>

  <h2 id="intervals">Service intervals</h2>
  <p>Intervals accrue against the mechanical serial: motor-hours, or twelve months since the last closed
  service record, whichever comes first. Reaching one raises <code>SES-30</code>, which routes to a
  <a href="../maintenance.html">flag</a> rather than a dispatch &mdash; a leg at its interval is not a leg in
  trouble.</p>
  <p>The code clears when ERS closes the service record against the frame. It does not clear on a
  controller swap, which is exactly the point.</p>

  <h2 id="registry">The central registry</h2>
  <p>ERS keeps an always-online registry of every leg across every facility. Its main job is preventing a
  false loss: without it, a leg that moved between facilities looks missing to the facility that thinks it
  still holds it.</p>
  <p>If the registry holds no recent check-in for a leg another facility believes it has
  (<code>SES-41</code>), do not claim it into a session. Report it. The registry exists so that this
  resolves as a bookkeeping question rather than a search.</p>
  <p>Above the registry sits hard company isolation for multi-tenant fleets, and a manufacturer-level
  reporting tier used for lease administration and warranty &mdash; both of which read the mechanical serial,
  because that is the number a lease is written against.</p>
</section>
""")


# ===========================================================================
page("docs/faults.html", 1, "Fault codes",
     "Every Erektor fault code, what it means, and which of the three service routes it puts you on.",
     CRUMB.format("Fault codes") + """
<section class="wrap" data-triage>
  <span class="eyebrow">Triage</span>
  <h1>Fault codes</h1>
  <p class="lede">Each code resolves to one of three routes: fix it on the floor, flag the leg so ERS
  diverts it on return, or dispatch a replacement because the leg cannot finish its session.</p>

  <div class="field limit-input mt-2" >
    <label for="triage">Look up a code</label>
    <input type="search" id="triage" class="mono" data-triage-input placeholder="LFT-45" autocomplete="off">
    <p class="field__hint">Or pick one from the index below.</p>
  </div>
  <div data-triage-out hidden class="mt-1 limit"></div>

  <h2>Index</h2>
  <div data-triage-list>
    <p class="muted">Loading the fault table&hellip;</p>
  </div>

  <noscript>
    <p class="note note--warn">The code index is rendered from
    <code>/data/faults.json</code> and needs JavaScript. The raw table is readable directly at
    <a href="../data/faults.json">/data/faults.json</a>, and both service routes work without it:
    <a href="../dispatch.html">dispatch</a> and <a href="../maintenance.html">maintenance</a>.</p>
  </noscript>

  <h2>Reading a code</h2>
  <p>Codes are <code>SUB-nn</code>, where the prefix names the subsystem:</p>
  <div class="table-scroll">
    <table>
      <thead><tr><th>Prefix</th><th>Subsystem</th></tr></thead>
      <tbody>
        <tr><td class="mono">PWR</td><td>Power &mdash; 56&nbsp;V motor bus and 24&nbsp;V logic</td></tr>
        <tr><td class="mono">DRV</td><td>Drive axis &mdash; ClearPath-SC servo and driven caster</td></tr>
        <tr><td class="mono">LFT</td><td>Lift axis &mdash; ClearPath-SC servo and lift column</td></tr>
        <tr><td class="mono">CTL</td><td>ClearCore controller</td></tr>
        <tr><td class="mono">NET</td><td>XBee radio and session network</td></tr>
        <tr><td class="mono">DCK</td><td>Rail bracket and dock</td></tr>
        <tr><td class="mono">SES</td><td>Session and module pairing</td></tr>
      </tbody>
    </table>
  </div>

  <div class="note note--info">
    <p class="note__title">No code is not a blocker</p>
    <p>If a leg cannot finish its session, <a href="../dispatch.html">request a replacement</a> without
    waiting for a code. Describe what it does and what it will not do.</p>
  </div>
</section>
""")


# ===========================================================================
page("docs/safety.html", 1, "Safety",
     "Safety cases for Erektor operation: working under a held load, the walk-off as governing load case, and transport securement.",
     CRUMB.format("Safety") + """
<section class="wrap prose">
  <span class="eyebrow">Read before a walk-off</span>
  <h1>Safety</h1>
  <p class="lede">Three situations account for nearly all of the risk in the cycle: a load held by legs, the
  walk-off, and a structure secured for transport. Everything else is ordinary shop-floor practice.</p>

  <h2 id="before">Before any work near a claimed leg</h2>
  <ul class="checklist">
    <li><input type="checkbox" id="c1"><label for="c1">Every leg in the module is in session and reporting.</label></li>
    <li><input type="checkbox" id="c2"><label for="c2">The session controller is within radio range and attended.</label></li>
    <li><input type="checkbox" id="c3"><label for="c3">No leg in the module carries an unresolved <code>LFT</code> code.</label></li>
    <li><input type="checkbox" id="c4"><label for="c4">Approach lanes are clear &mdash; a converging leg is under its own command.</label></li>
    <li><input type="checkbox" id="c5"><label for="c5">Everyone in the area knows the structure is live.</label></li>
  </ul>

  <h2 id="load">Working under a held load</h2>
  <div class="note note--crit">
    <p class="note__title">Never work under a load held only by lift axes</p>
    <p>A lift column that will not hold (<code>LFT-45</code>) is a safety event, not a fault report. Set
    the structure down on its own supports before releasing anyone into the work area, then
    <a href="../dispatch.html">request a replacement</a>.</p>
  </div>
  <p>A module distributes load across its legs, and each leg closes its own loop. That is a strength while
  every leg is reporting, and a hazard the moment one is not: the remaining legs do not know what share
  the silent leg is still carrying. This is why a lost leg inhibits its whole module
  (<code>NET-20</code>) rather than redistributing, and why a manual override on an out-of-session leg is
  never acceptable.</p>

  <h2 id="walkoff">The walk-off</h2>
  <p>Walking the full rigid structure and payload off the trailer lip is the governing load case for the
  entire design. It is the highest-risk stability event in the cycle and the case the frame is engineered
  against.</p>
  <ol class="steps">
    <li><b>Confirm the full roster before commanding drive.</b> A module that loses a leg part-way over the
    lip is the scenario every other rule here exists to prevent.</li>
    <li><b>Exclude restricted legs.</b> Any leg carrying an <code>LFT-22</code> holding-drift flag, or
    running a beta firmware build, is excluded from walk-off sessions. The session controller enforces
    this; verify it anyway.</li>
    <li><b>Clear the entire drop zone and the trailer&rsquo;s far side.</b> Not just the path &mdash; the area the
    structure would reach if it did not stop where intended.</li>
    <li><b>No one on the trailer, and no one alongside it, during the walk-off.</b></li>
    <li><b>If any leg reports mid-walk-off, do not attempt to reverse under fault.</b> Hold, get people
    clear, and call it in as a dispatch with the session stage recorded &mdash; that stage moves the request
    to the top of the queue.</li>
  </ol>

  <h2 id="transport">Transport securement</h2>
  <p>The structure self-secures to FMCSA &sect;393.100&ndash;136 before the session controller releases the
  drive lock. Do not defeat the lock to reposition on the bed; re-run the securement sequence instead.</p>

  <h2 id="standards">Standards</h2>
  <ul>
    <li><b>ISO/TS 15066</b> &mdash; collaborative operation, for the shared floor during convergence and
    outfit.</li>
    <li><b>ANSI/RIA R15.08</b> &mdash; industrial mobile robots, covering the driven-caster movement phases.</li>
    <li><b>FMCSA &sect;393.100&ndash;136</b> &mdash; cargo securement, for self-loading and over-the-road transport.</li>
  </ul>
</section>
""")


# ===========================================================================
page("firmware/index.html", 1, "Controller firmware",
     "Current Erektor controller firmware versions, release notes, and how a signed bundle reaches a leg that has no internet path of its own.",
     '<p class="crumbs"><a href="../index.html">Support</a><span>/</span>Firmware</p>' + """
<section class="wrap">
  <span class="eyebrow">Fleet</span>
  <h1>Controller firmware</h1>
  <p class="lede">What each target should be running, what changed, and the path a bundle takes to get
  there. Legs are not on the internet; every update reaches them through a session controller.</p>
</section>

<section class="wrap">
  """ + D.FIRMWARE_PATH + """
</section>

<section class="wrap">
  <h2>Current releases</h2>
  <div data-firmware>
    <p class="muted">Loading the manifest&hellip;</p>
  </div>
  <noscript>
    <p class="note note--warn">This table is rendered from the manifest at
    <a href="../data/firmware.json">/data/firmware.json</a>, which is readable directly.</p>
  </noscript>
</section>

<section class="wrap prose">
  <h2 id="uplink">How a bundle actually lands</h2>
  <ol class="steps">
    <li><b>The session controller pulls it.</b> SC-1 is the only device on the network with an uplink to
    this portal. If the uplink is down (<code>NET-25</code>), sessions carry on normally offline and
    firmware simply waits.</li>
    <li><b>It stages, it does not apply.</b> The bundle sits on the session controller until a leg docks.
    Nothing is ever written to a leg mid-session.</li>
    <li><b>It fans out over XBee at the next dock,</b> when the leg is stationary and unloaded.</li>
    <li><b>The leg verifies the signature before it writes.</b> A bundle that does not verify is discarded
    and reported, not retried.</li>
  </ol>

  <h2>Channels</h2>
  <div class="table-scroll">
    <table>
      <thead><tr><th>Channel</th><th>Who gets it</th></tr></thead>
      <tbody>
        <tr><td><span class="pill pill--ok">Stable</span></td>
            <td>Every fielded leg by default. Promoted after 30 days on beta with no field regressions.</td></tr>
        <tr><td><span class="pill pill--warn">Beta</span></td>
            <td>Opt-in per facility, against a signed consent record. Beta legs are excluded from
            walk-off sessions.</td></tr>
        <tr><td><span class="pill pill--flat">Hold</span></td>
            <td>No bundles delivered. Set by EREKTOR engineering while a regression is under
            investigation.</td></tr>
      </tbody>
    </table>
  </div>

  <h2>Where an update is allowed to apply</h2>
  <ul>
    <li><b>At the next dock</b> &mdash; the normal case. Stationary, unloaded, a few minutes.</li>
    <li><b>When idle</b> &mdash; session controllers, between sessions.</li>
    <li><b>At ERS only</b> &mdash; any build that re-runs axis calibration on first boot. Calibration must not
    happen at a site, so these are held for the <a href="../docs/ers.html#diagnostics">diagnostics
    stage</a> of the return line.</li>
  </ul>

  <div class="note note--warn">
    <p class="note__title">Pilot-fleet controllers have no remote path</p>
    <p>CC-0 accepts no signed bundles. Its final maintenance release is applied by cable during an ERS
    visit, which means a pilot leg only ever updates when it comes home.</p>
  </div>

  <h2>A leg behind the fleet</h2>
  <p>A leg running an older version than the stable channel reports <code>CTL-05</code>. No action is
  needed &mdash; the session controller pushes the bundle at the next dock. If it persists across two returns,
  <a href="../maintenance.html">flag the leg</a>; something is refusing the write.</p>
</section>
""")
