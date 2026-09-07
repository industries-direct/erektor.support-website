# EREKTOR Support Portal

The operator-facing edge of the **Erektor Return System**. Field crews use it to get a leg
serviced, get a replacement leg to a site, read the procedures and diagrams, and see what
firmware their controllers should be running.

Production: **https://erektor.support** — Cloudflare Pages.

---

## The system it belongs to

There is no persistent Erektor. The durable entities are **legs**, **controllers** and
**sessions**; a module is a left-plus-right leg pairing that exists only in software and is
re-formed every session. Three consequences shape this entire site:

1. **Field service is replacement, not repair.** Legs share no wiring, no bus and no
   rigidity, so the unit of service is the whole leg, swapped from the pool.
2. **Every leg comes home anyway.** So a fault that can wait does not need a truck — it
   needs a flag on the leg's record that diverts it at ERS inspection.
3. **A leg has two identities.** Firmware and pairing follow the *electronics* serial;
   wear, intervals and warranty follow the stamped *mechanical* serial.

That gives three service routes rather than two, and the fault-code table is what assigns
them:

| Route | When | Filed against | Cost |
|---|---|---|---|
| Fix on the floor | Operator-serviceable | — | none |
| Flag for ERS | Leg can finish its session | mechanical serial | no site visit |
| Dispatch a swap | Leg cannot finish its session | electronics serial | a truck |

`data/faults.json` maps every code to one of these and the UI carries the code into
whichever form it picked. That table is the spine of the site — change it and the triage,
the index, and the form prefills all follow.

---

## Layout

```
index.html              Hub: the three routes, plus fault lookup
dispatch.html           Request a replacement leg (electronics serial)
maintenance.html        Flag a leg for the ERS line (mechanical serial)
docs/
  index.html            Documentation index, service intervals
  leg.html              Anatomy, SVG diagrams, dual-serial identity
  operating.html        Claim → converge → dock → pair → level → walk off → place → release
  ers.html              The return line, battery swap, intervals, registry
  faults.html           Triage lookup + full code index
  safety.html           Held loads, the walk-off, transport securement
firmware/index.html     Manifest, release notes, how a bundle reaches a leg

data/
  hardware.json         Leg variants, controllers, serial formats
  faults.json           Fault code → service route table
  firmware.json         Release manifest (the OTA seed)

assets/css/site.css     Design system (EREKTOR brand tokens, field-tuned)
assets/js/app.js        Progressive enhancement only
functions/api/          Cloudflare Pages Functions
tools/                  Page assembler (see below)
_headers _redirects     Edge config
```

**Product facts live in `data/*.json`, never in markup.** The pages fetch and render them at
runtime, so updating the catalog, the fault table or the firmware manifest is a data edit —
no page needs touching.

---

## Building

There is **no deploy-time build**. Cloudflare Pages serves the committed HTML directly with
an empty build command. This is deliberate: the previous generation of this site used Jekyll,
and the Ruby toolchain is what broke the Pages deploys.

The ten pages share a header and footer via a local assembler that you run yourself and
commit the output of:

```sh
python3 tools/pages.py     # rewrites the .html files in place
```

Edit page content in `tools/pages.py` and `tools/docs.py`, diagrams in `tools/diagrams.py`,
then re-run and commit. Editing the generated `.html` directly works too, but the next run
of the assembler will overwrite it.

### Cloudflare Pages settings

| Setting | Value |
|---|---|
| Build command | *(empty)* |
| Build output directory | `/` |
| Functions directory | `functions` (default) |

---

## Runtime

`assets/js/app.js` is progressive enhancement only. Every page reads without JavaScript,
and both request forms degrade rather than fail: if `/api/requests` is unreachable the
operator still gets a reference number, a copyable summary and a prefilled mail fallback,
because a leg that cannot finish its session is not the moment to discover the portal ate
the request.

### Intake API

`POST /api/requests` (`functions/api/requests.js`) takes both routes through one envelope
and validates the serial that route is filed against. Two optional bindings:

| Binding | Type | Purpose |
|---|---|---|
| `REQUESTS` | KV namespace | durable store for submitted requests |
| `INTAKE_WEBHOOK` | secret | URL forwarded to for ticketing and paging |

Both are optional and the endpoint degrades instead of failing — an unbound deployment still
accepts, validates and acknowledges requests, reporting `received-unstored`. Bind them
before this carries real traffic.

---

## Firmware

`data/firmware.json` is the seed of the OTA channel described in `firmware/index.html`.
The distribution path is a real constraint, not a detail: **a leg has no internet path of its
own.** Bundles reach a session controller over its uplink, stage there, and fan out to leg
ClearCores over XBee at the next dock — never mid-session.

Serving actual binaries is not built yet. When it is, the manifest shape is already in place:
add a `url` per release and an endpoint that answers a controller's `{target, version,
channel}` poll from this file.

---

## Conventions

- **Serial formats** are declared once, in `data/hardware.json`, and drive both client-side
  validation and the API's server-side check. Change them in one place.
- **Fault codes** are `SUB-nn`. Adding one means adding an entry to `data/faults.json` with a
  `route` and a `doc` anchor that exists — nothing else.
- **Diagrams** are inline SVG using theme classes (`d-stroke`, `d-accent`, `d-label`…) so
  they stay legible in both themes and in print. No raster images.
- **Colour carries meaning**: red is the dispatch/critical route, amber is the flag route,
  green is a healthy or completed state.
