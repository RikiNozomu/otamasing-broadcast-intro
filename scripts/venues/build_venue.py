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
             "length": 1782.8, "homestretch": 328.4, "height": 3.1, "distances": [1100, 1200, 2000],
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
    # Tokyo: JRA course details, https://japanracing.jp/en/racing/go_racing/jra_racecourses/course_details/tokyo.html
    # (img/tokyo_im02.gif: turf and dirt undulation). Turf A course. The rails are the outside edges of the infield
    # polygons: 155529613 (the dirt course and everything inside it) for the turf, 566666116 for the dirt; 566666123
    # is the steeplechase course. The long climb ("だらだら坂") is on the home straight, about 460-300 m out.
    # Chute: the spur off the 2nd corner into the back straight (way 566666107, far end node 5456541424). Turf 1600 m
    # and 1800 m start up it; dirt 1600 m (February Stakes) starts on the turf there and crosses onto the dirt.
    "tokyo": {
        "name": "Tokyo Racecourse",
        "city": "Fuchu, Tokyo",
        "country": "JP",
        "timezone": "Asia/Tokyo",
        "bbox": [139.474, 35.656, 139.497, 35.671],
        "direction": "left",
        "stands": "172050705",
        "tracks": [
            {"id": "turf", "label": "Turf", "surface": "Turf", "rails": ["155529613"], "offset": 4,
             "length": 2083.1, "homestretch": 525.9, "height": 2.7,
             "undulation": [[0, -0.2], [300, -0.3], [470, -2.1], [840, -2.5], [880, -2.6], [1000, -1.75], [1157, -0.45],
                            [1195, -0.4], [1300, -1.85], [1920, -0.1], [2083.1, -0.1]],
             "chute": {"tip": ["5456541424", "5456541424"], "join": "back"}},
            {"id": "dirt", "label": "Dirt", "surface": "Dirt", "rails": ["566666116"], "offset": 3,
             "length": 1899.0, "homestretch": 501.6, "height": 2.5,
             "undulation": [[0, -0.13], [110, -0.13], [208, -0.22], [494, -2.6], [573, -2.68], [831, -2.68], [925, -2.06],
                            [1008, -1.36], [1024, -1.18], [1086, -1.1], [1216, -1.89], [1899, -0.13]],
             "chute": {"tip": ["5456541424", "5456541424"], "join": "back"}},
        ],
        "outline": ["155529613", "566666116", "566666123", "566666106", "566666107", "566666108"],
    },
    # Nakayama: JRA course details (img/nakayama_im02.gif turf inner and outer, nakayama_im03.gif dirt). The steep
    # climb is on the home straight, 180-70 m out. OSM: multipolygons 8133147 (turf), 8133146 (dirt). The inner turf's
    # rail is the turf's inner ring 571578558; the outer course leaves the inner one after the 2nd corner and runs
    # round the outside of 145659836 (the infield between the two back straights) to the 3rd corner.
    "nakayama": {
        "name": "Nakayama Racecourse",
        "city": "Funabashi, Chiba",
        "country": "JP",
        "timezone": "Asia/Tokyo",
        "bbox": [139.950, 35.718, 139.968, 35.732],
        "direction": "right",
        "stands": "145659834",
        "tracks": [
            {"id": "turf-inner", "label": "Turf (Inner)", "surface": "Turf", "rails": ["571578558"], "offset": 4,
             "length": 1667.1, "homestretch": 310.0, "height": 5.3, "distances": [1800, 2000, 2500, 3600],
             "undulation": [[0, -0.04], [85, -0.26], [189, -2.56], [236, -2.78], [313, -2.26], [380, -2.04], [853, -2.04],
                            [943, -1.67], [1057, -0.11], [1154, 1.15], [1258, 1.96], [1355, 2.56], [1449, 2.56], [1503, 1.89],
                            [1637, 0.19], [1667.1, -0.04]]},
            {"id": "turf-outer", "label": "Turf (Outer)", "surface": "Turf", "rails": ["571578558", "145659836"], "offset": 4,
             "length": 1839.7, "homestretch": 310.0, "height": 5.3, "distances": [1200, 1600, 2200, 4000],
             "undulation": [[0, -0.11], [84, -0.18], [188, -2.54], [248, -2.68], [282, -2.32], [375, -2.02], [729, -2.02],
                            [972, -0.99], [1065, -0.04], [1263, 1.95], [1461, 1.95], [1550, 2.54], [1618, 2.54], [1674, 1.88],
                            [1812, 0.18], [1839.7, -0.04]]},
            {"id": "dirt", "label": "Dirt", "surface": "Dirt", "rails": ["571578559"], "offset": 3,
             "length": 1493.0, "homestretch": 308.0, "height": 4.5,
             "undulation": [[0, -0.07], [12, -0.07], [103, -0.96], [198, -2.28], [444, -2.35], [559, -1.99], [845, -1.32],
                            [927, -0.07], [1027, 1.40], [1225, 1.91], [1274, 1.91], [1416, 1.18], [1493, 0.0]]},
        ],
        "outline": ["145659840", "571578558", "571578557", "571578559", "145659836", "571578562", "145659839"],
    },
    # Hanshin: JRA course details (img/hanshin_im02.gif turf inner and outer, hanshin_im03.gif dirt). OSM multipolygons
    # 5397587 (turf: 362799101 is the inner course's rail, 362799104 the infield the outer course goes round at the
    # 3rd and 4th corners) and 5397588 (dirt, rail 362799107). Chute: the back straight runs on past the 2nd corner
    # (far end nodes 3670511214, 3670511215); turf 1400 m (inner) and 1800 m (outer) and dirt 1400 m start up it.
    "hanshin": {
        "name": "Hanshin Racecourse",
        "city": "Takarazuka, Hyogo",
        "country": "JP",
        "timezone": "Asia/Tokyo",
        "bbox": [135.352, 34.771, 135.374, 34.787],
        "direction": "right",
        "stands": "362799111",
        "tracks": [
            {"id": "turf-inner", "label": "Turf (Inner)", "surface": "Turf", "rails": ["362799101"], "offset": 4,
             "length": 1689.0, "homestretch": 356.5, "height": 1.9, "distances": [1200, 1400, 2000, 2200, 3000, 3200],
             "undulation": [[0, -0.03], [69, -0.03], [188, -1.82], [804, -0.25], [1185, -0.03], [1689, -0.03]],
             "chute": {"tip": ["3670511214", "3670511215"], "join": "back"}},
            {"id": "turf-outer", "label": "Turf (Outer)", "surface": "Turf", "rails": ["362799101", "362799104"], "offset": 4,
             "length": 2089.0, "homestretch": 473.6, "height": 2.4, "distances": [1600, 1800, 2400, 2600],
             "undulation": [[0, -0.06], [68, -0.06], [190, -1.83], [546, -0.11], [644, 0.17], [1176, 0.33], [1234, 0.56],
                            [1283, 0.17], [1293, -0.06], [1332, -0.22], [1551, -0.06], [2089, -0.06]],
             "chute": {"tip": ["3670511214", "3670511215"], "join": "back"}},
            {"id": "dirt", "label": "Dirt", "surface": "Dirt", "rails": ["362799107"], "offset": 3,
             "length": 1517.6, "homestretch": 352.5, "height": 1.6,
             "undulation": [[0, -0.03], [70, -0.03], [203, -1.38], [537, -1.16], [1000, -0.03], [1517.6, -0.03]],
             "chute": {"tip": ["3670511214", "3670511215"], "join": "back"}},
        ],
        "outline": ["362799100", "362799101", "362799104", "362799105", "362799106", "362799107", "362799109"],
    },
    # Chukyo: JRA course details (img/chukyo_im02.gif turf, chukyo_im03.gif dirt). OSM has no track tags here: the
    # turf (497422534, landuse=grass) and the dirt (497422533, natural=sand) are each one closed way round the outer
    # edge and back round the inner one, so the rail is the hole inside it; 497453637 is the outside of everything.
    "chukyo": {
        "name": "Chukyo Racecourse",
        "city": "Toyoake, Aichi",
        "country": "JP",
        "timezone": "Asia/Tokyo",
        "bbox": [136.9840, 35.0620, 136.9975, 35.0740],
        "direction": "left",
        "stands": "496192082",
        "tracks": [
            {"id": "turf", "label": "Turf", "surface": "Turf", "rails": ["497422534:hole"], "offset": 4,
             "length": 1705.9, "homestretch": 412.5, "height": 3.5,
             "undulation": [[0, 0.06], [84, 0.06], [246, -0.28], [347, -2.22], [453, -1.83], [632, -0.89], [656, -0.78],
                            [821, 0.0], [986, 0.78], [1060, 1.0], [1130, 1.0], [1204, 0.83], [1467, 0.06], [1705.9, 0.0]]},
            {"id": "dirt", "label": "Dirt", "surface": "Dirt", "rails": ["497422533:hole"], "offset": 3,
             "length": 1530.0, "homestretch": 410.7, "height": 3.4,
             "undulation": [[0, 0.0], [118, 0.0], [223, -0.26], [324, -1.72], [382, -2.08], [420, -1.88], [595, -0.99],
                            [757, 0.0], [925, 0.94], [979, 1.25], [1068, 1.09], [1116, 0.94], [1170, 0.47], [1266, 0.1],
                            [1316, -0.1], [1530, -0.05]]},
        ],
        "outline": ["497453637", "497422534", "497422533"],
    },
    # NAR courses: laps, straights ("ゴールまで" = 4th corner to the post) and heights from keiba.go.jp's course guide
    # (https://www.keiba.go.jp/guide/course/), the start points from its course diagrams. The southern Kanto tracks and
    # Kanazawa are flat. Ohi also runs left-handed races on its outer course now; this is the right-handed layout,
    # the one every JpnI there uses.
    "ohi": {
        "name": "Ohi Racecourse",
        "aliases": ["oi", "ohi", "tck", "tokyo city keiba", "oi racecourse"],
        "facts": "NAR (keiba.go.jp)",
        "city": "Shinagawa, Tokyo",
        "country": "JP",
        "timezone": "Asia/Tokyo",
        "bbox": [139.7375, 35.5880, 139.7480, 35.5965],
        "direction": "right",
        "stands": "207543013",
        "tracks": [
            # the outer course's rail isn't in OSM: it is 25 m (its width) inside the outside of the track, 155151628
            {"id": "outer", "label": "Dirt (Outer)", "surface": "Dirt", "rails": ["155151628:inset:25"], "offset": 3,
             "length": 1600.0, "homestretch": 386.0, "height": 0},
            {"id": "inner", "label": "Dirt (Inner)", "surface": "Dirt", "rails": ["207543031"], "offset": 3,
             "length": 1400.0, "homestretch": 286.0, "height": 0, "distances": [1500, 1600]},
        ],
        "outline": ["155151628", "207543031", "207543020"],
    },
    # Kawasaki: the home straight runs on back past the 4th corner (chute, far end nodes 1733717139, 5458430984), where
    # 1600 m (Zen-Nippon Nisai Yushun) starts.
    "kawasaki": {
        "name": "Kawasaki Racecourse",
        "facts": "NAR (keiba.go.jp)",
        "city": "Kawasaki, Kanagawa",
        "country": "JP",
        "timezone": "Asia/Tokyo",
        "bbox": [139.7060, 35.5300, 139.7155, 35.5350],
        "direction": "left",
        "stands": "721879429",
        "tracks": [
            {"id": "dirt", "label": "Dirt", "surface": "Dirt", "rails": ["161394297"], "offset": 3,
             "length": 1200.0, "homestretch": 300.0, "height": 0,
             "chute": {"tip": ["1733717139", "5458430984"], "join": "home"}},
        ],
        "outline": ["161394298", "161394297"],
    },
    # Funabashi: the rails between the inner and outer courses are three thin polygons (393162046, 393162047, 393162050).
    "funabashi": {
        "name": "Funabashi Racecourse",
        "facts": "NAR (keiba.go.jp)",
        "city": "Funabashi, Chiba",
        "country": "JP",
        "timezone": "Asia/Tokyo",
        "bbox": [139.9900, 35.6845, 140.0040, 35.6950],
        "direction": "left",
        "stands": "182651985",
        "tracks": [
            {"id": "outer", "label": "Dirt (Outer)", "surface": "Dirt", "rails": ["393162046", "393162047", "393162050"],
             "offset": 3, "length": 1400.0, "homestretch": 308.0, "height": 0},
            {"id": "inner", "label": "Dirt (Inner)", "surface": "Dirt", "rails": ["393162045"], "offset": 3,
             "length": 1250.0, "homestretch": 308.0, "height": 0, "distances": [1400, 1500]},
        ],
        "outline": ["393162048", "393162045", "393162046", "393162047", "393162050"],
    },
    "urawa": {
        "name": "Urawa Racecourse",
        "facts": "NAR (keiba.go.jp)",
        "city": "Saitama, Saitama",
        "country": "JP",
        "timezone": "Asia/Tokyo",
        "bbox": [139.6675, 35.8545, 139.6750, 35.8605],
        "direction": "left",
        "stands": "1156510306",
        "tracks": [
            {"id": "dirt", "label": "Dirt", "surface": "Dirt", "rails": ["566911961"], "offset": 3,
             "length": 1200.0, "homestretch": 220.0, "height": 0},
        ],
        "outline": ["566911963", "1341988112", "566911961"],
    },
    # Morioka: the only NAR course with turf (inside the dirt) and a real hill (dirt 4.4 m, turf 4.6 m). No chart is
    # published, so the heights follow the course descriptions: lowest at the end of the 4th corner, up the home
    # straight and on to the 1st corner, down a little through the 2nd, up the back straight to the top early in the
    # 3rd corner, then down through the 3rd and 4th. The dirt mile (Mile Championship Nambu Hai) starts at the far
    # end of the long chute behind the 2nd corner (nodes 5458949447, 5458949448) and does not lap.
    "morioka": {
        "name": "Morioka Racecourse",
        "facts": "NAR (keiba.go.jp)",
        "city": "Morioka, Iwate",
        "country": "JP",
        "timezone": "Asia/Tokyo",
        "bbox": [141.2130, 39.6855, 141.2260, 39.6975],
        "direction": "left",
        "stands": "NW",
        "tracks": [
            {"id": "dirt", "label": "Dirt", "surface": "Dirt", "rails": ["566989957"], "offset": 3,
             "length": 1600.0, "homestretch": 300.0, "height": 4.4,
             "undulation": [[0, 1.6], [301, 0.0], [514, 1.6], [680, 4.3], [725, 4.4], [1114, 1.4], [1313, 2.2], [1522, 2.0],
                            [1600, 1.6]],
             "chute": {"tip": ["5458949447", "5458949448"], "join": "back", "distances": [1600]}},
            {"id": "turf", "label": "Turf", "surface": "Turf", "rails": ["566989959"], "offset": 3,
             "length": 1400.0, "homestretch": 300.0, "height": 4.6,
             "undulation": [[0, 1.7], [300, 0.0], [459, 1.7], [600, 4.5], [622, 4.6], [994, 1.5], [1161, 2.3], [1326, 2.1],
                            [1400, 1.7]]},
        ],
        "outline": ["566989955", "566989957", "566989961", "566989959"],
    },
    # Kanazawa: the inside rail is a thin ring in three pieces (569340305, 569340309, 569340311); no stand in OSM, the
    # stands are on the west side.
    "kanazawa": {
        "name": "Kanazawa Racecourse",
        "facts": "NAR (keiba.go.jp)",
        "city": "Kanazawa, Ishikawa",
        "country": "JP",
        "timezone": "Asia/Tokyo",
        "bbox": [136.6705, 36.6320, 136.6775, 36.6430],
        "direction": "right",
        "stands": "W",
        "tracks": [
            {"id": "dirt", "label": "Dirt", "surface": "Dirt", "rails": ["569340305", "569340309", "569340311"], "offset": 3,
             "length": 1200.0, "homestretch": 236.0, "height": 0},
        ],
        "outline": ["569340303", "569340304", "569340305", "569340309", "569340311"],
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


def rail(w, ways, proj):
    """A rail polygon: an OSM way; with ":hole", the inside of a way that outlines a ring (a track drawn as one closed
    way round its outer edge and back round its inner edge, like Chukyo's); with ":inset:<m>", a way round the
    outside of the track pulled in by its width."""
    if ":inset:" in w:  # a way round the outside of the track: its inside rail is this many metres in
        wid, k = w.split(":inset:")
        g = Polygon([proj(p) for p in ways[wid]]).buffer(-float(k))
        return max(getattr(g, "geoms", [g]), key=lambda x: x.area)
    if not w.endswith(":hole"):
        return Polygon([proj(p) for p in ways[w]])
    ring = Polygon([proj(p) for p in ways[w[:-5]]]).buffer(0)
    inside = ring.convex_hull.difference(ring)
    hole = max(getattr(inside, "geoms", [inside]), key=lambda g: g.area)
    # where the way crosses from the outer edge to the inner one it leaves a thin wedge: open it away
    hole = hole.buffer(-3).buffer(3)
    return max(getattr(hole, "geoms", [hole]), key=lambda g: g.area)


COMPASS = {"N": (0, 1), "S": (0, -1), "E": (1, 0), "W": (-1, 0), "NE": (1, 1), "NW": (-1, 1), "SE": (1, -1), "SW": (-1, -1)}


def build_track(cfg, ways, nodes, proj, plot=None):
    # an oval is convex, so the hull of the rail polygons is the infield; it also joins Kyoto's inner rail to the
    # island inside the outer course (the outer course's inside rail is that island's outer edge)
    infield = unary_union([rail(w, ways, proj) for w in cfg["rails"]]).convex_hull
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
    # an oval has two turns (each split into two corners); a course like Nakayama's outer one has four, with short
    # straights between the 1st and 2nd and between the 3rd and 4th
    assert len(corners) in (2, 4), f"expected two or four turns, found {len(corners)}"
    # the home straight is the one in front of the stands; the winning post is `homestretch` official metres
    # after the end of the turn before it
    mid = lambda a, b: pts[((a + b) // 2) % n]  # noqa: E731
    if isinstance(cfg["stands"], str):  # the side of the course the stands are on, when OSM has no stand
        dx, dy = COMPASS[cfg["stands"]]
        home = max(straights, key=lambda ab: mid(*ab)[0] * dx + mid(*ab)[1] * dy)
    else:
        home = min(straights, key=lambda ab: math.dist(mid(*ab), cfg["stands"]))
    geo_len = cumlen(pts)[1]
    scale = cfg["length"] / geo_len  # official metres per drawn metre
    post = home[0] + round(cfg["homestretch"] / scale / STEP)
    if post > home[1] - 5:
        # the curvature put the start of the 1st corner before the post (the bend eases in): the straight runs on to
        # 10 m past the post and the corner starts there
        d = post + 5 - home[1]
        corners = [(a + d, b) if a % n == home[1] % n else (a, b) for a, b in corners]
        home = (home[0], post + 5)
    post %= n
    pts = pts[post:] + pts[:post]
    shift = lambda i: (i - post) % n  # noqa: E731
    cum, total = cumlen(pts)
    s_of = lambda i: cum[i % n] * scale  # noqa: E731  official metres from the post

    # turns in running order from the post: first = 1st+2nd corners, second = 3rd+4th; split each at half its turn
    turns = sorted(((shift(a), shift(a) + (b - a)) for a, b in corners))
    end = lambda b: round(s_of(b) if b < n else cfg["length"] + s_of(b % n), 1)  # noqa: E731
    sections = []
    if len(turns) == 4:
        # four turns are the four corners; the straight between the 1st and 2nd goes with the 2nd, the one between
        # the 3rd and 4th with the 3rd (as on JRA's chart of Nakayama's outer course)
        (a1, b1), (a2, b2), (a3, b3), (a4, b4) = turns
        for cid, a, b in (("c1", a1, b1), ("c2", b1, b2), ("c3", a3, a4), ("c4", a4, b4)):
            sections.append({"id": cid, "kind": "corner", "from": round(s_of(a), 1), "to": end(b)})
    for (a, b), (n1, n2) in zip(turns if len(turns) == 2 else [], [("c1", "c2"), ("c3", "c4")]):
        acc, half, m = 0.0, sum(abs(k[(i + post) % n]) for i in range(a, b)) / 2, a
        while acc < half and m < b:
            acc += abs(k[(m + post) % n])
            m += 1
        sections.append({"id": n1, "kind": "corner", "from": round(s_of(a), 1), "to": round(s_of(m), 1)})
        sections.append({"id": n2, "kind": "corner", "from": round(s_of(m), 1), "to": end(b)})
    c2_end, c3_start = sections[1]["to"], sections[2]["from"]
    c4_end = sections[3]["to"]
    sections.insert(2, {"id": "back", "kind": "straight", "from": c2_end, "to": c3_start})
    # the home straight runs from the end of the 4th corner, through the post, to the 1st corner
    sections.insert(0, {"id": "home", "kind": "straight", "from": round(c4_end - cfg["length"], 1), "to": sections[0]["from"]})

    # height profile from the undulation chart: metres before the post -> metres after it (s = length - u),
    # straight lines between the chart's points, lowest point 0, highest point = the published height difference
    sec = {x["id"]: x for x in sections}
    und = sorted(cfg.get("undulation") or [[0, 0], [cfg["length"], 0]])
    lo, hi = min(z for _, z in und), max(z for _, z in und)
    k = cfg["height"] / (hi - lo) if hi > lo else 0  # flat

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
    if "distances" in cfg:
        out["distances"] = cfg["distances"]
    if "chute" in cfg:
        # a straight centre line from the middle of the far end to the loop at the start of the section it runs into
        tip = [proj(nodes[i]) for i in cfg["chute"]["tip"]]
        far = ((tip[0][0] + tip[1][0]) / 2, (tip[0][1] + tip[1][1]) / 2)
        join = sec[cfg["chute"]["join"]]["from"] % cfg["length"]  # the home straight starts before the post (< 0)
        near = pts[round(join / scale / STEP) % n]
        out["chute"] = {"join": round(join, 1), "length": round(math.dist(far, near) * scale, 1),
                        "line": [[round(far[0], 1), round(far[1], 1)], [round(near[0], 1), round(near[1], 1)]]}
        if "distances" in cfg["chute"]:
            out["chute"]["distances"] = cfg["chute"]["distances"]
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
    stands = cfg["stands"]
    if stands not in COMPASS:
        stand = [proj(p) for p in ways[stands]]
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
        "source": "Track shapes © OpenStreetMap contributors (ODbL); course facts: " + cfg.get("facts", "JRA"),
        "outline": outline, "tracks": tracks,
    }
    if cfg.get("aliases"):
        venue["aliases"] = cfg["aliases"]
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
