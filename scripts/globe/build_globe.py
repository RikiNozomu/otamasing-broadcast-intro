#!/usr/bin/env python3
"""
Build public/globe/world.json for the wireframe globe: the world's coastlines and land borders as
polylines of [lon, lat] (Natural Earth, public domain, https://www.naturalearthdata.com).

    python3 scripts/globe/build_globe.py <folder with the Natural Earth .geojson files>

Coastlines at 1:110m for the whole world, plus 1:50m inside DETAIL boxes (around the venues), where the
camera zooms in; the 1:110m lines inside those boxes are left out.
"""
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
# lon/lat boxes drawn at 1:50m: Japan (and around it)
DETAIL = [(122.0, 22.0, 150.0, 47.0)]


def inside(p):
    return any(a <= p[0] <= c and b <= p[1] <= d for a, b, c, d in DETAIL)


def lines(path):
    for f in json.loads(Path(path).read_text())["features"]:
        g = f["geometry"]
        parts = [g["coordinates"]] if g["type"] == "LineString" else g["coordinates"]
        yield from parts


def split(coords, keep):
    """Pieces of a line whose points pass `keep`."""
    cur = []
    for p in coords:
        if keep(p):
            cur.append(p)
        else:
            if len(cur) > 1:
                yield cur
            cur = []
    if len(cur) > 1:
        yield cur


def thin(coords, step):
    """Drop points closer than `step` degrees to the last kept one."""
    out = [coords[0]]
    for p in coords[1:-1]:
        if abs(p[0] - out[-1][0]) + abs(p[1] - out[-1][1]) >= step:
            out.append(p)
    out.append(coords[-1])
    return out


def main():
    src = Path(sys.argv[1])
    out = {"coast": [], "border": []}
    rnd = lambda c, d: [[round(x, d), round(y, d)] for x, y in c]  # noqa: E731
    for c in lines(src / "ne_110m_coastline.geojson"):
        for piece in split(c, lambda p: not inside(p)):
            out["coast"].append(rnd(thin(piece, 0.3), 2))
    for c in lines(src / "ne_50m_coastline.geojson"):
        for piece in split(c, inside):
            out["coast"].append(rnd(thin(piece, 0.03), 3))
    for c in lines(src / "ne_110m_admin_0_boundary_lines_land.geojson"):
        out["border"].append(rnd(thin(c, 0.3), 2))
    dest = ROOT / "public" / "globe" / "world.json"
    dest.parent.mkdir(exist_ok=True)
    dest.write_text(json.dumps(out, separators=(",", ":")))
    print("wrote", dest.relative_to(ROOT), f"{dest.stat().st_size / 1024:.0f} KB", len(out["coast"]), "coast lines")


if __name__ == "__main__":
    main()
