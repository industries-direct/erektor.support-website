"""Inline SVG product diagrams.

Drawn rather than photographed so they stay legible in both themes and print,
and so labels are selectable text. Every stroke uses a theme class from
site.css: d-stroke, d-thin, d-accent, d-fill, d-label, d-note, d-key.
"""

LEG_ELEVATION = """
<figure>
  <div class="diagram">
    <svg viewBox="0 0 760 470" role="img" aria-labelledby="dlegT dlegD">
      <title id="dlegT">Leg elevation</title>
      <desc id="dlegD">One leg seen from the side. The bracket face meets the station rail at the top. Below it the lift column carries a ClearPath-SC lift servo. The controller enclosure and battery sit on the spine. The base spreads to three casters, of which the right-hand one is driven.</desc>

      <!-- station rail -->
      <rect x="150" y="46" width="440" height="18" rx="2" class="d-fill"/>
      <line x1="150" y1="55" x2="590" y2="55" class="d-thin" stroke-dasharray="5 5"/>
      <text x="370" y="34" text-anchor="middle" class="d-note">STATION RAIL — BRACKET SEATS AT ANY MOUNTING POINT</text>

      <!-- bracket face -->
      <rect x="330" y="64" width="80" height="28" rx="2" class="d-fill" stroke-width="2"/>
      <line x1="348" y1="64" x2="348" y2="92" class="d-thin"/>
      <line x1="392" y1="64" x2="392" y2="92" class="d-thin"/>

      <!-- lift column -->
      <rect x="352" y="92" width="36" height="158" rx="2" class="d-fill"/>
      <rect x="360" y="150" width="20" height="100" class="d-fill"/>

      <!-- lift servo -->
      <rect x="326" y="104" width="88" height="44" rx="3" class="d-fill" stroke-width="2"/>
      <text x="370" y="131" text-anchor="middle" class="d-key">LIFT SERVO</text>

      <!-- lift travel arrow -->
      <line x1="306" y1="106" x2="306" y2="246" class="d-accent" stroke-width="1.5"/>
      <path d="M306 102 l-5 9 h10 z" class="d-accent-f"/>
      <path d="M306 250 l-5 -9 h10 z" class="d-accent-f"/>

      <!-- battery -->
      <rect x="176" y="176" width="104" height="58" rx="3" class="d-fill" stroke-width="2"/>
      <text x="228" y="200" text-anchor="middle" class="d-key">PACK</text>
      <text x="228" y="216" text-anchor="middle" class="d-note">56 V / 24 V</text>
      <line x1="280" y1="205" x2="360" y2="205" class="d-thin"/>

      <!-- controller enclosure -->
      <rect x="460" y="176" width="118" height="58" rx="3" class="d-fill" stroke-width="2"/>
      <text x="519" y="200" text-anchor="middle" class="d-key">CLEARCORE</text>
      <text x="519" y="216" text-anchor="middle" class="d-note">+ XBee radio</text>
      <line x1="388" y1="205" x2="460" y2="205" class="d-thin"/>

      <!-- base spine -->
      <rect x="264" y="250" width="212" height="20" rx="2" class="d-fill" stroke-width="2"/>

      <!-- caster stems -->
      <line x1="286" y1="270" x2="212" y2="316" class="d-stroke" stroke-width="2"/>
      <line x1="370" y1="270" x2="370" y2="316" class="d-stroke" stroke-width="2"/>
      <line x1="454" y1="270" x2="528" y2="316" class="d-accent" stroke-width="2"/>

      <!-- casters -->
      <circle cx="212" cy="334" r="18" class="d-fill" stroke-width="2"/>
      <circle cx="370" cy="334" r="18" class="d-fill" stroke-width="2"/>
      <circle cx="528" cy="334" r="18" class="d-accent" stroke-width="2.5" fill="none"/>
      <circle cx="528" cy="334" r="5" class="d-accent-f"/>

      <!-- drive servo on the driven caster -->
      <rect x="556" y="292" width="70" height="34" rx="3" class="d-fill" stroke-width="2"/>
      <text x="591" y="313" text-anchor="middle" class="d-key">DRIVE</text>
      <line x1="556" y1="309" x2="536" y2="322" class="d-thin"/>

      <!-- floor -->
      <line x1="130" y1="356" x2="640" y2="356" class="d-stroke" stroke-width="2"/>
      <g class="d-thin">
        <line x1="140" y1="356" x2="128" y2="368"/><line x1="176" y1="356" x2="164" y2="368"/>
        <line x1="212" y1="356" x2="200" y2="368"/><line x1="248" y1="356" x2="236" y2="368"/>
        <line x1="284" y1="356" x2="272" y2="368"/><line x1="320" y1="356" x2="308" y2="368"/>
        <line x1="356" y1="356" x2="344" y2="368"/><line x1="392" y1="356" x2="380" y2="368"/>
        <line x1="428" y1="356" x2="416" y2="368"/><line x1="464" y1="356" x2="452" y2="368"/>
        <line x1="500" y1="356" x2="488" y2="368"/><line x1="536" y1="356" x2="524" y2="368"/>
        <line x1="572" y1="356" x2="560" y2="368"/><line x1="608" y1="356" x2="596" y2="368"/>
      </g>

      <!-- callouts -->
      <g class="d-label">
        <text x="640" y="82">Bracket face</text>
        <text x="640" y="212">Controller</text>
        <text x="640" y="340">Driven caster</text>
        <text x="120" y="212" text-anchor="end">Battery</text>
        <text x="120" y="180" text-anchor="end">Lift travel</text>
        <text x="120" y="340" text-anchor="end">Free casters</text>
      </g>
      <g class="d-thin">
        <polyline points="636,78 412,78"/>
        <polyline points="636,208 582,208"/>
        <polyline points="636,336 552,336"/>
        <polyline points="124,208 172,208"/>
        <polyline points="124,176 306,176"/>
        <polyline points="124,336 194,336"/>
        <polyline points="194,336 352,336"/>
      </g>

      <!-- serial stamp callout -->
      <text x="370" y="400" text-anchor="middle" class="d-note">MECHANICAL SERIAL (MX) STAMPED ON THE FRAME ABOVE THE BRACKET FACE</text>
      <text x="370" y="418" text-anchor="middle" class="d-note">ELECTRONICS SERIAL (EL) READS FROM THE CLEARCORE — IT CHANGES WHEN THE CONTROLLER DOES</text>
      <line x1="370" y1="382" x2="370" y2="96" class="d-thin" stroke-dasharray="3 4"/>
    </svg>
  </div>
  <figcaption>A leg is self-contained: its own 56&nbsp;V motor bus and 24&nbsp;V logic, its own ClearCore and XBee radio, two ClearPath-SC servos on the lift and drive axes, and three casters of which one is driven. Nothing crosses to a neighbouring leg — no wiring, no bus, no shared rigidity.</figcaption>
</figure>
"""

