#!/usr/bin/env python3
"""
Builds src/lib/regions/<iso>.ts — the outline of every wine appellation in the
European Union, one module per country.

Two open sources, joined on the EU's own file number:

  * The boundaries: the Eurac Research wine-PDO map, 1,177 Protected
    Designations of Origin, published CC0 with the paper in Scientific Data
    (2022), doi:10.6084/m9.figshare.19312094. A 45 MB GeoPackage — SQLite with
    the geometry as WKB — in EPSG:3035, the equal-area projection Europe uses
    for statistics.
  * The names: eAmbrosia, the European Commission's own register of
    geographical indications, which is where the boundaries were drawn from in
    the first place. Its `fileNumber` is the GeoPackage's `PDOid`, so the join
    is exact rather than a guess: 1,176 of 1,177 features name themselves this
    way, the odd one out being a Hungarian PDO the register has since dropped.

Naming these by matching centroids to the point table was tried first, and
that is what this script exists to avoid. It puts about a sixth of the
polygons on a name that isn't theirs — mostly the big scattered ones, Cava and
Bourgogne and Cataluña, where the mean of a region's vertices moves a long way
for a small change in definition. A map whose whole purpose is learning which
region is which cannot have a sixth of its labels wrong.

A caveat from the paper worth carrying: the boundaries were georeferenced with
municipalities as the smallest unit, so a PDO here is the union of the communes
it covers rather than the legal parcel boundary. Right for finding Barolo on a
map; wrong for arguing about whether a vineyard is inside it.

    pip install nothing — standard library only
    python3 scripts/build-region-shapes.py path/to/EU_PDO.gpkg path/to/gi.json

  EU_PDO.gpkg  https://ndownloader.figshare.com/files/35955185
  gi.json      https://webgate.ec.europa.eu/eambrosia-api/api/v1/geographical-indications
"""

import collections
import json
import math
import os
import re
import sqlite3
import struct
import sys
import unicodedata

# ------------------------------------------------------------------ tuning

# About 1.1 km. A country plate is roughly 1.5 km to the pixel and the map
# zooms to about eight times that, so this is the point where more vertices
# stop being visible and start being weight on the wire.
EPSILON = 0.01

# Three decimals is 110 m, which is finer than the simplification above can
# ever be. A fourth would be a fifth of the file for nothing.
PLACES = 3

# An island or an enclave under this share of the region's main body is a
# speck at any zoom this map offers.
MIN_RING_SHARE = 0.03
MIN_RING_AREA = 1e-4
MAX_RINGS = 6

# --------------------------------------------------- EPSG:3035, inverted

_A = 6378137.0
_F = 1 / 298.257222101
_E2 = _F * (2 - _F)
_E = math.sqrt(_E2)
_LAT0 = math.radians(52.0)
_LON0 = math.radians(10.0)
_FE, _FN = 4321000.0, 3210000.0


def _q(sin_phi):
    return (1 - _E2) * (
        sin_phi / (1 - _E2 * sin_phi * sin_phi)
        - (1 / (2 * _E)) * math.log((1 - _E * sin_phi) / (1 + _E * sin_phi))
    )


_QP = _q(1.0)
_RQ = _A * math.sqrt(_QP / 2)
_BETA0 = math.asin(_q(math.sin(_LAT0)) / _QP)
_D = _A * (math.cos(_LAT0) / math.sqrt(1 - _E2 * math.sin(_LAT0) ** 2)) / (_RQ * math.cos(_BETA0))


def to_lonlat(x, y):
    """Lambert Azimuthal Equal-Area, inverted — Snyder's ellipsoidal form."""
    xp, yp = x - _FE, y - _FN
    rho = math.hypot(xp / _D, _D * yp)
    if rho == 0:
        return math.degrees(_LON0), math.degrees(_LAT0)
    c = 2 * math.asin(rho / (2 * _RQ))
    sin_c, cos_c = math.sin(c), math.cos(c)
    beta = math.asin(cos_c * math.sin(_BETA0) + (_D * yp * sin_c * math.cos(_BETA0)) / rho)
    lon = _LON0 + math.atan2(
        xp * sin_c,
        _D * rho * math.cos(_BETA0) * cos_c - _D * _D * yp * math.sin(_BETA0) * sin_c,
    )
    lat = (
        beta
        + (_E2 / 3 + 31 * _E2**2 / 180 + 517 * _E2**3 / 5040) * math.sin(2 * beta)
        + (23 * _E2**2 / 360 + 251 * _E2**3 / 3780) * math.sin(4 * beta)
        + (761 * _E2**3 / 45360) * math.sin(6 * beta)
    )
    return math.degrees(lon), math.degrees(lat)


