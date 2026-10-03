#!/usr/bin/env python3
"""
Assemble the static support portal.

This runs on a workstation and commits its output. It is deliberately NOT a
deploy-time build: Workers static assets serve the generated HTML directly and
the deploy runs no build step, which is what the previous Jekyll generation got
wrong.

    python3 tools/build.py

Product facts live in data/*.json and are read by the pages at runtime, not
baked in here. This file only owns layout.
"""

import os
import re

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# Signed out, the header offers only what is public and a way to sign in.
# Signed in, it names the account and lays out everything the sign-in opens
# in a second row, the way erektor-return.systems does. Anything behind the
# sign-in carries data-members and ships hidden; assets/js/app.js reveals it
# once /api/account/session says who is there. The Worker is still the gate:
# this only decides what is shown.
PUBLIC_NAV = [
    ("docs/faults.html", "Fault codes", ""),
]

MEMBER_NAV = [
    ("account/index.html", "Overview", ""),
    ("account/emergency.html", "Emergency replacement", "nav--urgent"),
    ("account/maintenance.html", "Schedule maintenance", ""),
    ("docs/", "Documentation", ""),
    ("docs/faults.html", "Fault codes", ""),
    ("firmware/index.html", "Firmware", ""),
]

MEMBERS = ' data-members hidden'

# (href, label, needs sign-in)
FOOT_COLS = [
    ("Service", [
        ("account/emergency.html", "Request a replacement leg", True),
        ("account/maintenance.html", "Schedule maintenance", True),
        ("docs/faults.html", "Fault code index", False),
    ]),
    ("Documentation", [
        ("docs/leg.html", "Leg anatomy and diagrams", True),
        ("docs/operating.html", "Operating procedures", True),
        ("docs/ers.html", "The return line", True),
        ("docs/safety.html", "Safety", True),
    ]),
    ("Fleet", [
        ("firmware/index.html", "Controller firmware", True),
        ("docs/leg.html#identity", "Serials and identity", True),
    ]),
]


def rel(depth):
    # Depth "/" means root-absolute. 404.html is served in place of any missing
    # path, at any depth, so "../" hops would resolve differently per request.
    if depth == "/":
        return "/"
    return "../" * depth


def shell(depth, title, description, body, page=None, head_extra="", foot_extra=""):
    """Wrap page body in the shared chrome.

    `foot_extra` is a second script slot after the footer, for scripts that
    must run *after* assets/js/app.js rather than alongside it. Deferred
    scripts execute in document order, so a page-specific script that builds
    on ERS (the registry console does) cannot be placed in `head_extra` — it
    would run first and find nothing there.
    """
    b = rel(depth)
    # Only the root-absolute page (404) carries this: it is the one document
    # whose URL is not the one it was authored at, so the constraint has to be
    # stated where someone would otherwise "tidy" the links back to relative.
    root_note = (
        "\n<!-- Root-relative throughout: this page is served in place of any missing\n"
        "     path, at any depth, so relative URLs would break. -->"
        if depth == "/" else ""
    )
    def links(entries, indent):
        return "\n".join(
            '{pad}<a href="{b}{href}"{cur} class="{cls}">{label}</a>'.format(
                pad=" " * indent, b=b, href=href, cls=cls, label=label,
                cur=' aria-current="page"' if page == href else "",
            )
            for href, label, cls in entries
        )
    nav = links(PUBLIC_NAV, 8)
    subnav = links(MEMBER_NAV, 6)
    signin_cur = ' aria-current="page"' if page == "account/signin.html" else ""
    foot = "\n".join(
        '        <div{m}>\n          <h4>{h}</h4>\n          <ul>{items}</ul>\n        </div>'.format(
            m=MEMBERS if all(gated for _, _, gated in items) else "",
            h=head,
            items="".join(
                '<li{m}><a href="{b}{href}">{label}</a></li>'.format(
                    m=MEMBERS if gated else "", b=b, href=href, label=label)
                for href, label, gated in items
            ),
        )
        for head, items in FOOT_COLS
    )
    return f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>ESC | {title}</title>