LEG_PLAN = """
<figure>
  <div class="diagram">
    <svg viewBox="0 0 480 380" role="img" aria-labelledby="dplanT dplanD">
      <title id="dplanT">Leg plan view</title>
      <desc id="dplanD">The leg seen from above. Three casters sit at the corners of a triangle around the central lift column. One caster is driven; the other two swivel freely.</desc>

      <!-- tripod outline -->
      <polygon points="240,88 388,300 92,300" class="d-fill" stroke-width="2"/>

      <!-- centre column -->
      <circle cx="240" cy="230" r="30" class="d-fill" stroke-width="2"/>
      <circle cx="240" cy="230" r="12" class="d-thin"/>
      <text x="240" y="234" text-anchor="middle" class="d-key">COLUMN</text>

      <!-- casters -->
      <circle cx="240" cy="88" r="22" class="d-accent" stroke-width="2.5" fill="none"/>
      <circle cx="240" cy="88" r="6" class="d-accent-f"/>
      <circle cx="388" cy="300" r="22" class="d-fill" stroke-width="2"/>
      <circle cx="92" cy="300" r="22" class="d-fill" stroke-width="2"/>

      <!-- swivel indication on free casters -->
      <path d="M368 284 a26 26 0 0 1 34 30" class="d-thin"/>
      <path d="M112 284 a26 26 0 0 0 -34 30" class="d-thin"/>

      <!-- drive direction -->
      <line x1="240" y1="58" x2="240" y2="24" class="d-accent" stroke-width="1.5"/>
      <path d="M240 18 l-6 11 h12 z" class="d-accent-f"/>

      <g class="d-label">
        <text x="240" y="12" text-anchor="middle">Drive</text>
        <text x="420" y="340" text-anchor="end">Free swivel</text>
        <text x="60" y="340">Free swivel</text>
      </g>
      <text x="240" y="356" text-anchor="middle" class="d-note">A LEG STANDS UNSUPPORTED ON THIS TRIPOD — NO PROP, NO NEIGHBOUR</text>
    </svg>
  </div>
  <figcaption>One driven caster and two free swivels. The tripod is why a leg is stable on its own on the floor, in transit, and on the ERS belt — and why a single leg can be handled as an independent asset rather than half of a fixed machine.</figcaption>
</figure>
"""

