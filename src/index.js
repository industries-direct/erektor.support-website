/**
 * EREKTOR Support — Worker entry.
 *
 * The portal is a static site plus one endpoint. Routing is handled by the
 * Workers static-asset layer, not here:
 *
 *   /api/*   `run_worker_first` in wrangler.jsonc sends these to this script
 *            before the asset lookup, so the intake endpoint is reachable
 *            even though `not_found_handling` would otherwise answer with
 *            404.html.
 *   anything the asset layer serves the file, applying _headers and
 *   else      _redirects, and falls back to 404.html. This script is not
 *            invoked at all on that path.
 *
 * Note that _headers does NOT apply to responses generated here, so the
 * security headers this site sets on its pages are repeated on API responses
 * rather than inherited.
 */

import { handleServiceRequest } from './requests.js';

/** Mirrors the non-CSP entries of _headers, which only cover asset responses. */
const API_HEADERS = {
  'content-type': 'application/json; charset=utf-8',
  'cache-control': 'no-store',
  'x-content-type-options': 'nosniff',
  'referrer-policy': 'strict-origin-when-cross-origin'
};

// Headers are set at construction, not via harden(): the Response constructor
// presets content-type to text/plain for a string body, and harden() defers to
// headers that are already there.
const json = (body, status, extra) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...API_HEADERS, ...extra }
  });

/**
 * Apply the header set to a response the handler built itself, rather than
 * making every call site remember it. Existing headers win — the handler owns
 * its own status and content type.
 */
function harden(response) {
  const out = new Response(response.body, response);
  for (const [k, v] of Object.entries(API_HEADERS)) {
    if (!out.headers.has(k)) out.headers.set(k, v);
  }
  return out;
}

export default {
  async fetch(request, env) {
    const { pathname } = new URL(request.url);

    if (pathname === '/api/requests') {
      if (request.method !== 'POST') {
        return json(
          { error: 'Use POST to submit a service request.' },
          405,
          { allow: 'POST' }
        );
      }
      try {
        return harden(await handleServiceRequest(request, env));
      } catch (err) {
        // An operator filing this is usually standing next to a leg that has
        // stopped. Fail loudly enough for the client to fall back to its
        // copy-and-email path rather than hanging.
        console.error('intake failed', err);
        return json({ error: 'Intake is unavailable. Use the emailed summary.' }, 503);
      }
    }

    if (pathname.startsWith('/api/')) {
      return json({ error: 'No such endpoint.' }, 404);
    }

    // Not normally reached: the asset layer answers everything else first.
    return env.ASSETS.fetch(request);
  }
};
