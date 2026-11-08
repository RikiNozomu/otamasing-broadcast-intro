#!/usr/bin/env python3
"""
Build a venue file (src/venues/<id>.json) for the 3D course scene from OpenStreetMap track outlines
and the course facts published by the racing authority (lap length, home straight, height difference).

    pip install shapely
    python3 scripts/venues/build_venue.py kyoto            # downloads the OSM area once into scripts/venues/cache/
    python3 scripts/venues/build_venue.py kyoto --plot     # also writes scripts/venues/cache/kyoto.png (needs matplotlib)

What it writes, all in metres on a flat plane around the venue's centre (x = east, y = north):
- `outline`: thin lines drawn around the course for context (every track edge in the OSM area);
- per track: the running line (a closed loop a few metres outside the inside rail, in running order and
  starting at the winning post), its sections (straights and corners, from the curvature) and a height profile;
- per track with a chute (a straight spur off the loop where some races start, like Kyoto's pocket behind the
  2nd corner): `chute` = where it runs into the loop (`join`, official metres from the post), its length and its
  centre line from the far end to that point.

Track shapes © OpenStreetMap contributors, ODbL 1.0 (https://www.openstreetmap.org/copyright).
Heights follow the authority's undulation chart of each course: the chart's corner points (read off the
image) joined by straight lines, lifted so the lowest point is 0 and scaled to the published height difference.
"""
import json
import math
import sys
import urllib.request
import xml.etree.ElementTree as ET
from pathlib import Path

from shapely.geometry import LineString, Polygon
from shapely.ops import unary_union

HERE = Path(__file__).resolve().parent
ROOT = HERE.parent.parent
CACHE = HERE / "cache"

# Course facts: JRA course guide (jra.go.jp/facilities/race/kyoto/course/), Kyoto after the 2023 renovation.
# `rails`: OSM ways whose polygons together are the infield of this course (their outside edge is the inside rail).
# `undulation`: the corner points of the course's undulation chart as [metres before the winning post, height in m]
# (the chart runs from the post backwards: home straight, 4th corner, 3rd corner, ...). Kyoto: JRA's course details,
# https://japanracing.jp/en/racing/go_racing/jra_racecourses/course_details/kyoto.html (img/kyoto_im02.gif, kyoto_im03.gif).
# Kyoto's hill ("淀の坂") climbs from the middle of the back straight to the top early in the 3rd corner, then drops
# steeply through the 3rd corner; the home straight dips a little.
# `chute`: the two OSM nodes at the chute's far end and the section it runs into. JRA: "2コーナーの奥にはバックストレッチに
# 連なる長い引き込み線が設けられており、外回りの芝1600メートルと芝1800メートル、内回りの芝1600メートルは、向正面左手の
# 奥深い地点からスタートを切ることになる".
KYOTO_CHUTE = {"tip": ["5121185493", "5121185494"], "join": "back"}
VENUES = {
    "kyoto": {
        "name": "Kyoto Racecourse",
        "city": "Fushimi-ku, Kyoto",
        "country": "JP",
        "timezone": "Asia/Tokyo",
        "bbox": [135.718, 34.900, 135.735, 34.914],
        "direction": "right",
        # a grandstand (OSM way): the straight nearest to it is the home straight
        "stands": "1279323717",
        "tracks": [
            {"id": "turf-outer", "label": "Turf (Outer)", "surface": "Turf", "rails": ["526656543", "526656542"], "offset": 4,
             "length": 1894.3, "homestretch": 403.7, "height": 4.3,
             "undulation": [[0, -0.1], [310, -0.3], [680, 0.4], [830, 3.9], [1080, 2.1], [1180, 0.1], [1894.3, -0.1]],
             "chute": KYOTO_CHUTE},
            {"id": "turf-inner", "label": "Turf (Inner)", "surface": "Turf", "rails": ["526656543"], "offset": 4,
             "length": 1782.8, "homestretch": 328.4, "height": 3.1,
             "undulation": [[0, -0.1], [285, -0.4], [600, 0.1], [630, 0.3], [775, 2.8], [895, 2.8], [1065, 0.1], [1782.8, -0.1]],
             "chute": KYOTO_CHUTE},
            {"id": "dirt", "label": "Dirt", "surface": "Dirt", "rails": ["526656545"], "offset": 3,
             "length": 1607.6, "homestretch": 329.1, "height": 3.0,
             "undulation": [[0, -0.1], [525, -0.1], [730, 2.4], [820, 2.7], [840, 2.7], [1045, 0.2], [1260, -0.2], [1385, 0.1],
                            [1607.6, -0.1]]},
        ],
        # every track edge in the area, drawn as thin context lines
        "outline": ["526656541", "526656542", "526656543", "526656544", "526656545", "526656546", "526656548"],
    },
}