MODULE_TOPOLOGY = """
<figure>
  <div class="diagram">
    <svg viewBox="0 0 760 340" role="img" aria-labelledby="dmodT dmodD">
      <title id="dmodT">Module pairing along the station rail</title>
      <desc id="dmodD">A station seen from above. Legs bolt to mounting points along both sides of the rail. Each left leg is paired with a right leg in software to form a module. Between three and six modules are claimed per build.</desc>

      <!-- station body -->
      <rect x="90" y="128" width="580" height="84" rx="4" class="d-fill"/>
      <text x="380" y="176" text-anchor="middle" class="d-note">CHARGING STATION — ALUMINIUM RAIL RUNS THE FULL LENGTH</text>

      <!-- rail lines -->
      <line x1="90" y1="128" x2="670" y2="128" class="d-accent" stroke-width="2.5"/>
      <line x1="90" y1="212" x2="670" y2="212" class="d-accent" stroke-width="2.5"/>

      <!-- mounting ticks -->
      <g class="d-thin">
        <line x1="160" y1="120" x2="160" y2="136"/><line x1="260" y1="120" x2="260" y2="136"/>
        <line x1="360" y1="120" x2="360" y2="136"/><line x1="460" y1="120" x2="460" y2="136"/>
        <line x1="560" y1="120" x2="560" y2="136"/>
        <line x1="160" y1="204" x2="160" y2="220"/><line x1="260" y1="204" x2="260" y2="220"/>
        <line x1="360" y1="204" x2="360" y2="220"/><line x1="460" y1="204" x2="460" y2="220"/>
        <line x1="560" y1="204" x2="560" y2="220"/>
      </g>

      <!-- legs, left row (top) -->
      <g>
        <circle cx="160" cy="86" r="20" class="d-fill" stroke-width="2"/><text x="160" y="91" text-anchor="middle" class="d-key">L1</text>
        <circle cx="310" cy="86" r="20" class="d-fill" stroke-width="2"/><text x="310" y="91" text-anchor="middle" class="d-key">L2</text>
        <circle cx="460" cy="86" r="20" class="d-fill" stroke-width="2"/><text x="460" y="91" text-anchor="middle" class="d-key">L3</text>
        <circle cx="610" cy="86" r="20" class="d-fill" stroke-width="2"/><text x="610" y="91" text-anchor="middle" class="d-key">L4</text>
      </g>
      <!-- legs, right row (bottom) -->
      <g>
        <circle cx="160" cy="254" r="20" class="d-fill" stroke-width="2"/><text x="160" y="259" text-anchor="middle" class="d-key">R1</text>
        <circle cx="310" cy="254" r="20" class="d-fill" stroke-width="2"/><text x="310" y="259" text-anchor="middle" class="d-key">R2</text>
        <circle cx="460" cy="254" r="20" class="d-fill" stroke-width="2"/><text x="460" y="259" text-anchor="middle" class="d-key">R3</text>
        <circle cx="610" cy="254" r="20" class="d-fill" stroke-width="2"/><text x="610" y="259" text-anchor="middle" class="d-key">R4</text>
      </g>

      <!-- bolted attachment (solid) -->
      <g class="d-stroke" stroke-width="2">
        <line x1="160" y1="106" x2="160" y2="128"/><line x1="310" y1="106" x2="310" y2="128"/>
        <line x1="460" y1="106" x2="460" y2="128"/><line x1="610" y1="106" x2="610" y2="128"/>
        <line x1="160" y1="212" x2="160" y2="234"/><line x1="310" y1="212" x2="310" y2="234"/>
        <line x1="460" y1="212" x2="460" y2="234"/><line x1="610" y1="212" x2="610" y2="234"/>
      </g>

      <!-- software pairing (dashed, around the outside) -->
      <g class="d-accent" stroke-width="1.6" stroke-dasharray="6 5">
        <path d="M140 86 C 60 86, 60 254, 140 254"/>
        <path d="M290 86 C 232 86, 232 254, 290 254"/>
        <path d="M440 86 C 382 86, 382 254, 440 254"/>
        <path d="M590 86 C 532 86, 532 254, 590 254"/>
      </g>

      <g class="d-label">
        <text x="380" y="34" text-anchor="middle">Bolted attachment — mechanical</text>
        <text x="380" y="322" text-anchor="middle">Module pairing — software only, re-formed every session</text>
      </g>
      <line x1="380" y1="42" x2="380" y2="66" class="d-thin"/>
      <line x1="380" y1="300" x2="380" y2="286" class="d-thin"/>
    </svg>
  </div>
  <figcaption>The rail becomes the chassis. Legs bolt to fixed mounting points — attachment is a lookup, not a measurement, so no docking sensors are needed — while the left-to-right module pairing exists only in the session controller. Longer stations claim more modules, three to six, and the pairing is arbitrary each time.</figcaption>
</figure>
"""

