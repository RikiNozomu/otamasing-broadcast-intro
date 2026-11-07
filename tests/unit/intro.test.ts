import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { introOf, mergeImport, parseActive, parseFile, exportFile, type AppData } from "../../src/lib/model";
import { sampleData } from "../../src/lib/sample";
import { gridPage, introRunners, pedigreeLines, playingItem, postInstant, stallOf, weatherOfCode, fetchForecast } from "../../src/lib/intro";
import { courseFacts, courseOf, cornersRun, heightAt, racePieces, startOf, VENUES } from "../../src/lib/venues";
import { imageRefs, mapImageRefs, isImageName, videoName } from "../../src/lib/imageRefs";

const read = (p: string) => readFileSync(new URL(`../../${p}`, import.meta.url), "utf8");
const r11 = () => sampleData().races.find((r) => r.id === "sample-11")!;

describe("venues", () => {
  const kyoto = VENUES.find((v) => v.id === "kyoto")!;
  const outer = kyoto.tracks.find((t) => t.id === "turf-outer")!;
  it("has Kyoto with JRA's course facts", () => {
    expect(kyoto).toMatchObject({ country: "JP", direction: "right" });
    expect(outer).toMatchObject({ surface: "Turf", length: 1894.3, homestretch: 403.7, height: 4.3 });
    expect(kyoto.tracks.map((t) => t.id).sort()).toEqual(["dirt", "turf-inner", "turf-outer"]);
    for (const t of kyoto.tracks) expect(t.sections.map((s) => s.id).sort()).toEqual(["back", "c1", "c2", "c3", "c4", "home"]);
  });
  it("finds the course from the race (name and surface) or the dock's pick", () => {
    const race = r11();
    expect(courseOf(race)?.track.id).toBe("turf-outer");
    expect(courseOf({ ...race, intro: { ...race.intro, course: { ...race.intro.course, venue: null, track: null } } })?.venue.id).toBe("kyoto");
    expect(courseOf({ ...race, course: "Nowhere", intro: { ...race.intro, course: { ...race.intro.course, venue: null, track: null } } })).toBeNull();
    expect(courseOf({ ...race, surface: "Dirt", intro: { ...race.intro, course: { ...race.intro.course, track: null } } })?.track.id).toBe("dirt");
  });
  it("a race longer than a lap goes round from the start to the post", () => {
    const pieces = racePieces(outer, 2200);
    expect(pieces.reduce((t, [a, b]) => t + b - a, 0)).toBeCloseTo(2200, 5);
    // the start is 2200 m back from the post, measured round the loop
    expect(startOf(outer, 2200).s).toBeCloseTo(2 * outer.length - 2200, 5);
    // 2200 m on the outer course: past the post once, round all four turns
    expect(cornersRun(outer, 2200)).toBe(4);
    const facts = courseFacts(outer, 2200);
    expect(facts).toMatchObject({ corners: 4, height: 4.3, home: 403.7 });
    expect(facts.back).toBeGreaterThan(300);
  });
  it("the hill stays between 0 and the course's height difference", () => {
    for (let s = 0; s < outer.length; s += 37) {
      const h = heightAt(outer, s);
      expect(h).toBeGreaterThanOrEqual(-0.01);
      expect(h).toBeLessThanOrEqual(outer.height + 0.01);
    }
  });
});

describe("runner intro and starting gate", () => {
  it("goes in gate order without scratched horses", () => {
    const race = r11();
    const list = introRunners(race);
    expect(list.some((h) => h.scratched)).toBe(false);
    expect(list.map((h) => stallOf(race, h))).toEqual([...list.map((h) => stallOf(race, h))].sort((a, b) => a - b));
    const manual = { ...race, style: { ...race.style, autoDraw: false }, runners: race.runners.map((h) => ({ ...h, draw: 19 - h.number })) };
    expect(introRunners(manual)[0].number).toBe(18);
  });
  it("splits the gate into pages", () => {
    const race = r11();
    race.intro.grid.perPage = 6;
    race.intro.grid.page = 2;
    const p = gridPage(race);
    expect(p.pageCount).toBe(3);
    expect(p.rows).toHaveLength(introRunners(race).length - 12);
  });
  it("writes the pedigree as SIRE × DAM (by BMS)", () => {
    expect(pedigreeLines({ sire: "Epiphaneia", dam: "April Mist", bms: "Deep Impact" })).toEqual({ cross: "Epiphaneia × April Mist", bms: "by Deep Impact" });
    expect(pedigreeLines({ sire: "", dam: "", bms: "" })).toEqual({ cross: "", bms: "" });
    expect(pedigreeLines(undefined)).toEqual({ cross: "", bms: "" });
  });
});

