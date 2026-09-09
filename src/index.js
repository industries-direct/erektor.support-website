/**
 * EREKTOR Support — Worker entry.
 *
 * The portal is a static site plus two endpoints and one gated section.
 * Routing is handled by the Workers static-asset layer, not here:
 *
 *   /api/*      `run_worker_first` in wrangler.jsonc sends these to this
 *               script before the asset lookup, so the intake and registry
 *               endpoints are reachable even though `not_found_handling`
 *               would otherwise answer with 404.html.
 *   /internal/* also listed in `run_worker_first`, and for a sharper reason:
 *               without it the asset layer would serve the registry pages
 *               straight off the CDN and the gate below would never run. That
 *               one line is what makes this section non-public.
 *   anything    the asset layer serves the file, applying _headers and
 *   else        _redirects, and falls back to 404.html. This script is not
 *               invoked at all on that path.
 *
 * Note that _headers does NOT apply to responses generated here, so the
 * security headers this site sets on its pages are repeated on API responses
 * rather than inherited.
 */

import { handleServiceRequest } from './requests.js';
import { handleRegistry } from './registry.js';
import { gateConfig, sessionFor, signIn, signOut } from './auth.js';

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

/** The sign-in page is the one page in /internal/ served without a session. */
const OPEN_INTERNAL = /^\/internal\/signin(\.html)?$/;

/**
 * Serve a page from the gated section.
 *
 * Everything about this path fails closed. No secrets bound: 503, not the
 * page. No session: a redirect to sign-in, not the page. This is the opposite
 * posture to the public intake, which degrades open so an operator standing
 * next to a stopped leg still gets a reference number — here the failure mode
 * to avoid is publishing the fleet, not losing a request.
 */
async function serveInternal(request, env) {
  const url = new URL(request.url);

  if (!gateConfig(env)) {
    return new Response(
      'The leg registry is not provisioned on this deployment.\n\n' +
      'It needs the REGISTRY_SECRET and REGISTRY_ACCESS secrets and the REGISTRY D1 binding.\n' +
      'See the registry section of README.md.\n',
      { status: 503, headers: { 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'no-store' } }
    );
  }

  if (!OPEN_INTERNAL.test(url.pathname) && !(await sessionFor(request, env))) {
    const back = url.pathname + url.search;
    return new Response(null, {
      status: 302,
      headers: {
        location: '/internal/signin.html?next=' + encodeURIComponent(back),
        'cache-control': 'no-store'
      }
    });
  }

  const asset = await env.ASSETS.fetch(request);
  const out = new Response(asset.body, asset);
  // A gated page must never be cached by an intermediary or indexed, whatever
  // _headers says about the asset it came from.
  out.headers.set('cache-control', 'private, no-store');
  out.headers.set('x-robots-tag', 'noindex, nofollow');
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

    if (pathname === '/api/registry/session') {
      try {
        if (request.method === 'POST') return harden(await signIn(request, env));
        if (request.method === 'DELETE') return harden(signOut());
        return json({ error: 'Use POST to sign in, DELETE to sign out.' }, 405, { allow: 'POST, DELETE' });
      } catch (err) {
        console.error('registry sign-in failed', err);
        return json({ error: 'Sign-in is unavailable.' }, 503);
      }
    }

    if (pathname.startsWith('/api/registry')) {
      try {
        return harden(await handleRegistry(request, env));
      } catch (err) {
        console.error('registry failed', err);
        return json({ error: 'The registry is unavailable.' }, 503);
      }
    }

    if (pathname.startsWith('/api/')) {
      return json({ error: 'No such endpoint.' }, 404);
    }

    if (pathname === '/internal' || pathname.startsWith('/internal/')) {
      return serveInternal(request, env);
    }

    // Not normally reached: the asset layer answers everything else first.
    return env.ASSETS.fetch(request);
  }
};