STEP = 2.0  # metres between points of the running line before simplifying


def fetch(vid: str, bbox) -> Path:
    CACHE.mkdir(exist_ok=True)
    p = CACHE / f"{vid}.osm"
    if not p.exists():
        url = "https://api.openstreetmap.org/api/0.6/map?bbox=" + ",".join(map(str, bbox))
        req = urllib.request.Request(url, headers={"User-Agent": "otamasing-broadcast-intro venue builder"})
        p.write_bytes(urllib.request.urlopen(req, timeout=120).read())
    return p


def load(p: Path):
    t = ET.parse(p).getroot()
    nodes = {n.get("id"): (float(n.get("lat")), float(n.get("lon"))) for n in t.findall("node")}
    ways = {w.get("id"): [nodes[n.get("ref")] for n in w.findall("nd") if n.get("ref") in nodes] for w in t.findall("way")}
    return ways, nodes


def projector(lat0, lon0):
    kx = math.cos(math.radians(lat0)) * 111_320.0
    ky = 110_574.0
    return lambda p: ((p[1] - lon0) * kx, (p[0] - lat0) * ky)


def resample(coords, step):
    """Points every `step` metres along a closed ring (first point not repeated)."""
    line = LineString(list(coords) + [coords[0]])
    n = max(8, int(line.length / step))
    return [line.interpolate(i * line.length / n).coords[0] for i in range(n)]


def signed_area(pts):
    return sum(pts[i][0] * pts[(i + 1) % len(pts)][1] - pts[(i + 1) % len(pts)][0] * pts[i][1] for i in range(len(pts))) / 2


def cumlen(pts):
    out = [0.0]
    for i in range(1, len(pts)):
        out.append(out[-1] + math.dist(pts[i - 1], pts[i]))
    return out, out[-1] + math.dist(pts[-1], pts[0])


def heading(a, b):
    return math.atan2(b[1] - a[1], b[0] - a[0])


def curvature(pts, win=12):
    """Signed turn rate (radians per metre) at each point, over +-win points."""
    n = len(pts)
    out = []
    for i in range(n):
        a, b, c = pts[(i - win) % n], pts[i], pts[(i + win) % n]
        d = (heading(b, c) - heading(a, b) + math.pi) % (2 * math.pi) - math.pi
        out.append(d / (math.dist(a, b) + math.dist(b, c)) * 2)
    return out


def runs(flags):
    """Runs of equal flags around a closed loop: [(flag, start, end_exclusive)], end may exceed n."""
    n = len(flags)
    start = next(i for i in range(n) if flags[i] != flags[i - 1])
    out, i = [], start
    while i < start + n:
        j = i
        while j < start + n and flags[j % n] == flags[i % n]:
            j += 1
        out.append((flags[i % n], i, j))
        i = j
    return out


