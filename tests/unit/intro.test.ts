import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { introOf, mergeImport, parseActive, parseFile, exportFile, type AppData } from "../../src/lib/model";
import { sampleData } from "../../src/lib/sample";
import { gridPage, introRunners, pedigreeLines, playingItem, postInstant, stallOf, weatherOfCode, fetchForecast } from "../../src/lib/intro";
import { courseFacts, courseOf, cornersRun, heightAt, racePieces, startOf, VENUES } from "../../src/lib/venues";
import { imageRefs, mapImageRefs, isImageName, videoName } from "../../src/lib/imageRefs";
import { failureOf, videoStatusText } from "../../src/lib/videoStatus";

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
  it("Kyoto's 1600 m and 1800 m on the outer course start up the chute behind the 2nd corner", () => {
    const join = outer.chute!.join;
    const st = startOf(outer, 1600);
    expect(st.chute).toBeCloseTo(join - (outer.length - 1600), 5);
    const pieces = racePieces(outer, 1600);
    expect(pieces[0][0]).toBeCloseTo(join, 5);
    expect(st.chute + pieces.reduce((t, [a, b]) => t + b - a, 0)).toBeCloseTo(1600, 5);
    // the chute runs straight into the back straight: only the 3rd and 4th corners
    expect(cornersRun(outer, 1600)).toBe(2);
    expect(startOf(outer, 1800).chute).toBeGreaterThan(400);
    // 2200 m starts on the home straight; the dirt course has no chute
    expect(startOf(outer, 2200).chute).toBe(0);
    expect(startOf(kyoto.tracks.find((t) => t.id === "dirt")!, 1800).chute).toBe(0);
  });
  it("the hill stays between 0 and the course's height difference", () => {
    for (let s = 0; s < outer.length; s += 37) {
      const h = heightAt(outer, s);
      expect(h).toBeGreaterThanOrEqual(-0.01);
      expect(h).toBeLessThanOrEqual(outer.height + 0.01);
    }
  });
  it("the outer course's hill follows JRA's undulation chart: top early in the 3rd corner, down through it, a dip in the home straight", () => {
    const c3 = outer.sections.find((x) => x.id === "c3")!, back = outer.sections.find((x) => x.id === "back")!;
    let top = 0;
    for (let s = 0; s < outer.length; s += 2) if (heightAt(outer, s) > heightAt(outer, top)) top = s;
    expect(top).toBeGreaterThan(c3.from);
    expect(top).toBeLessThan(c3.from + (c3.to - c3.from) / 3);
    expect(heightAt(outer, top)).toBeCloseTo(4.3, 1);
    // flat for the first part of the back straight, about half-way up by the start of the 3rd corner
    expect(heightAt(outer, back.from + 100)).toBeLessThan(0.5);
    expect(heightAt(outer, c3.from)).toBeGreaterThan(2.5);
    expect(heightAt(outer, c3.to)).toBeLessThan(1);
    expect(heightAt(outer, outer.length - 300)).toBeLessThan(heightAt(outer, 0));
  });
});