ERS_LINE = """
<figure>
  <div class="diagram">
    <svg viewBox="0 0 760 330" role="img" aria-labelledby="dersT dersD">
      <title id="dersT">The ERS reconditioning line</title>
      <desc id="dersD">Six stages in sequence: check-in, inspection, cleaning, battery swap, diagnostics, and back to the available pool. Inspection can divert a leg out of the line. Charging happens on a separate bank in parallel, so the leg only spends the swap time on the belt.</desc>

      <g class="d-fill" stroke-width="2">
        <rect x="24" y="96" width="104" height="56" rx="4"/>
        <rect x="152" y="96" width="104" height="56" rx="4"/>
        <rect x="280" y="96" width="104" height="56" rx="4"/>
        <rect x="408" y="96" width="104" height="56" rx="4"/>
        <rect x="536" y="96" width="104" height="56" rx="4"/>
      </g>
      <rect x="664" y="96" width="72" height="56" rx="4" class="d-fill" stroke-width="2"/>

      <g class="d-label" text-anchor="middle">
        <text x="76" y="122">Check-in</text>
        <text x="204" y="122">Inspection</text>
        <text x="332" y="122">Cleaning</text>
        <text x="460" y="122">Battery swap</text>
        <text x="588" y="122">Diagnostics</text>
        <text x="700" y="122">Pool</text>
      </g>
      <g class="d-note" text-anchor="middle">
        <text x="76" y="140">returned</text>
        <text x="204" y="140">divert on fail</text>
        <text x="332" y="140">lifespan</text>
        <text x="460" y="140">~1 hr dwell</text>
        <text x="588" y="140">health check</text>
        <text x="700" y="140">available</text>
      </g>

      <!-- flow arrows -->
      <g class="d-accent" stroke-width="2">
        <line x1="128" y1="124" x2="146" y2="124"/>
        <line x1="256" y1="124" x2="274" y2="124"/>
        <line x1="384" y1="124" x2="402" y2="124"/>
        <line x1="512" y1="124" x2="530" y2="124"/>
        <line x1="640" y1="124" x2="658" y2="124"/>
      </g>
      <g class="d-accent-f">
        <path d="M152 124 l-9 -5 v10 z"/><path d="M280 124 l-9 -5 v10 z"/>
        <path d="M408 124 l-9 -5 v10 z"/><path d="M536 124 l-9 -5 v10 z"/>
        <path d="M664 124 l-9 -5 v10 z"/>
      </g>

      <!-- return to line start -->
      <path d="M700 152 v46 H76 v-46" class="d-thin" stroke-dasharray="6 5"/>
      <path d="M76 156 l-5 9 h10 z" class="d-thin" fill="currentColor"/>
      <text x="388" y="216" text-anchor="middle" class="d-note">BACK TO LINE START — EVERY LEG COMES HOME</text>

      <!-- divert -->
      <line x1="204" y1="96" x2="204" y2="62" class="d-accent" stroke-width="2" stroke-dasharray="5 4"/>
      <text x="216" y="56" class="d-note">DIVERT — FLAGGED OR FAILED LEGS LEAVE HERE</text>

      <!-- charging bank, parallel -->
      <rect x="392" y="246" width="136" height="48" rx="4" class="d-fill" stroke-width="2" stroke-dasharray="5 4"/>
      <text x="460" y="268" text-anchor="middle" class="d-label">Charge bank</text>
      <text x="460" y="285" text-anchor="middle" class="d-note">~3 hr, off-belt</text>
      <line x1="440" y1="152" x2="440" y2="246" class="d-thin"/>
      <line x1="480" y1="246" x2="480" y2="152" class="d-thin"/>
      <text x="548" y="272" class="d-note">PACKS CHARGE IN PARALLEL, NOT ON THE LEG</text>
    </svg>
  </div>
  <figcaption>Charging is the long step, so it happens off the belt on its own bank. A leg's time in the line is the swap — about an hour — not the three-hour charge. That is what keeps reconditioning off the critical path and lets the line hold one station per hour, provided the charged-pack shelf never starves.</figcaption>
</figure>
"""

