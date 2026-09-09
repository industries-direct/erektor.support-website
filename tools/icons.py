#!/usr/bin/env python3
"""
Rasterise the favicon from assets/icons/favicon.svg. Run: python3 tools/icons.py

Like the page assembler, this runs on a workstation and its output is
committed — there is no deploy-time build. It exists so the raster icons are
never orphans: edit the SVG, re-run this, commit what it writes.

    assets/icons/favicon.svg            the source, and the only file to edit
    favicon.ico                         16/32/48, at the root because that is
                                        where a browser looks unprompted
    assets/icons/apple-touch-icon.png   180x180 for an iOS home screen

It renders the mark itself rather than driving a browser. That is not
purity: a headless screenshot of a 16x16 icon depends on the window chrome,
the device scale factor and the renderer's idea of a replaced element's
height, and it fails by writing a plausible-looking wrong file. This reads
the same geometry the browser reads and is deterministic on any machine with
Python. The SVG stays the only definition of the shape.

Only the subset of SVG the mark uses is understood — <rect> with optional
rx, <circle>, and <path> holding one straight line with a round cap. Add a
shape to the mark and this will tell you it does not know how to draw it,
which is the failure mode you want.

The SVG follows the tab bar's theme through a prefers-color-scheme rule. The
rasters cannot, so they are opaque brand tiles with the dark-theme ink baked
in — a transparent raster would disappear on half the tab bars it lands on.
"""

import os
import re
import struct
import sys
import zlib

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SVG = os.path.join(ROOT, "assets", "icons", "favicon.svg")

GROUND = (0x1b, 0x1b, 0x1b)   # brand ground; the tile the raster ink sits on
INK = (0xff, 0xff, 0xff)      # dark-theme ink, baked in
VIEWBOX = 32.0
SS = 4                        # supersampling factor, for the antialiasing

ICO_SIZES = (16, 32, 48)
APPLE_SIZE = 180


# --------------------------------------------------------------- reading the SVG
def attrs(tag):
    return dict(re.findall(r'([\w-]+)\s*=\s*"([^"]*)"', tag))


def shapes(svg):
    """Every drawable in document order, with the fill colour it resolves to.

    Colour resolution is deliberately crude because the mark is: a shape is
    ink unless it carries its own fill or stroke, which only the accent parts
    do. Anything else would mean implementing the cascade.
    """
    out = []
    for m in re.finditer(r"<(rect|circle|path|g)\b[^>]*>", svg):
        kind, a = m.group(1), attrs(m.group(0))
        # Either attribute can carry the colour, and the one that does is not
        # always the first: the accent stems are fill="none" stroke="#e02020",
        # so taking fill before stroke drops the accent and draws them in ink.
        accent = next((c for c in (a.get("fill"), a.get("stroke"))
                       if c and c.startswith("#")), None)
        if kind == "g":
            # A group only ever carries the accent colour or the stroke width
            # the paths inside it inherit.
            out.append(("g", a, accent))
        else:
            out.append((kind, a, accent))
    return out


def hex_rgb(s):
    s = s.lstrip("#")
    return tuple(int(s[i:i + 2], 16) for i in (0, 2, 4))