describe("every Japanese G1 / JpnI course", () => {
  const venue = (id: string) => VENUES.find((v) => v.id === id)!;
  const track = (v: string, t: string) => venue(v).tracks.find((x) => x.id === t)!;
  const find = (course: string, surface: "Turf" | "Dirt", distanceM: number | null = null) => {
    const race = r11();
    return courseOf({ ...race, course, surface, distanceM, intro: { ...race.intro, course: { ...race.intro.course, venue: null, track: null } } });
  };
  const run = (t: ReturnType<typeof track>, d: number) => startOf(t, d).chute + racePieces(t, d).reduce((a, [x, y]) => a + y - x, 0);

  it("has the JRA courses with G1s and the NAR courses with JpnIs", () => {
    expect(VENUES.map((v) => v.id).sort()).toEqual(
      ["chukyo", "funabashi", "hanshin", "kanazawa", "kawasaki", "kyoto", "morioka", "nakayama", "ohi", "tokyo", "urawa"]);
    expect(venue("tokyo").direction).toBe("left");
    expect(venue("nakayama").direction).toBe("right");
    expect(venue("ohi").direction).toBe("right");
    expect(venue("kawasaki").direction).toBe("left");
    expect(venue("kanazawa").direction).toBe("right");
  });
  it("every track: home, back and four corners in running order from the post, a hill within the height difference", () => {
    for (const v of VENUES) for (const t of v.tracks) {
      const ids = t.sections.map((x) => x.id);
      expect(ids, `${v.id} ${t.id}`).toEqual(["home", "c1", "c2", "back", "c3", "c4"]);
      for (let i = 1; i < t.sections.length; i++) expect(t.sections[i].from).toBeCloseTo(t.sections[i - 1].to, 1);
      // the home straight runs through the post and is the official length up to it
      const home = t.sections[0];
      expect(home.from, `${v.id} ${t.id}`).toBeCloseTo(-t.homestretch, -1);
      expect(home.to).toBeGreaterThanOrEqual(0);
      expect(t.sections[5].to - t.length).toBeCloseTo(home.from, 1);
      for (let s = 0; s < t.length; s += 25) {
        const h = heightAt(t, s);
        expect(h).toBeGreaterThanOrEqual(-0.01);
        expect(h).toBeLessThanOrEqual(t.height + 0.01);
      }
      for (const d of [1200, 1600, 2000, 2400]) expect(run(t, d), `${v.id} ${t.id} ${d}`).toBeCloseTo(d, 5);
    }
  });
  it("finds the venue by the names race cards use; Tokyo is never Tokyo City Keiba", () => {
    expect(find("Tokyo", "Turf")?.venue.id).toBe("tokyo");
    expect(find("Tokyo Racecourse", "Dirt")?.venue.id).toBe("tokyo");
    for (const n of ["Oi", "Ohi", "TCK", "Tokyo City Keiba", "Ohi Racecourse"]) expect(find(n, "Dirt")?.venue.id, n).toBe("ohi");
    for (const n of ["Nakayama", "Hanshin", "Chukyo", "Kawasaki", "Funabashi", "Urawa", "Morioka", "Kanazawa"]) {
      expect(find(n, "Dirt")?.venue.id, n).toBe(n.toLowerCase());
    }
  });
  it("picks the inner or outer course by the race's distance", () => {
    expect(find("Nakayama", "Turf", 2000)?.track.id).toBe("turf-inner"); // Satsuki Sho
    expect(find("Nakayama", "Turf", 2500)?.track.id).toBe("turf-inner"); // Arima Kinen
    expect(find("Nakayama", "Turf", 1200)?.track.id).toBe("turf-outer"); // Sprinters Stakes
    expect(find("Hanshin", "Turf", 1600)?.track.id).toBe("turf-outer"); // Oka Sho
    expect(find("Hanshin", "Turf", 2200)?.track.id).toBe("turf-inner"); // Takarazuka Kinen
    expect(find("Kyoto", "Turf", 1600)?.track.id).toBe("turf-outer"); // Mile Championship
    expect(find("Kyoto", "Turf", 2000)?.track.id).toBe("turf-inner"); // Shuka Sho
    expect(find("Oi", "Dirt", 2000)?.track.id).toBe("outer"); // Tokyo Daishoten
    expect(find("Funabashi", "Dirt", 1600)?.track.id).toBe("outer"); // Kashiwa Kinen
    expect(find("Morioka", "Turf", 1600)?.track.id).toBe("turf");
  });
  it("starts up the chute where the race does", () => {
    // Tokyo: the February Stakes (dirt 1600) starts on the turf behind the 2nd corner; turf 1600 / 1800 up the same
    // spur, the Tenno Sho (Autumn) 2000 on the loop by the 1st corner
    for (const [t, d] of [["dirt", 1600], ["turf", 1600], ["turf", 1800]] as const) expect(startOf(track("tokyo", t), d).chute, `${t} ${d}`).toBeGreaterThan(0);
    expect(startOf(track("tokyo", "turf"), 2000).chute).toBe(0);
    expect(cornersRun(track("tokyo", "dirt"), 1600)).toBe(2);
    // Morioka's mile (Mile Championship Nambu Hai) is as long as the lap: from the far end of the chute, no lap
    const m = track("morioka", "dirt");
    expect(startOf(m, 1600)).toMatchObject({ laps: 0 });
    expect(startOf(m, 1600).chute).toBeCloseTo(1600 - (m.length - m.chute!.join), 5);
    expect(startOf(m, 1600).chute).toBeLessThanOrEqual(m.chute!.length * 1.05);
    expect(cornersRun(m, 1600)).toBe(2);
    // Kawasaki 1600 (Zen-Nippon Nisai Yushun): 100 m up the chute behind the 4th corner, then a whole lap
    expect(startOf(track("kawasaki", "dirt"), 1600).chute).toBeCloseTo(100, 0);
    expect(cornersRun(track("kawasaki", "dirt"), 1600)).toBe(4);
    // Kawasaki Kinen (2100): from the start of the back straight, six corners
    expect(cornersRun(track("kawasaki", "dirt"), 2100)).toBe(6);
  });
  it("a flat course says FLAT, not 0 m", () => {
    expect(courseFacts(track("ohi", "outer"), 2000).height).toBe(0);
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

describe("the screen's word on a history video", () => {
  const play = { id: "h1", at: 1_000_000 };
  it("sorts failures into files the browser can't open and the rest", () => {
    expect(failureOf({ code: 4, message: "DEMUXER_ERROR_NO_SUPPORTED_STREAMS" })).toMatchObject({ state: "unsupported" });
    expect(failureOf({ name: "NotSupportedError" }).state).toBe("unsupported");
    expect(failureOf({ name: "NotAllowedError", message: "no gesture" })).toEqual({ state: "failed", detail: "NotAllowedError · no gesture" });
    expect(failureOf(null).state).toBe("failed");
  });
  it("says what the overlay reported for this play, or that it hasn't answered", () => {
    expect(videoStatusText(null, null)).toBeNull();
    expect(videoStatusText(null, play, play.at + 1000)).toMatchObject({ bad: false });
    // nothing from the screen after a few seconds, or only about an older play
    expect(videoStatusText(null, play, play.at + 5000)).toMatchObject({ bad: true, text: expect.stringContaining("จอยังไม่ตอบ") });
    expect(videoStatusText({ ...play, at: 1, state: "playing", t: 3 }, play, play.at + 5000)?.text).toContain("จอยังไม่ตอบ");
    expect(videoStatusText({ ...play, state: "playing", t: 72.4 }, play)).toEqual({ text: "จอ: เล่นอยู่ 1:12", bad: false });
    expect(videoStatusText({ ...play, state: "unsupported", t: 0, detail: "code 4" }, play)).toMatchObject({ bad: true, text: expect.stringContaining("HEVC") });
    expect(videoStatusText({ ...play, state: "missing", t: 0 }, play)?.bad).toBe(true);
    expect(videoStatusText({ ...play, state: "muted", t: 1 }, play)?.text).toContain("ไม่มีเสียง");
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
    // the hill is raised 5× by default: Kyoto's 3–4 m reads as a low rise, not a mountain
    expect(res.data.races[0].intro.course).toMatchObject({ globe: true, path: true, venue: null, elevation: false, elevationScale: 5 });
    expect(res.data.races[0].intro.grid.perPage).toBe(18);
    expect(res.data.jockeys).toEqual([]);
  });
  it("the Mile Championship file has the field, pedigrees, records and history", () => {
    const res = parseFile(read("docs/mile-cs-2026.json"));
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    const race = res.data.races[0];
    expect(race).toMatchObject({ name: "Mile Championship", course: "Kyoto", distanceM: 1600, postTime: "13:40", grade: "G1" });
    const course = courseOf(race as never);
    expect(course?.track.id).toBe("turf-outer");
    // from the chute behind the 2nd corner, round the 3rd and 4th
    expect(startOf(course!.track, race.distanceM!).chute).toBeGreaterThan(200);
    expect(courseFacts(course!.track, race.distanceM).corners).toBe(2);
    expect(race.intro.records.course).toMatchObject({ time: "1:31.3", horse: "Sungrazer" });
    expect(race.intro.records.race).toMatchObject({ time: "1:31.3", horse: "Jantar Mantar" });
    expect(race.intro.history.items.length).toBeGreaterThan(3);
    expect(res.data.horses.every((h) => h.sire && h.dam && h.bms)).toBe(true);
    expect(race.runners.every((r) => res.data.horses.some((h) => h.name === r.name))).toBe(true);
    // trained in France
    expect(race.runners.find((r) => r.name === "Erdenali")).toMatchObject({ horseCountry: "FR", jockeyCountry: "FR" });
  });
  it("jockeys merge by name and go out with the file", () => {
    const cur: AppData = { ...sampleData(), jockeys: [{ id: "a", name: "C. Lemaire", country: "FR", photo: "image/20261107120000000.png" }] };
    const merged = mergeImport(cur, { version: 1, races: [], horses: [], jockeys: [{ name: "c.lemaire", country: "FR", photo: null }, { name: "K.Ogino", country: "JP", photo: null }] } as never, "append");
    expect(merged.jockeys).toHaveLength(2);
    expect(merged.jockeys[0].id).toBe("a");
    expect(exportFile(merged).jockeys).toHaveLength(2);
  });
});