FIRMWARE_PATH = """
<figure>
  <div class="diagram">
    <svg viewBox="0 0 760 260" role="img" aria-labelledby="dfwT dfwD">
      <title id="dfwT">How a firmware bundle reaches a leg</title>
      <desc id="dfwD">A signed bundle leaves this portal over the internet to a session controller, which is the only device with an uplink. The session controller then fans the bundle out to leg ClearCores over XBee at the next dock. Legs have no internet path of their own.</desc>

      <rect x="24" y="86" width="150" height="66" rx="5" class="d-fill" stroke-width="2"/>
      <text x="99" y="114" text-anchor="middle" class="d-label">This portal</text>
      <text x="99" y="132" text-anchor="middle" class="d-note">signed bundle</text>

      <rect x="272" y="86" width="176" height="66" rx="5" class="d-fill" stroke-width="2"/>
      <text x="360" y="114" text-anchor="middle" class="d-label">Session controller</text>
      <text x="360" y="132" text-anchor="middle" class="d-note">SC-1 · has the uplink</text>

      <g class="d-fill" stroke-width="2">
        <rect x="562" y="34" width="128" height="48" rx="5"/>
        <rect x="562" y="98" width="128" height="48" rx="5"/>
        <rect x="562" y="162" width="128" height="48" rx="5"/>
      </g>
      <g class="d-label" text-anchor="middle">
        <text x="626" y="63">Leg ClearCore</text>
        <text x="626" y="127">Leg ClearCore</text>
        <text x="626" y="191">Leg ClearCore</text>
      </g>

      <!-- portal to controller -->
      <line x1="174" y1="119" x2="264" y2="119" class="d-accent" stroke-width="2"/>
      <path d="M272 119 l-9 -5 v10 z" class="d-accent-f"/>
      <text x="219" y="104" text-anchor="middle" class="d-note">HTTPS</text>

      <!-- controller to legs -->
      <g class="d-accent" stroke-width="2" stroke-dasharray="6 4">
        <path d="M448 112 C 500 112, 505 58, 554 58"/>
        <path d="M448 119 H 554"/>
        <path d="M448 126 C 500 126, 505 186, 554 186"/>
      </g>
      <g class="d-accent-f">
        <path d="M562 58 l-9 -5 v10 z"/><path d="M562 119 l-9 -5 v10 z"/><path d="M562 186 l-9 -5 v10 z"/>
      </g>
      <text x="505" y="232" text-anchor="middle" class="d-note">XBEE · 300 m</text>

      <text x="380" y="26" text-anchor="middle" class="d-key">A LEG HAS NO INTERNET PATH OF ITS OWN</text>
      <text x="380" y="252" text-anchor="middle" class="d-note">NOTHING IS WRITTEN MID-SESSION — BUNDLES STAGE ON THE CONTROLLER AND APPLY AT THE NEXT DOCK</text>
    </svg>
  </div>
  <figcaption>The session controller is the only device on the network that reaches this portal. Bundles stage there and fan out over XBee when a leg docks — stationary, unloaded, and verified against the signature before it writes anything.</figcaption>
</figure>
"""

