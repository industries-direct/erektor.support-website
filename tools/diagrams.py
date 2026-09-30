"""Inline SVG product diagrams.

Drawn rather than photographed so they stay legible in both themes and print,
and so labels are selectable text. Every stroke uses a theme class from
site.css: d-stroke, d-thin, d-accent, d-fill, d-label, d-note, d-key.
"""

LEG_ELEVATION = """
<figure>
  <div class="diagram">
    <svg viewBox="0 0 760 520" role="img" aria-labelledby="dlegT dlegD">
      <title id="dlegT">Leg elevation</title>
      <desc id="dlegD">One leg seen from its outboard side. Two struts and a base rail form an A-frame. A square mast stands at its centre, from the base rail up through the apex, and the inner mast rises out of it on a lead screw. The lift servo and gearbox sit at the foot of the mast. The battery and ClearCore box hangs outboard at the rear, and the leg rolls on three casters, of which the rear one is driven.</desc>

      <!-- rear and front struts -->
      <polygon points="238.8,400.3 370.8,124.2 390.6,133.8 258.6,409.9" class="d-fill" stroke-width="2"/>
      <polygon points="522.6,400.3 390.6,124.2 370.8,133.8 502.8,409.9" class="d-fill" stroke-width="2"/>

      <!-- outer mast, apex to base rail -->
      <rect x="368.2" y="129" width="25" height="297" class="d-fill" stroke-width="2"/>
      <!-- lead screw inside the mast -->
      <line x1="380.7" y1="423" x2="380.7" y2="203" class="d-accent" stroke-width="1.5" stroke-dasharray="4 3"/>

      <!-- inner mast, shown raised -->
      <rect x="370.8" y="36.6" width="19.8" height="92.4" class="d-fill" stroke-width="2"/>

      <!-- apex joint -->
      <rect x="361" y="127" width="39.6" height="17.6" rx="1" class="d-fill" stroke-width="2"/>

      <!-- lift travel -->
      <line x1="414" y1="44" x2="414" y2="122" class="d-accent" stroke-width="1.5"/>
      <path d="M414 38 l-5 9 h10 z" class="d-accent-f"/>
      <path d="M414 128 l-5 -9 h10 z" class="d-accent-f"/>

      <!-- tie-down D-rings on the mast -->
      <path d="M374.5 150 a6.2 6.2 0 0 0 12.4 0 z" class="d-accent" stroke-width="1.5"/>
      <path d="M374.5 340 a6.2 6.2 0 0 0 12.4 0 z" class="d-accent" stroke-width="1.5"/>

      <!-- XBee antenna on the front strut -->
      <line x1="467.6" y1="226" x2="467.6" y2="259" class="d-stroke" stroke-width="2"/>
      <circle cx="467.6" cy="226" r="2" class="d-ink"/>

      <!-- base rail -->
      <rect x="230" y="405.1" width="298.1" height="20.9" rx="1" class="d-fill" stroke-width="2"/>

      <!-- caster stems -->
      <line x1="246.5" y1="426" x2="246.5" y2="440" class="d-accent" stroke-width="2"/>
      <line x1="370.8" y1="426" x2="370.8" y2="440" class="d-stroke" stroke-width="2"/>
      <line x1="503.5" y1="426" x2="503.5" y2="440" class="d-stroke" stroke-width="2"/>

      <!-- outboard box: pack and ClearCore -->
      <rect x="233.3" y="426" width="116.6" height="37.4" rx="2" class="d-fill" stroke-width="2"/>
      <text x="306" y="441" text-anchor="middle" class="d-key">PACK +</text>
      <text x="306" y="455" text-anchor="middle" class="d-key">CLEARCORE</text>

      <!-- casters: rear driven, mid outboard, front -->
      <circle cx="246.5" cy="453.5" r="16.5" class="d-accent" stroke-width="2.5" fill="none"/>
      <circle cx="246.5" cy="453.5" r="4.5" class="d-accent-f"/>
      <circle cx="370.8" cy="453.5" r="16.5" class="d-fill" stroke-width="2"/>
      <circle cx="503.5" cy="453.5" r="16.5" class="d-fill" stroke-width="2"/>

      <!-- lift servo and gearbox at the mast foot, behind the outboard caster -->
      <rect x="357.6" y="426" width="35.6" height="37.4" rx="2" class="d-stroke" stroke-width="1.5" stroke-dasharray="4 3"/>

      <!-- floor -->
      <line x1="190" y1="470" x2="570" y2="470" class="d-stroke" stroke-width="2"/>
      <g class="d-thin">
        <line x1="200" y1="470" x2="188" y2="482"/><line x1="236" y1="470" x2="224" y2="482"/>
        <line x1="272" y1="470" x2="260" y2="482"/><line x1="308" y1="470" x2="296" y2="482"/>
        <line x1="344" y1="470" x2="332" y2="482"/><line x1="380" y1="470" x2="368" y2="482"/>
        <line x1="416" y1="470" x2="404" y2="482"/><line x1="452" y1="470" x2="440" y2="482"/>
        <line x1="488" y1="470" x2="476" y2="482"/><line x1="524" y1="470" x2="512" y2="482"/>
        <line x1="560" y1="470" x2="548" y2="482"/>
      </g>

      <!-- callouts -->
      <g class="d-label">
        <text x="560" y="60">Inner mast</text>
        <text x="560" y="88">Lift travel</text>
        <text x="560" y="140">Apex</text>
        <text x="560" y="246">XBee antenna</text>
        <text x="560" y="420">Base rail</text>
        <text x="560" y="446">Lift servo, 40:1 gearbox</text>
        <text x="560" y="466">Free caster</text>
        <text x="200" y="194" text-anchor="end">Mast + lead screw</text>
        <text x="200" y="344" text-anchor="end">Tie-down D-rings</text>
        <text x="200" y="440" text-anchor="end">Outboard box</text>
        <text x="200" y="462" text-anchor="end">Driven caster</text>
      </g>
      <g class="d-thin">
        <polyline points="556,56 392,56"/>
        <polyline points="556,84 418,84"/>
        <polyline points="556,136 402,136"/>
        <polyline points="556,242 470,242"/>
        <polyline points="556,416 529,416"/>
        <polyline points="556,442 394,442"/>
        <polyline points="556,462 520,462"/>
        <polyline points="204,190 368,190"/>
        <polyline points="204,340 374,340"/>
        <polyline points="204,436 233,436"/>
        <polyline points="204,458 230,458"/>
      </g>

      <text x="380" y="505" text-anchor="middle" class="d-note">FROM THE V3 CAD · ≈1.36 M LONG · APEX ≈1.55 M · MAST SHOWN RAISED ≈1.97 M</text>
    </svg>
  </div>
  <figcaption>The leg from its outboard side. Two struts and a base rail make the A-frame; the square mast stands at its centre, and the inner mast rises out of it on a lead screw turned by the lift servo and its 40:1 planetary gearbox at the mast foot. The pack and ClearCore ride in the outboard box over the rear caster, which is the driven one. A leg carries its own 56&nbsp;V motor bus and 24&nbsp;V logic, its own ClearCore and XBee radio, and two ClearPath-SC servos. Nothing crosses to a neighbouring leg — no wiring, no bus, no shared rigidity.</figcaption>
</figure>
"""