describe("history video", () => {
  it("plays until its length (plus the fade) has passed", () => {
    const race = r11();
    race.intro.history.items[0] = { ...race.intro.history.items[0], video: "video/20261107120000000.webm", duration: 6 };
    race.intro.history.play = { id: race.intro.history.items[0].id, at: 1000 };
    expect(playingItem(race, 1000 + 5000)?.id).toBe(race.intro.history.items[0].id);
    expect(playingItem(race, 1000 + 9000)).toBeNull();
    race.intro.history.items[0].video = null;
    expect(playingItem(race, 2000)).toBeNull();
  });
  it("videos and jockey photos are stored pictures too", () => {
    const d = sampleData();
    const v = videoName({ name: "clip.MP4" }, new Date(2026, 10, 7, 12, 0, 0, 0).getTime());
    expect(v).toBe("video/20261107120000000.mp4");
    expect(isImageName(v)).toBe(true);
    d.races[1].intro.history.items[0].video = v;
    d.jockeys = [{ id: "j1", name: "A. Sample", country: "JP", photo: "image/20261107120000001.png" }];
    expect(imageRefs(d)).toEqual(expect.arrayContaining([v, "image/20261107120000001.png"]));
    const gone = mapImageRefs(d, () => null);
    expect(gone.races[1].intro.history.items[0].video).toBeNull();
    expect(gone.jockeys[0].photo).toBeNull();
  });
});

describe("weather", () => {
  it("maps WMO codes to the intro's words", () => {
    expect([0, 2, 3, 45, 53, 63, 81, 73, 95].map(weatherOfCode)).toEqual(["sunny", "partly", "cloudy", "fog", "drizzle", "rain", "rain", "snow", "storm"]);
  });
  it("post times are Thai time", () => {
    expect(postInstant("2026-11-15", "13:40").toISOString()).toBe("2026-11-15T06:40:00.000Z");
    expect(postInstant("2026-11-15", "").toISOString()).toBe("2026-11-15T05:00:00.000Z");
  });
  it("reads the forecast hour at post time", async () => {
    const hours = Array.from({ length: 24 }, (_, i) => `2026-11-15T${String(i).padStart(2, "0")}:00`);
    let url = "";
    const fake = (async (u: string) => {
      url = u;
      return new Response(JSON.stringify({ hourly: { time: hours, temperature_2m: hours.map((_, i) => i), weather_code: hours.map((_, i) => (i === 6 ? 61 : 0)), wind_speed_10m: hours.map(() => 3.25) } }));
    }) as unknown as typeof fetch;
    const f = await fetchForecast(34.9, 135.7, "2026-11-15", "13:40", fake);
    expect(url).toContain("start_date=2026-11-15");
    expect(f).toEqual({ condition: "rain", tempC: 6, windMs: 3.3 });
  });
});

describe("files with the intro", () => {
  it("parses intro scenes in Active", () => {
    expect(parseActive(introOf("course", "r1"))).toEqual({ view: "course", raceId: "r1" });
    expect(parseActive("grid:abc")).toEqual({ view: "grid", raceId: "abc" });
    expect(parseActive("runner:abc").view).toBe("runner");
  });
  it("a compact file (no intro) gets the intro defaults", () => {
    const res = parseFile(read("docs/example-race.json"));
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.data.races[0].intro.course).toMatchObject({ globe: true, path: true, venue: null });
    expect(res.data.races[0].intro.grid.perPage).toBe(18);
    expect(res.data.jockeys).toEqual([]);
  });
  it("the QE II Cup file has the field, pedigrees, records and history", () => {
    const res = parseFile(read("docs/qe2-cup-2026.json"));
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    const race = res.data.races[0];
    expect(race).toMatchObject({ name: "Queen Elizabeth II Cup", course: "Kyoto", distanceM: 2200, postTime: "13:40", grade: "G1" });
    expect(courseOf(race as never)?.track.id).toBe("turf-outer");
    expect(race.intro.records.course).toMatchObject({ time: "2:09.7", horse: "Neptunite" });
    expect(race.intro.records.race).toMatchObject({ time: "2:11.0", horse: "Regaleira" });
    expect(race.intro.history.items.length).toBeGreaterThan(3);
    expect(res.data.horses.every((h) => h.sire && h.dam && h.bms)).toBe(true);
    expect(race.runners.every((r) => res.data.horses.some((h) => h.name === r.name))).toBe(true);
  });
  it("jockeys merge by name and go out with the file", () => {
    const cur: AppData = { ...sampleData(), jockeys: [{ id: "a", name: "C. Lemaire", country: "FR", photo: "image/20261107120000000.png" }] };
    const merged = mergeImport(cur, { version: 1, races: [], horses: [], jockeys: [{ name: "c.lemaire", country: "FR", photo: null }, { name: "K.Ogino", country: "JP", photo: null }] } as never, "append");
    expect(merged.jockeys).toHaveLength(2);
    expect(merged.jockeys[0].id).toBe("a");
    expect(exportFile(merged).jockeys).toHaveLength(2);
  });
});
