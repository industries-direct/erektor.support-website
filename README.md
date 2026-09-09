# EREKTOR Support Portal

The operator-facing edge of the **Erektor Return System**. Field crews use it to get a leg
serviced, get a replacement leg to a site, read the procedures and diagrams, and see what
firmware their controllers should be running.

Production: **https://erektor.support** — a Cloudflare Worker with static assets,
deployed from `main` by Cloudflare's Git integration.

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

data/
  hardware.json         Leg variants, controllers, serial formats
  faults.json           Fault code → service route table
  firmware.json         Release manifest (the OTA seed)

assets/css/site.css     Design system (EREKTOR brand tokens, field-tuned)
assets/js/app.js        Progressive enhancement only
404.html                Served for any missing path (root-absolute links)
src/index.js            Worker entry — routes /api/*, assets handle the rest
src/requests.js         Intake endpoint
tools/                  Page assembler (see below)
_headers _redirects     Edge config
wrangler.jsonc          Deploy config
.assetsignore           Keeps src/, tools/ and repo metadata off the CDN
```

**Product facts live in `data/*.json`, never in markup.** The pages fetch and render them at
runtime, so updating the catalog, the fault table or the firmware manifest is a data edit —
no page needs touching.

---

## Building

There is **no deploy-time build**. Wrangler uploads the committed HTML as-is. This is
deliberate: the previous generation of this site used Jekyll, and the Ruby toolchain is what
broke the deploys.

The eleven pages share a header and footer via a local assembler that you run yourself and
commit the output of:

```sh
python3 tools/pages.py     # rewrites the .html files in place
```

Edit page content in `tools/pages.py` and `tools/docs.py`, diagrams in `tools/diagrams.py`,
then re-run and commit. Editing the generated `.html` directly works too, but the next run
of the assembler will overwrite it.

## Deploying

Deploys come from **Cloudflare's Git integration** (Workers Builds), which is already
connected to this repo and reports back as the `Workers Builds:
support-erektor-return-systems-website` check. Pushing to `main` deploys; other branches get
preview builds, which is why a PR shows that check too.

There is deliberately **no GitHub Actions deploy workflow** here, unlike the sibling
`industries.direct` site. Two pipelines both running `wrangler deploy` on the same push would
race for the same Worker and the same custom domain. Because the integration exists and the
Actions workflow would have to be given its own credentials, the integration wins.

Consequences worth knowing:

- `name` in `wrangler.jsonc` must stay equal to the connected Worker service. Change it and a
  production build deploys a *second* service, binding `erektor.support` to that one and
  leaving this one orphaned.
- No `CLOUDFLARE_API_TOKEN` / `CLOUDFLARE_ACCOUNT_ID` repository secrets are needed. The
  integration carries its own credentials.
- The `erektor.support` zone must exist in the account — `custom_domain` routes bind an
  existing zone, they do not register a domain.
- The integration is keyed to a specific repo, not a name. When this repo moved from
  `mellonbot/support.erektor-return.systems-website` to `industries-direct/erektor.support-website`,
  GitHub's own redirect kept the old URL browsable, and Cloudflare kept building for a while
  off the same forwarded webhook — but that stopped silently at some point, and every push
  after PR #12 landed on `main` without a build. There is no dashboard warning for this: the
  Worker just quietly stops updating while `git log` keeps moving. If a push to `main` isn't
  showing up under Deployments within a minute or two, check Settings → Builds → Git
  repository points at the *current* owner/name before debugging anything else.

### How routing works

Requests hit the static-asset layer first, which applies `_headers` and `_redirects` and
falls back to `404.html`. The one exception is `/api/*`, listed in `run_worker_first`, which
reaches `src/index.js` instead — without that, `not_found_handling: "404-page"` would answer
the intake endpoint with the 404 page.

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

Both are optional and the endpoint degrades instead of failing rather than refusing the
request: with neither bound it still accepts, validates and acknowledges, and the operator
gets a reference number and a copyable summary that reaches nobody on its own.

**Do not trust this file for whether a given deployment is bound** — ask the endpoint. It
reports its own state in every response: `status` comes back as `received-unstored` when the
KV store did not take the record, and `received` when it did.

The two bindings are not bound the same way:

- `INTAKE_WEBHOOK` is a secret, so it needs no change here. `wrangler secret put` is the whole
  of it and the forward starts on the next request.
- `REQUESTS` is a KV namespace, and creating one does nothing until its id is in
  `wrangler.jsonc`. **There is no `kv_namespaces` block in that file**, so `env.REQUESTS` is
  undefined in every deployment built from this repo, whatever exists in the account. That
  sentence stops being true the moment someone adds the block — which is the point of stating
  it about the repo rather than about today.

```sh
wrangler secret put INTAKE_WEBHOOK
wrangler kv namespace create REQUESTS   # then add the id to wrangler.jsonc, per above
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

## Conventions

- **Serial formats** are declared once, in `data/hardware.json`, and drive both client-side
  validation and the API's server-side check. Change them in one place.
- **Fault codes** are `SUB-nn`. Adding one means adding an entry to `data/faults.json` with a
  `route` and a `doc` anchor that exists — nothing else.
- **Diagrams** are inline SVG using theme classes (`d-stroke`, `d-accent`, `d-label`…) so
  they stay legible in both themes and in print. No raster images.
- **Colour carries meaning**: red is the dispatch/critical route, amber is the flag route,
  green is a healthy or completed state.