LEG_PLAN = """
<figure>
  <div class="diagram">
    <svg viewBox="-107 0 760 450" role="img" aria-labelledby="dplanT dplanD">
      <title id="dplanT">Leg plan view</title>
      <desc id="dplanD">The leg seen from above. The A-frame and mast run along the inner edge, facing the partner leg. An outrigger carries the battery and ClearCore box and a third caster on the outboard side. The three casters form a triangle: front and rear on the A-frame line, one outboard beside the mast. The rear caster is driven by a servo lying across the leg.</desc>

      <!-- A-frame line: base rail and struts from above -->
      <rect x="268" y="61.25" width="25.75" height="338.75" rx="1" class="d-fill" stroke-width="2"/>

      <!-- outrigger cross-member and outboard strut -->
      <rect x="190" y="215" width="78" height="25" rx="1" class="d-fill" stroke-width="2"/>

      <!-- outboard box -->
      <rect x="192" y="245" width="76" height="155" rx="2" class="d-fill" stroke-width="2"/>
      <text x="218" y="316" text-anchor="middle" class="d-key">PACK +</text>
      <text x="218" y="330" text-anchor="middle" class="d-key">CLEARCORE</text>

      <!-- mast, inner mast, lead screw -->
      <rect x="268" y="214.5" width="25.75" height="28.5" class="d-fill" stroke-width="2"/>
      <rect x="270.9" y="217.4" width="20" height="22.7" class="d-thin"/>
      <circle cx="280.9" cy="228.7" r="3" class="d-accent-f"/>

      <!-- casters -->
      <circle cx="280.75" cy="89.25" r="13" class="d-fill" stroke-width="2"/>
      <circle cx="205" cy="235" r="13" class="d-fill" stroke-width="2"/>
      <circle cx="280.75" cy="381.25" r="13" class="d-accent" stroke-width="2.5" fill="none"/>
      <circle cx="280.75" cy="381.25" r="4" class="d-accent-f"/>

      <!-- drive servo across the rear of the leg -->
      <rect x="202.5" y="371.25" width="47.5" height="20" rx="2" class="d-fill" stroke-width="2"/>
      <text x="226.25" y="385" text-anchor="middle" class="d-key">DRIVE</text>
      <line x1="250" y1="381.25" x2="267.75" y2="381.25" class="d-accent" stroke-width="1.5"/>

      <!-- stance triangle through the three casters -->
      <polygon points="280.75,89.25 280.75,381.25 205,235" class="d-accent" stroke-width="1" stroke-dasharray="5 4"/>

      <!-- toward the partner leg -->
      <line x1="304" y1="262" x2="350" y2="262" class="d-accent" stroke-width="1.5"/>
      <path d="M356 262 l-10 -5 v10 z" class="d-accent-f"/>

      <g class="d-label">
        <text x="310" y="93">Front caster — free</text>
        <text x="310" y="150">A-frame line</text>
        <text x="310" y="210">Mast, lead screw at centre</text>
        <text x="362" y="266">Partner leg</text>
        <text x="310" y="385">Driven caster</text>
        <text x="176" y="239" text-anchor="end">Outboard caster</text>
        <text x="176" y="253" text-anchor="end" class="d-note">free</text>
        <text x="176" y="324" text-anchor="end">Outboard box</text>
        <text x="176" y="385" text-anchor="end">Drive servo</text>
      </g>
      <g class="d-thin">
        <polyline points="306,146 294,146"/>
        <polyline points="306,206 294,218"/>
        <polyline points="180,320 192,320"/>
        <polyline points="180,381 202,381"/>
      </g>

      <text x="273" y="428" text-anchor="middle" class="d-note">LEFT AND RIGHT LEGS ARE MIRROR IMAGES — THE OUTRIGGER FACES AWAY FROM THE PARTNER</text>
    </svg>
  </div>
  <figcaption>From above. The mast is on the A-frame line, not at the centre of the footprint: the outrigger carries the pack, the ClearCore and the third caster outboard, so the three casters stand in a triangle — front and rear on the A-frame line, one outboard beside the mast. That triangle is why a leg is stable on its own on the floor, in transit and on the ERS belt, and why a single leg can be handled as an independent asset rather than half of a fixed machine. A module pairs a left leg with its mirror-image right leg, outriggers facing out.</figcaption>
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