def build_track(cfg, ways, nodes, proj, plot=None):
    # an oval is convex, so the hull of the rail polygons is the infield; it also joins Kyoto's inner rail to the
    # island inside the outer course (the outer course's inside rail is that island's outer edge)
    infield = unary_union([Polygon([proj(p) for p in ways[w]]) for w in cfg["rails"]]).convex_hull
    line = infield.buffer(cfg["offset"], join_style=1).exterior
    pts = resample(list(line.coords)[:-1], STEP)
    clockwise = signed_area(pts) < 0
    if clockwise != (cfg.get("direction", "right") == "right"):
        pts.reverse()
    n = len(pts)
    k = curvature(pts)
    turn = 1 / 450  # tighter than a 450 m radius counts as a corner
    flags = [abs(x) > turn for x in k]
    # tidy: a straight shorter than 100 m inside a turn is part of the turn, a "corner" shorter than 40 m on a
    # straight is part of the straight
    for _ in range(4):
        for f, a, b in runs(flags):
            if (b - a) * STEP < (40 if f else 100):
                for i in range(a, b):
                    flags[i % n] = not f
    rs = runs(flags)
    corners = [(a, b) for f, a, b in rs if f]
    straights = [(a, b) for f, a, b in rs if not f]
    assert len(corners) == 2, f"expected two turns, found {len(corners)}"
    assert len(straights) == 2
    # the home straight is the one in front of the stands; the winning post is `homestretch` official metres
    # after the end of the turn before it
    mid = lambda a, b: pts[((a + b) // 2) % n]  # noqa: E731
    home = min(straights, key=lambda ab: math.dist(mid(*ab), cfg["stands"]))
    geo_len = cumlen(pts)[1]
    scale = cfg["length"] / geo_len  # official metres per drawn metre
    post = (home[0] + round(cfg["homestretch"] / scale / STEP)) % n
    pts = pts[post:] + pts[:post]
    shift = lambda i: (i - post) % n  # noqa: E731
    cum, total = cumlen(pts)
    s_of = lambda i: cum[i % n] * scale  # noqa: E731  official metres from the post

    # turns in running order from the post: first = 1st+2nd corners, second = 3rd+4th; split each at half its turn
    turns = sorted(((shift(a), shift(a) + (b - a)) for a, b in corners))
    sections = []
    names = [("c1", "c2"), ("c3", "c4")]
    for (a, b), (n1, n2) in zip(turns, names):
        acc, half, m = 0.0, sum(abs(k[(i + post) % n]) for i in range(a, b)) / 2, a
        while acc < half and m < b:
            acc += abs(k[(m + post) % n])
            m += 1
        sections.append({"id": n1, "kind": "corner", "from": round(s_of(a), 1), "to": round(s_of(m), 1)})
        sections.append({"id": n2, "kind": "corner", "from": round(s_of(m), 1), "to": round(s_of(b) if b < n else cfg["length"] + s_of(b % n), 1)})
    c2_end, c3_start = sections[1]["to"], sections[2]["from"]
    c4_end = sections[3]["to"]
    sections.insert(2, {"id": "back", "kind": "straight", "from": c2_end, "to": c3_start})
    # the home straight runs from the end of the 4th corner, through the post, to the 1st corner
    sections.insert(0, {"id": "home", "kind": "straight", "from": round(c4_end - cfg["length"], 1), "to": sections[0]["from"]})

    # height profile from the undulation chart: metres before the post -> metres after it (s = length - u),
    # straight lines between the chart's points, lowest point 0, highest point = the published height difference
    sec = {x["id"]: x for x in sections}
    und = sorted(cfg["undulation"])
    lo, hi = min(z for _, z in und), max(z for _, z in und)
    k = cfg["height"] / (hi - lo)

    def chart(u):
        for (u0, z0), (u1, z1) in zip(und, und[1:]):
            if u0 <= u <= u1:
                return z0 + (z1 - z0) * (u - u0) / (u1 - u0)
        return und[-1][1]

    prof = []
    for i in range(0, int(cfg["length"]) + 1, 10):
        s = float(i)
        prof.append([round(s, 1), round((chart(cfg["length"] - s) - lo) * k, 2)])

    simple = LineString(pts + [pts[0]]).simplify(0.25).coords[:-1]
    out = {
        "id": cfg["id"], "label": cfg["label"], "surface": cfg["surface"],
        "length": cfg["length"], "homestretch": cfg["homestretch"], "height": cfg["height"],
        "line": [[round(x, 1), round(y, 1)] for x, y in simple],
        "sections": sections,
        "elevation": prof,
    }
    if "chute" in cfg:
        # a straight centre line from the middle of the far end to the loop at the start of the section it runs into
        tip = [proj(nodes[i]) for i in cfg["chute"]["tip"]]
        far = ((tip[0][0] + tip[1][0]) / 2, (tip[0][1] + tip[1][1]) / 2)
        join = sec[cfg["chute"]["join"]]["from"]
        near = pts[round(join / scale / STEP) % n]
        out["chute"] = {"join": join, "length": round(math.dist(far, near) * scale, 1),
                        "line": [[round(far[0], 1), round(far[1], 1)], [round(near[0], 1), round(near[1], 1)]]}
        print(f"  {cfg['id']}: chute {out['chute']['length']:.0f} m into the loop at {join:.0f} m")
        if plot is not None:
            plot.plot([far[0], near[0]], [far[1], near[1]], lw=1, ls="--")
    back = sec["back"]["to"] - sec["back"]["from"]
    print(f"  {cfg['id']}: drawn {total:.0f} m (scale {scale:.3f}), {len(out['line'])} pts, back straight {back:.0f} m,",
          ", ".join(f"{x['id']} {x['from']:.0f}-{x['to']:.0f}" for x in sections))
    if plot is not None:
        plot.plot([p[0] for p in pts] + [pts[0][0]], [p[1] for p in pts] + [pts[0][1]], lw=1)
        plot.plot(pts[0][0], pts[0][1], "ro")
    return out


def main():
    vid = sys.argv[1]
    cfg = VENUES[vid]
    ways, nodes = load(fetch(vid, cfg["bbox"]))
    allpts = [p for w in cfg["outline"] for p in ways[w]]
    lat0 = sum(p[0] for p in allpts) / len(allpts)
    lon0 = sum(p[1] for p in allpts) / len(allpts)
    proj = projector(lat0, lon0)
    ax = None
    if "--plot" in sys.argv:
        import matplotlib
        matplotlib.use("Agg")
        import matplotlib.pyplot as plt
        fig, ax = plt.subplots(figsize=(14, 9))
    print(vid)
    stand = [proj(p) for p in ways[cfg["stands"]]]
    stands = (sum(p[0] for p in stand) / len(stand), sum(p[1] for p in stand) / len(stand))
    tracks = [build_track({**t, "direction": cfg["direction"], "stands": stands}, ways, nodes, proj, ax) for t in cfg["tracks"]]
    outline = []
    for w in cfg["outline"]:
        ring = LineString([proj(p) for p in ways[w]]).simplify(0.4)
        outline.append([[round(x, 1), round(y, 1)] for x, y in ring.coords])
        if ax is not None:
            ax.plot([p[0] for p in outline[-1]], [p[1] for p in outline[-1]], color="#999", lw=0.6)
    venue = {
        "id": vid, "name": cfg["name"], "city": cfg["city"], "country": cfg["country"], "timezone": cfg["timezone"],
        "lat": round(lat0, 5), "lon": round(lon0, 5), "direction": cfg["direction"],
        "source": "Track shapes © OpenStreetMap contributors (ODbL); course facts: JRA",
        "outline": outline, "tracks": tracks,
    }
    dest = ROOT / "src" / "venues" / f"{vid}.json"
    dest.parent.mkdir(exist_ok=True)
    dest.write_text(json.dumps(venue, separators=(",", ":")) + "\n")
    print("wrote", dest.relative_to(ROOT), f"{dest.stat().st_size / 1024:.0f} KB")
    if ax is not None:
        ax.set_aspect("equal")
        ax.grid(True)
        fig.savefig(CACHE / f"{vid}.png", dpi=80)


if __name__ == "__main__":
    main()
