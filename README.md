# EREKTOR Support Portal

The operator-facing edge of the **Erektor Return System**. Field crews use it to get a leg
serviced, get a replacement leg to a site, read the procedures and diagrams, and see what
firmware their controllers should be running.

Production: **https://erektor.support** — a Cloudflare Worker with static assets,
deployed from `main` by GitHub Actions.

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
index.html              Service console: status bar, fault-code router, the three routes
                        with live counts, and panels over data/*.json
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

internal/               The leg registry — gated, not linked from anywhere public
  signin.html           The one page in the section served without a session
  index.html            Fleet console: state, flags, intervals, reconciliation
  leg.html              One leg: both identities, event history, actions
  intake.html           Enter legs as they come off the line, singly or a work order

data/
  hardware.json         Leg variants, controllers, serial formats
  faults.json           Fault code → service route table
  firmware.json         Release manifest (the OTA seed)
  lifecycle.json        Leg states, transitions, event types, service intervals

assets/css/site.css     Design system (EREKTOR brand tokens, field-tuned)
assets/js/app.js        Progressive enhancement only
assets/js/registry.js   The registry console — loaded only by /internal/*
404.html                Served for any missing path (root-absolute links)
src/index.js            Worker entry — routes /api/*, gates /internal/*
src/requests.js         Intake endpoint
src/registry.js         Registry API over D1
src/auth.js             The gate on /internal/* and /api/registry/*
src/serials.js          Serial formats, shared by both endpoints
migrations/             D1 schema for the registry
tools/                  Page assembler and the registry test suite (see below)
_headers _redirects     Edge config
robots.txt              Keeps well-behaved crawlers out of /internal/
wrangler.jsonc          Deploy config
.assetsignore           Keeps src/, tools/, migrations/ and repo metadata off the CDN
```

**Product facts live in `data/*.json`, never in markup.** The pages fetch and render them at
runtime, so updating the catalog, the fault table or the firmware manifest is a data edit —
no page needs touching.

---

## Building

There is **no deploy-time build**. Wrangler uploads the committed HTML as-is. This is
deliberate: the previous generation of this site used Jekyll, and the Ruby toolchain is what
broke the deploys.

The fifteen pages share a header and footer via a local assembler that you run yourself and
commit the output of:

```sh
python3 tools/pages.py     # rewrites the .html files in place
```

Edit page content in `tools/pages.py`, `tools/docs.py` and `tools/internal.py`, diagrams in
`tools/diagrams.py`, then re-run and commit. Editing the generated `.html` directly works too, but the next run
of the assembler will overwrite it.

## Deploying

Deploys come from **GitHub Actions** — `.github/workflows/deploy.yml` runs `wrangler deploy`
on every push to `main`, and can be run by hand from the Actions tab. It needs two repository
secrets, the same pair the sibling `industries.direct` site uses:

| Secret | Purpose |
|---|---|
| `CLOUDFLARE_API_TOKEN` | Authenticates the deploy. |
| `CLOUDFLARE_ACCOUNT_ID` | The account the Worker lives in. |

Scope the token with Cloudflare's **Edit Cloudflare Workers** template, granting it both this
account *and* the `erektor.support` zone. Account → Workers Scripts: Edit alone is not
enough: the `custom_domain` route in `wrangler.jsonc` also needs Zone → Workers Routes: Edit,
and a token missing it fails *after* the script has already uploaded — the Worker updates,
the route does not, and the deploy reports an error for a site that looks half-deployed.

**Cloudflare's Git integration (Workers Builds) must be disconnected**, or this races it.
Two pipelines both running `wrangler deploy` on the same push contend for the same Worker and
the same custom domain, and neither knows the other exists. Disconnect it under Workers &
Pages → the service → Settings → Builds → Git repository.

Why the move: the integration is keyed to a specific repo, not a name. When this repo went
from `mellonbot/support.erektor-return.systems-website` to
`industries-direct/erektor.support-website`, GitHub's redirect kept the old URL browsable and
Cloudflare kept building off the forwarded webhook — until it silently stopped, and every
push after PR #12 landed on `main` without a build. There is no dashboard warning for that:
the Worker just stops updating while `git log` keeps moving. A workflow committed *in* the
repo cannot detach that way; it moves with the repo.

What is lost with it: the `Workers Builds: support-erektor-return-systems-website` check, and
with it **preview builds on pull requests**. This workflow deploys `main` only, so a PR no
longer gets a preview URL. Adding one back means a second job running
`wrangler versions upload` on `pull_request`.

Consequences worth knowing:

- `name` in `wrangler.jsonc` must stay equal to the live Worker service. Change it and a
  deploy creates a *second* service, binding `erektor.support` to that one and leaving this
  one orphaned. The workflow asserts the name before wrangler runs, so this now fails the
  build instead of silently splitting the site in two.
- The `erektor.support` zone must exist in the account — `custom_domain` routes bind an
  existing zone, they do not register a domain.
- `.assetsignore` excludes `.github/`, so the workflow is not uploaded as a static asset.
- `.assetsignore` must also exclude `package.json` and `package-lock.json`. `wrangler-action`
  runs `npm i wrangler@4` *inside the checkout*, and `assets.directory` is the repo root, so
  those two files appear next to the site and get published unless ignored. They are not in
  the repo — they exist only on the runner — which is why nothing in `git status` hints at
  it. The first Actions deploy uploaded both to the CDN before this was added; the asset
  count in the deploy log is the tell (20 real files, 22 uploaded).

### How routing works

Requests hit the static-asset layer first, which applies `_headers` and `_redirects` and
falls back to `404.html`. Two prefixes are listed in `run_worker_first` and reach
`src/index.js` instead:

- `/api/*` — without it, `not_found_handling: "404-page"` would answer the intake endpoint
  with the 404 page.
- `/internal/*` — for a sharper reason. Those pages *are* static assets, so without this line
  the asset layer would serve the leg registry straight off the CDN to anyone who guessed the
  path, and the gate in `src/auth.js` would never run. **Removing that entry publishes the
  fleet, silently, with no error anywhere.**

`_headers` only decorates *asset* responses. Responses generated in the Worker set their own
headers, which is why `src/index.js` repeats them.

---

## Runtime

`assets/js/app.js` is progressive enhancement only. Every page reads without JavaScript,
and both request forms degrade rather than fail: if `/api/requests` is unreachable the
operator still gets a reference number, a copyable summary and a prefilled mail fallback,
because a leg that cannot finish its session is not the moment to discover the portal ate
the request.

### Intake API

`POST /api/requests` (`src/requests.js`) takes both routes through one envelope
and validates the serial that route is filed against. Two optional bindings:

| Binding | Type | Purpose |
|---|---|---|
| `REQUESTS` | KV namespace | durable store for submitted requests |
| `INTAKE_WEBHOOK` | secret | URL forwarded to for ticketing and paging |
| `REGISTRY` | D1 database | the leg registry, so a request lands on the leg's own record |

All three are optional and the endpoint degrades instead of failing — an unbound deployment still
accepts, validates and acknowledges requests, reporting `received-unstored`. **Neither is
bound yet**, so today a submitted request reaches nobody: the operator gets a reference
number and a copyable summary, and that is all. Bind them before this carries real traffic:

```sh
wrangler kv namespace create REQUESTS   # then add the id to wrangler.jsonc
wrangler secret put INTAKE_WEBHOOK
```

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

## The leg registry

`/internal/` is the fleet record: every frame EREKTOR has built, what is bound to it, where it
is, and what it is carrying. It is the registry `docs/ers.html#registry` already describes —
"an always-online registry of every leg across every facility", whose main job is preventing a
false loss. It is not linked from anywhere public and is gated in the Worker.

### Why it is shaped this way

The same three facts that shape the public portal decide the schema:

1. **The durable entity is the leg.** There is no persistent Erektor above it, so there is no
   machine record to hang a leg off — the leg *is* the record.
2. **A leg has two identities.** The registry is keyed on the **mechanical** serial, which is
   stamped into the frame and permanent. The electronics serial lives in a nullable,
   uniquely-indexed column: a *current binding*, rewritten by a swap. Keying on the
   electronics serial instead would silently reset a leg's wear, interval and history every
   time a ClearCore was changed — which is the one mistake this schema exists to prevent, and
   the one the test suite checks first.
3. **Every leg comes home.** So an open flag is a column on the leg rather than a ticket
   somewhere else, because inspection reads flags off the frame as the leg passes.

`data/lifecycle.json` is to the registry what `data/faults.json` is to the portal: the states,
the transitions between them, the event types, and the service intervals. The console builds
its filters and its event picker from it, and `src/registry.js` fetches it from the asset layer
rather than duplicating it, so a state added there appears in the UI and is enforced by the API
without either being edited.

### Events, not edits

`leg_events` is append-only and is never rewritten — a correction is another event. The `legs`
table is a *projection* of that log, and every write appends the event and updates the
projection in one D1 batch, so the two cannot disagree and the projection can be rebuilt from
the log. State moves only by recording an event; the console's field editor deliberately cannot
touch it.

Two consequences worth stating:

- **Only a closed service record resets the interval.** Not a controller swap. That is the
  whole point of accruing wear against the frame, and `SES-30` clears the same way.
- **A field request lands on the leg.** `POST /api/requests` reconciles into the registry: a
  flag sets the leg's open flag, a dispatch appends to its history. A request naming a serial
  the registry does not hold goes to `orphan_intake` and shows on the console as unmatched —
  dropping it would be exactly the failure the public intake is written to avoid.

### The gate

The public portal degrades **open**: if intake is unreachable the operator still walks away
with a reference number, because a leg that has stopped is not the moment to lose a request.
The registry degrades **closed**. Unbound secrets serve nothing; no session redirects to
sign-in; the failure mode being avoided is publishing the fleet, not losing a keystroke.

Enforcement is one place — `src/auth.js` — reached because `/internal/*` is in
`run_worker_first`. Sessions are HMAC-signed cookies (`HttpOnly`, `Secure`, `SameSite=Strict`),
one shift long. Roles come from `lifecycle.json`: `viewer` reads, `operator` writes, `admin`
additionally retires and deletes. Sign-in attempts are throttled per IP.

**Put Cloudflare Access in front of this.** Zero Trust gives SSO, per-person revocation and an
edge audit trail that an access code cannot. The Worker gate is what makes the section
non-public from day one with nothing to configure in a dashboard; it is a floor, not a ceiling.

### Provisioning

Nothing here is bound yet, and until it is, `/internal/` answers 503 and `/api/registry/*`
answers 503. The public portal is unaffected either way.

```sh
wrangler d1 create erektor-registry                          # then uncomment the
                                                             # d1_databases block in
                                                             # wrangler.jsonc with the id
wrangler d1 migrations apply erektor-registry --remote

wrangler secret put REGISTRY_SECRET   # any long random string; signs session cookies
wrangler secret put REGISTRY_ACCESS   # [{"code":"…","id":"em","name":"E Mellon","role":"admin"}]
```

`REGISTRY_ACCESS` is a JSON array of operators. Rotating an access code means editing that
secret; there is no user table, deliberately — the audit trail that matters is `leg_events`,
which records who did what to which leg.

### Tests

```sh
node --experimental-sqlite tools/test/registry.mjs
```

Runs the real Worker against a real SQLite database via a small D1 shim, so the SQL is
genuinely exercised: the unique partial index on the electronics serial, the interval
arithmetic, the batch that keeps the projection in step with the log. It checks the rules the
design rests on rather than that the endpoints answer — the gate, the identity split, what does
and does not reset an interval, the transition table, and that an unmatched field request is
held rather than dropped.

---

## Conventions

- **Serial formats** are declared once, in `data/hardware.json`, and drive both client-side
  validation and the API's server-side check. Change them in one place.
- **Fault codes** are `SUB-nn`. Adding one means adding an entry to `data/faults.json` with a
  `route` and a `doc` anchor that exists — nothing else.
- **Leg states** are declared once, in `data/lifecycle.json`, and drive the console's filters,
  its event picker and the API's transition check. Adding a state means adding an entry with a
  `to` list — nothing else.
- **Diagrams** are inline SVG using theme classes (`d-stroke`, `d-accent`, `d-label`…) so
  they stay legible in both themes and in print. No raster images.
- **Colour carries meaning**: red is the dispatch/critical route, amber is the flag route,
  green is a healthy or completed state.