<meta name="description" content="{description}">{head_extra}
<meta name="color-scheme" content="dark light">
<meta name="theme-color" content="#1b1b1b" media="(prefers-color-scheme: dark)">
<meta name="theme-color" content="#f8f8f8" media="(prefers-color-scheme: light)">
<link rel="icon" type="image/svg+xml" href="/favicon.svg">
<link rel="icon" type="image/png" sizes="32x32" href="/favicon-32.png">
<link rel="icon" href="/favicon.ico" sizes="any">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">{root_note}
<link rel="stylesheet" href="{b}assets/css/site.css">
<script src="{b}assets/js/app.js" defer></script>
</head>
<body>
<a class="skip" href="#main">Skip to content</a>

<header class="topbar">
  <div class="wrap topbar-in">
    <a class="brand" href="{b}index.html">
      <b>EREKTOR</b><span class="tag">Support</span>
    </a>
    <nav class="nav" aria-label="Main" data-public>
{nav}
        <a href="/account/signin.html" class="btn btn--sm btn--primary" data-signin{signin_cur}>Sign in</a>
    </nav>
    <div class="acct"{MEMBERS}>
      <span class="acct__who"><strong data-acct-company>Your account</strong><span data-acct-email></span></span>
      <button type="button" class="btn btn--sm" data-acct-signout>Sign out</button>
    </div>
    <button class="themebtn" type="button" aria-label="Toggle colour theme" aria-pressed="false" title="Toggle theme">
        <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true" focusable="false">
          <circle cx="8" cy="8" r="6.5" fill="none" stroke="currentColor" stroke-width="1.5"/>
          <path d="M8 1.5a6.5 6.5 0 0 0 0 13z" fill="currentColor"/>
        </svg>
    </button>
  </div>
  <nav class="subnav" aria-label="Your account"{MEMBERS}>
    <div class="wrap subnav-in">
{subnav}
    </div>
  </nav>
</header>

<main id="main">
{body}
</main>

<footer class="foot">
  <div class="wrap">
    <div class="foot-cols">
{foot}
        <div>
          <h4>Contact</h4>
          <ul>
            <li><a href="mailto:support@erektor.systems">support@erektor.systems</a></li>
            <li><a href="https://erektor.systems">erektor.systems</a></li>
          </ul>
          <p class="small muted mt-0">Emergency dispatch is staffed 24/7. Everything else answers on the next working day.</p>
        </div>
    </div>
    <div class="foot-base">
      <div>EREKTOR &middot; Erektor Return System</div>
      <div class="compliance">
        <span>ISO/TS 15066</span>
        <span>ANSI/RIA R15.08</span>
        <span>FMCSA &sect;393.100&ndash;136</span>
      </div>
      <div>&copy; <span id="year">2026</span> EREKTOR</div>
    </div>
  </div>
</footer>{foot_extra}
</body>
</html>
"""


def crumbs(depth, trail):
    b = rel(depth)
    parts = ['<a href="%sindex.html">Support</a>' % b]
    for label, href in trail[:-1]:
        parts.append('<a href="%s%s">%s</a>' % (b, href, label))
    parts.append("<span aria-hidden=\"true\">/</span>".join([]) or trail[-1][0])
    return '<p class="crumbs">' + '<span>/</span>'.join(parts) + "</p>"


PAGES = {}


def page(path, depth, title, description, body, head_extra="", foot_extra=""):
    PAGES[path] = (depth, title, description, body, head_extra, foot_extra)


def write():
    for path, (depth, title, description, body, head_extra, foot_extra) in PAGES.items():
        full = os.path.join(ROOT, path)
        os.makedirs(os.path.dirname(full), exist_ok=True)
        # docs/index.html is reached through the "docs/" nav entry
        nav_key = "docs/" if path == "docs/index.html" else path
        html = shell(depth, title, description, body, page=nav_key,
                     head_extra=head_extra, foot_extra=foot_extra)
        with open(full, "w", encoding="utf-8") as fh:
            fh.write(html)
        print("wrote", path)
