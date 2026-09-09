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

NAV = [
    ("dispatch.html", "Dispatch", "nav--urgent"),
    ("maintenance.html", "Maintenance", ""),
    ("docs/", "Documentation", ""),
    ("docs/faults.html", "Fault codes", ""),
    ("firmware/index.html", "Firmware", ""),
]

FOOT_COLS = [
    ("Service", [
        ("dispatch.html", "Request a replacement leg"),
        ("maintenance.html", "Flag a leg for ERS"),
        ("docs/faults.html", "Fault code index"),
    ]),
    ("Documentation", [
        ("docs/leg.html", "Leg anatomy and diagrams"),
        ("docs/operating.html", "Operating procedures"),
        ("docs/ers.html", "The return line"),
        ("docs/safety.html", "Safety"),
    ]),
    ("Fleet", [
        ("firmware/index.html", "Controller firmware"),
        ("docs/leg.html#identity", "Serials and identity"),
    ]),
]


def rel(depth):
    # Depth "/" means root-absolute. 404.html is served in place of any missing
    # path, at any depth, so "../" hops would resolve differently per request.
    if depth == "/":
        return "/"
    return "../" * depth


def shell(depth, title, description, body, page=None, head_extra=""):
    b = rel(depth)
    # Only the root-absolute page (404) carries this: it is the one document
    # whose URL is not the one it was authored at, so the constraint has to be
    # stated where someone would otherwise "tidy" the links back to relative.
    # The .ico is the only icon not written relative to the page: a browser
    # requests /favicon.ico by itself, at that exact path, whatever depth the
    # page it is looking at lives at. The SVG and the touch icon follow the
    # page like every other asset here.
    root_note = (
        "\n<!-- Root-relative throughout: this page is served in place of any missing\n"
        "     path, at any depth, so relative URLs would break. -->"
        if depth == "/" else ""
    )
    nav = "\n".join(
        '        <a href="{b}{href}"{cur} class="{cls}">{label}</a>'.format(
            b=b,
            href=href,
            cls=cls,
            cur=' aria-current="page"' if page == href else "",
            label=label,
        )
        for href, label, cls in NAV
    )
    foot = "\n".join(
        '        <div>\n          <h4>{h}</h4>\n          <ul>{items}</ul>\n        </div>'.format(
            h=head,
            items="".join(
                '<li><a href="{b}{href}">{label}</a></li>'.format(b=b, href=href, label=label)
                for href, label in items
            ),
        )
        for head, items in FOOT_COLS
    )
    return f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>{title} — EREKTOR Support</title>
<meta name="description" content="{description}">{head_extra}
<meta name="color-scheme" content="dark light">
<meta name="theme-color" content="#1b1b1b" media="(prefers-color-scheme: dark)">
<meta name="theme-color" content="#f8f8f8" media="(prefers-color-scheme: light)">{root_note}
<link rel="icon" href="{b}assets/icons/favicon.svg" type="image/svg+xml">
<link rel="apple-touch-icon" href="{b}assets/icons/apple-touch-icon.png">
<link rel="icon" href="/favicon.ico" sizes="48x48">
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
    <nav class="nav" aria-label="Main">
{nav}
      <button class="themebtn" type="button" aria-label="Toggle colour theme" aria-pressed="false" title="Toggle theme">
        <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true" focusable="false">
          <circle cx="8" cy="8" r="6.5" fill="none" stroke="currentColor" stroke-width="1.5"/>
          <path d="M8 1.5a6.5 6.5 0 0 0 0 13z" fill="currentColor"/>
        </svg>
      </button>
    </nav>
  </div>
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
</footer>
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


def page(path, depth, title, description, body, head_extra=""):
    PAGES[path] = (depth, title, description, body, head_extra)


def write():
    for path, (depth, title, description, body, head_extra) in PAGES.items():
        full = os.path.join(ROOT, path)
        os.makedirs(os.path.dirname(full), exist_ok=True)
        # docs/index.html is reached through the "docs/" nav entry
        nav_key = "docs/" if path == "docs/index.html" else path
        html = shell(depth, title, description, body, page=nav_key, head_extra=head_extra)
        with open(full, "w", encoding="utf-8") as fh:
            fh.write(html)
        print("wrote", path)