def forward(lon_deg, lat_deg):
    """Only used by the self-check below."""
    lon, lat = math.radians(lon_deg), math.radians(lat_deg)
    beta = math.asin(_q(math.sin(lat)) / _QP)
    b = _RQ * math.sqrt(
        2 / (1 + math.sin(_BETA0) * math.sin(beta)
             + math.cos(_BETA0) * math.cos(beta) * math.cos(lon - _LON0))
    )
    return (
        _FE + b * _D * math.cos(beta) * math.sin(lon - _LON0),
        _FN + (b / _D) * (math.cos(_BETA0) * math.sin(beta)
                          - math.sin(_BETA0) * math.cos(beta) * math.cos(lon - _LON0)),
    )


# --------------------------------------------- GeoPackage, just enough of it


def rings_of(blob):
    """Every exterior ring in one feature, in the file's own CRS."""
    if blob[0:2] != b"GP":
        raise ValueError("not a GeoPackage geometry blob")
    envelope = (blob[3] >> 1) & 0x07
    sizes = {0: 0, 1: 32, 2: 48, 3: 48, 4: 64}
    if envelope not in sizes:
        raise ValueError(f"unknown envelope indicator {envelope}")
    rings, _ = _wkb(blob, 8 + sizes[envelope])
    return rings


def _wkb(buf, offset):
    order = "<" if buf[offset] == 1 else ">"
    offset += 1
    (kind,) = struct.unpack_from(order + "I", buf, offset)
    offset += 4
    kind %= 1000  # strip the Z/M flags; this file is flat

    if kind == 3:  # Polygon
        (count,) = struct.unpack_from(order + "I", buf, offset)
        offset += 4
        rings = []
        for index in range(count):
            (points,) = struct.unpack_from(order + "I", buf, offset)
            offset += 4
            coords = struct.unpack_from(order + f"{points * 2}d", buf, offset)
            offset += points * 16
            # Exterior only: a hole inside an appellation is below this map's
            # resolution and would double the file to say so.
            if index == 0:
                rings.append(list(zip(coords[0::2], coords[1::2])))
        return rings, offset

    if kind == 6:  # MultiPolygon
        (count,) = struct.unpack_from(order + "I", buf, offset)
        offset += 4
        rings = []
        for _ in range(count):
            more, offset = _wkb(buf, offset)
            rings.extend(more)
        return rings, offset

    raise ValueError(f"unexpected WKB type {kind}")


# ---------------------------------------------------------------- geometry


def _rdp(points, eps):
    if len(points) < 3:
        return points
    ax, ay = points[0]
    bx, by = points[-1]
    dx, dy = bx - ax, by - ay
    span = dx * dx + dy * dy

    worst, index = -1.0, 0
    for i in range(1, len(points) - 1):
        px, py = points[i]
        if span == 0:
            d = (px - ax) ** 2 + (py - ay) ** 2
        else:
            t = ((px - ax) * dx + (py - ay) * dy) / span
            t = 0.0 if t < 0 else (1.0 if t > 1 else t)
            d = (px - (ax + t * dx)) ** 2 + (py - (ay + t * dy)) ** 2
        if d > worst:
            worst, index = d, i

    if worst > eps * eps:
        return _rdp(points[: index + 1], eps)[:-1] + _rdp(points[index:], eps)
    return [points[0], points[-1]]


def simplify_ring(ring, eps):
    """
    Ramer-Douglas-Peucker, with the fix a closed ring needs.

    A ring starts and ends on the same point, so RDP's first line has no length
    and every vertex is measured against that single point — which reduces a
    country to a triangle. Split the ring at the vertex farthest from its start
    and simplify the two open halves.
    """
    pts = ring[:-1] if len(ring) > 1 and ring[0] == ring[-1] else list(ring)
    if len(pts) < 4:
        return ring

    ax, ay = pts[0]
    far = max(range(len(pts)), key=lambda i: (pts[i][0] - ax) ** 2 + (pts[i][1] - ay) ** 2)
    out = _rdp(pts[: far + 1], eps)[:-1] + _rdp(pts[far:] + [pts[0]], eps)[:-1]
    if len(out) < 3:
        return ring
    return out + [out[0]]