TRIAGE_ROUTES = """
<figure>
  <div class="diagram">
    <svg viewBox="0 0 760 300" role="img" aria-labelledby="dtriT dtriD">
      <title id="dtriT">The three service routes</title>
      <desc id="dtriD">A fault code resolves to one of three routes. Operator-serviceable faults are fixed on the floor. Faults that can wait are flagged so ERS diverts the leg at inspection when it returns. Only a leg that cannot finish its session triggers a dispatch.</desc>

      <rect x="24" y="112" width="150" height="66" rx="5" class="d-fill" stroke-width="2"/>
      <text x="99" y="140" text-anchor="middle" class="d-label">Fault code</text>
      <text x="99" y="158" text-anchor="middle" class="d-note">on the controller</text>

      <g class="d-fill" stroke-width="2">
        <rect x="330" y="14" width="180" height="62" rx="5"/>
        <rect x="330" y="114" width="180" height="62" rx="5"/>
      </g>
      <rect x="330" y="214" width="180" height="62" rx="5" class="d-fill" stroke-width="2" stroke="currentColor"/>

      <g class="d-label" text-anchor="middle">
        <text x="420" y="42">Fix on the floor</text>
        <text x="420" y="142">Flag for ERS</text>
        <text x="420" y="242">Dispatch a swap</text>
      </g>
      <g class="d-note" text-anchor="middle">
        <text x="420" y="60">no ticket, no record change</text>
        <text x="420" y="160">no truck — diverts on return</text>
        <text x="420" y="260">replacement leg to site now</text>
      </g>

      <g class="d-accent" stroke-width="2">
        <path d="M174 138 C 240 138, 250 45, 322 45"/>
        <path d="M174 145 H 322"/>
        <path d="M174 152 C 240 152, 250 245, 322 245"/>
      </g>
      <g class="d-accent-f">
        <path d="M330 45 l-9 -5 v10 z"/><path d="M330 145 l-9 -5 v10 z"/><path d="M330 245 l-9 -5 v10 z"/>
      </g>

      <g class="d-note">
        <text x="530" y="42">Leg keeps working.</text>
        <text x="530" y="142">Leg finishes the session,</text>
        <text x="530" y="158">then leaves the line at inspection.</text>
        <text x="530" y="242">Leg cannot finish the session.</text>
        <text x="530" y="258">Failed leg rides back to check-in.</text>
      </g>
    </svg>
  </div>
  <figcaption>The middle route is the one that is easy to miss. Because every leg returns to ERS anyway, a fault that can wait does not need a truck — it needs a flag on the leg&rsquo;s record. Sending a technician to a site is reserved for a leg that cannot finish its session.</figcaption>
</figure>
"""