# ------------------------------------------------------------------- rasterising
class Canvas:
    def __init__(self, size):
        self.n = size * SS
        self.px = [[GROUND] * self.n for _ in range(self.n)]

    def blend(self, x, y, colour):
        if 0 <= x < self.n and 0 <= y < self.n:
            self.px[y][x] = colour

    def rect(self, x, y, w, h, rx, colour, scale):
        x, y, w, h, rx = (v * scale for v in (x, y, w, h, rx))
        for py in range(int(y), int(y + h) + 1):
            for px_ in range(int(x), int(x + w) + 1):
                cx, cy = px_ + .5, py + .5
                if not (x <= cx <= x + w and y <= cy <= y + h):
                    continue
                if rx:  # keep the corners inside the rounding radius
                    dx = max(x + rx - cx, cx - (x + w - rx), 0)
                    dy = max(y + rx - cy, cy - (y + h - rx), 0)
                    if dx and dy and (dx * dx + dy * dy) > rx * rx:
                        continue
                self.blend(px_, py, colour)

    def disc(self, cx, cy, r, colour, scale):
        cx, cy, r = cx * scale, cy * scale, r * scale
        for py in range(int(cy - r), int(cy + r) + 2):
            for px_ in range(int(cx - r), int(cx + r) + 2):
                if (px_ + .5 - cx) ** 2 + (py + .5 - cy) ** 2 <= r * r:
                    self.blend(px_, py, colour)

    def line(self, x1, y1, x2, y2, width, colour, scale):
        """Round-capped, which is what stroke-linecap="round" draws."""
        x1, y1, x2, y2, r = (v * scale for v in (x1, y1, x2, y2, width / 2))
        dx, dy = x2 - x1, y2 - y1
        length2 = dx * dx + dy * dy
        lo_x, hi_x = int(min(x1, x2) - r - 1), int(max(x1, x2) + r + 2)
        lo_y, hi_y = int(min(y1, y2) - r - 1), int(max(y1, y2) + r + 2)
        for py in range(lo_y, hi_y):
            for px_ in range(lo_x, hi_x):
                cx, cy = px_ + .5, py + .5
                t = 0.0 if not length2 else max(0.0, min(1.0, ((cx - x1) * dx + (cy - y1) * dy) / length2))
                ndx, ndy = cx - (x1 + t * dx), cy - (y1 + t * dy)
                if ndx * ndx + ndy * ndy <= r * r:
                    self.blend(px_, py, colour)

    def downsample(self, size):
        """Box filter the supersampled buffer down — this is the antialiasing."""
        rows = []
        for y in range(size):
            row = bytearray()
            for x in range(size):
                r = g = b = 0
                for sy in range(SS):
                    for sx in range(SS):
                        p = self.px[y * SS + sy][x * SS + sx]
                        r, g, b = r + p[0], g + p[1], b + p[2]
                n = SS * SS
                row += bytes((r // n, g // n, b // n, 255))
            rows.append(bytes(row))
        return rows


def draw(svg, size):
    canvas = Canvas(size)
    scale = size * SS / VIEWBOX
    group_accent = None
    group_width = None
    for kind, a, accent in shapes(svg):
        if kind == "g":
            group_accent = hex_rgb(accent) if accent else None
            group_width = float(a["stroke-width"]) if "stroke-width" in a else None
            continue
        colour = hex_rgb(accent) if accent else (group_accent or INK)
        if kind == "rect":
            canvas.rect(float(a["x"]), float(a["y"]), float(a["width"]), float(a["height"]),
                        float(a.get("rx", 0)), colour, scale)
        elif kind == "circle":
            canvas.disc(float(a["cx"]), float(a["cy"]), float(a["r"]), colour, scale)
        elif kind == "path":
            m = re.fullmatch(r"M\s*([\d.]+)\s+([\d.]+)\s*L\s*([\d.]+)\s+([\d.]+)\s*", a["d"])
            if not m:
                sys.exit(f"tools/icons.py only draws straight-line paths; got d=\"{a['d']}\"")
            width = float(a.get("stroke-width", group_width or 1))
            canvas.line(*(float(v) for v in m.groups()), width, colour, scale)
        else:
            sys.exit(f"tools/icons.py does not know how to draw <{kind}>")
    return canvas.downsample(size)


# ------------------------------------------------------------------- writing out
def png(rows, size):
    raw = b"".join(b"\x00" + r for r in rows)

    def chunk(tag, data):
        return (struct.pack(">I", len(data)) + tag + data
                + struct.pack(">I", zlib.crc32(tag + data) & 0xffffffff))

    return (b"\x89PNG\r\n\x1a\n"
            + chunk(b"IHDR", struct.pack(">IIBBBBB", size, size, 8, 6, 0, 0, 0))
            + chunk(b"IDAT", zlib.compress(raw, 9))
            + chunk(b"IEND", b""))


def ico(frames):
    """ICONDIR + one ICONDIRENTRY per size, then the PNGs themselves."""
    blob = struct.pack("<HHH", 0, 1, len(frames))
    offset = 6 + 16 * len(frames)
    for size, data in frames:
        # A width byte of 0 would mean 256; nothing here is that big.
        blob += struct.pack("<BBBBHHII", size, size, 0, 0, 1, 32, len(data), offset)
        offset += len(data)
    return blob + b"".join(d for _, d in frames)


def main():
    with open(SVG, encoding="utf-8") as fh:
        svg = fh.read()

    frames = [(s, png(draw(svg, s), s)) for s in ICO_SIZES]
    with open(os.path.join(ROOT, "favicon.ico"), "wb") as fh:
        fh.write(ico(frames))
    print("wrote favicon.ico (" + ", ".join(f"{s}x{s}" for s in ICO_SIZES) + ")")

    apple = os.path.join(ROOT, "assets", "icons", "apple-touch-icon.png")
    with open(apple, "wb") as fh:
        fh.write(png(draw(svg, APPLE_SIZE), APPLE_SIZE))
    print(f"wrote assets/icons/apple-touch-icon.png ({APPLE_SIZE}x{APPLE_SIZE})")


if __name__ == "__main__":
    main()