def ring_area(ring):
    total = 0.0
    for i in range(len(ring) - 1):
        x0, y0 = ring[i]
        x1, y1 = ring[i + 1]
        total += x0 * y1 - x1 * y0
    return abs(total) / 2


# ------------------------------------------------------------------- names

# Keeps Latin, Cyrillic and Greek. src/lib/text.ts flattens to a-z0-9 because
# it matches what a person typed into a form, which on this phone is Latin;
# region keys have to survive being Bulgarian.
_NOT_WORD = re.compile(r"[^0-9a-zͰ-ϿЀ-ӿ]+")


def flatten(value):
    value = unicodedata.normalize("NFD", value.lower())
    value = "".join(c for c in value if unicodedata.category(c) != "Mn")
    return _NOT_WORD.sub(" ", value).strip()


# -------------------------------------------------------------------- main


def self_check():
    """The projection is the one thing here that fails silently and plausibly."""
    lon, lat = to_lonlat(_FE, _FN)
    assert abs(lon - 10) < 1e-9 and abs(lat - 52) < 1e-9, "origin is not 10E 52N"
    worst = 0.0
    for lon in range(-25, 46, 5):
        for lat in range(34, 72, 4):
            back = to_lonlat(*forward(lon, lat))
            worst = max(worst, math.hypot(back[0] - lon, back[1] - lat))
    assert worst < 1e-6, f"round trip is off by {worst} degrees"
    print(f"projection round-trips to {worst:.2e} degrees")


def main(gpkg_path, names_path, out_dir):
    sys.setrecursionlimit(200_000)
    self_check()

    register = {
        entry["fileNumber"]: entry
        for entry in json.load(open(names_path, encoding="utf-8"))
        if entry.get("fileNumber")
    }

    db = sqlite3.connect(gpkg_path)
    rows = db.execute("SELECT PDOid, Shape FROM EU_PDO").fetchall()

    countries = collections.defaultdict(list)
    unnamed = []
    for pdo_id, blob in rows:
        entry = register.get(pdo_id)
        if not entry or not entry.get("protectedNames"):
            unnamed.append(pdo_id)
            continue

        name = " / ".join(entry["protectedNames"])
        iso = entry["countries"][0]

        rings = [[to_lonlat(x, y) for x, y in ring] for ring in rings_of(blob)]
        areas = [ring_area(ring) for ring in rings]
        biggest = max(areas) if areas else 0
        keep = sorted(
            ((area, ring) for ring, area in zip(rings, areas)
             if area >= max(biggest * MIN_RING_SHARE, MIN_RING_AREA)),
            key=lambda pair: -pair[0],
        )[:MAX_RINGS]

        shaped = []
        for _, ring in keep:
            simple = simplify_ring(ring, EPSILON)
            shaped.append([[round(x, PLACES), round(y, PLACES)] for x, y in simple])
        if shaped:
            countries[iso].append({"key": flatten(name), "name": name, "rings": shaped})

    os.makedirs(out_dir, exist_ok=True)
    total = 0
    for iso, shapes in sorted(countries.items()):
        shapes.sort(key=lambda shape: shape["name"])
        body = ",\n  ".join(
            "{ key: %s, name: %s, rings: %s }"
            % (
                json.dumps(shape["key"], ensure_ascii=False),
                json.dumps(shape["name"], ensure_ascii=False),
                json.dumps(shape["rings"], separators=(",", ",")),
            )
            for shape in shapes
        )
        text = (
            "// Generated by scripts/build-region-shapes.py — do not edit.\n"
            "import type { RegionShape } from \"@/lib/region-shapes\";\n\n"
            f"/** The {len(shapes)} wine appellations of {iso}, outlines only. */\n"
            f"const SHAPES: RegionShape[] = [\n  {body},\n];\n\nexport default SHAPES;\n"
        )
        path = os.path.join(out_dir, f"{iso.lower()}.ts")
        with open(path, "w", encoding="utf-8") as handle:
            handle.write(text)
        size = os.path.getsize(path)
        total += size
        print(f"  {iso}: {len(shapes):4d} regions  {size // 1024:4d} KB")

    print(f"{sum(len(v) for v in countries.values())} regions, {total // 1024} KB in {len(countries)} files")
    if unnamed:
        print(f"no name in the register, skipped: {', '.join(unnamed)}")


if __name__ == "__main__":
    if len(sys.argv) < 3:
        print(__doc__)
        raise SystemExit(2)
    main(sys.argv[1], sys.argv[2], sys.argv[3] if len(sys.argv) > 3 else "src/lib/regions")
