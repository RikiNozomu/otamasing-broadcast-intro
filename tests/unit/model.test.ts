import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { activeExists, exportFile, mergeImport, parseActive, parseFile, type AppData } from "../../src/lib/model";
import { sampleData } from "../../src/lib/sample";
import { buildSchema } from "../../scripts/build-schema";

const read = (p: string) => readFileSync(new URL(`../../${p}`, import.meta.url), "utf8");

describe("parseFile", () => {
  it("accepts the documented example and fills defaults", () => {
    const res = parseFile(read("docs/example-race.json"));
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    const [a, b] = res.data.races;
    expect(a.style.drawScheme).toBe("jra");
    expect(a.runners[0]).toMatchObject({ draw: null, scratched: false });
    expect(a.runners[3].scratched).toBe(true);
    expect(b.style.show.draw).toBe(false);
    expect(b.style.show.fav).toBe(true);
  });
  it("accepts a bare array of races", () => {
    const res = parseFile(JSON.stringify([{ date: "2026-01-01", name: "X", runners: [{ number: 1 }, { number: 2 }] }]));
    expect(res.ok).toBe(true);
  });
  it("rejects broken files with a readable message", () => {
    expect(parseFile("{")).toEqual({ ok: false, error: "ไฟล์ไม่ใช่ JSON ที่ถูกต้อง" });
    const noName = parseFile(JSON.stringify({ races: [{ date: "2026-01-01", runners: [{ number: 1 }, { number: 2 }] }] }));
    expect(noName.ok).toBe(false);
    const dup = parseFile(JSON.stringify({ races: [{ date: "2026-01-01", name: "X", runners: [{ number: 1 }, { number: 1 }] }] }));
    expect(dup).toMatchObject({ ok: false });
    if (!dup.ok) expect(dup.error).toContain("ซ้ำ");
    const one = parseFile(JSON.stringify({ races: [{ date: "2026-01-01", name: "X", runners: [{ number: 1 }] }] }));
    expect(one.ok).toBe(false);
    const flag = parseFile(JSON.stringify({ races: [{ date: "2026-01-01", name: "X", runners: [{ number: 1, horseCountry: "jpn" }, { number: 2 }] }] }));
    expect(flag.ok).toBe(false);
  });
});

describe("mergeImport", () => {
  const cur: AppData = sampleData();
  // the sample's 11R is at Kyoto, the others at Tokyo
  const file = (round: string, name: string, course = round === "11R" ? "kyoto" : "tokyo") => {
    const r = parseFile(JSON.stringify({ races: [{ date: "2026-11-29", course, round, name, runners: [{ number: 1 }, { number: 2 }] }] }));
    if (!r.ok) throw new Error(r.error);
    return r.data;
  };
  it("append replaces a race with the same date + course + round and keeps its id", () => {
    const next = mergeImport(cur, file("11R", "Renamed"), "append");
    expect(next.races).toHaveLength(3);
    const r = next.races.find((x) => x.round === "11R")!;
    expect(r.name).toBe("Renamed");
    expect(r.id).toBe("sample-11");
  });
  it("after an import the screen goes blank", () => {
    expect(mergeImport(cur, file("11R", "Renamed"), "append").active).toBe("blank");
    expect(mergeImport({ ...cur, active: "blank" }, file("9R", "New"), "append").active).toBe("blank");
    expect(mergeImport({ ...cur, active: "course:sample-11" }, file("1R", "Only"), "replace").active).toBe("blank");
  });
  it("Active is blank or one of a race's intro scenes; broadcast compact's screens open as blank", () => {
    expect(parseActive("runner:sample-11")).toEqual({ view: "runner", raceId: "sample-11" });
    expect(parseActive("grid:a:b")).toEqual({ view: "grid", raceId: "a:b" });
    for (const v of ["blank", "home", "sample-11", "sample-11:result", "horse:h1", ""]) expect(parseActive(v)).toEqual({ view: "blank" });
    expect(activeExists("course:sample-11", cur.races)).toBe(true);
    expect(activeExists("course:gone", cur.races)).toBe(false);
  });
  it("append adds new races at the end", () => {
    const next = mergeImport(cur, file("9R", "New"), "append");
    expect(next.races.map((x) => x.round)).toEqual(["10R", "11R", "12R", "9R"]);
  });
  it("replace swaps the whole list", () => {
    const next = mergeImport(cur, file("1R", "Only"), "replace");
    expect(next.races).toHaveLength(1);
    expect(next.active).toBe("blank");
  });
  it("an export imports back to the same races", () => {
    const res = parseFile(JSON.stringify(exportFile(cur)));
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    const next = mergeImport({ ...cur, races: [] }, res.data, "replace");
    expect(next.races).toEqual(cur.races);
    expect(next.home).toEqual(cur.home);
  });
});

describe("files from broadcast compact", () => {
  it("keep their racecard, result and home page settings through an import and an export", () => {
    const compact = {
      races: [{
        date: "2026-11-29", course: "Kyoto", round: "11R", name: "X", highlight: 2, class: "3YO",
        card: { page: 1, auto: true, seconds: 9 }, result: { page: 1, locked: [2] },
        runners: [{ number: 1, name: "A", fav: 2, finish: 2, time: "1:33.0" }, { number: 2, name: "B", fav: 1, finish: 1, time: "1:32.9", margin: "1/2" }],
      }],
      horses: [{ name: "A", owner: "O", races: [{ date: "2026-10-01", name: "Prep", finish: 1 }] }],
      home: { title: "Kyoto Races", subtitle: "2026.11.29", page: 1, showDate: false },
    };
    const res = parseFile(JSON.stringify(compact));
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    const next = mergeImport({ ...sampleData(), races: [], horses: [] }, res.data, "replace");
    const out = JSON.parse(JSON.stringify(exportFile(next)));
    expect(out.races[0]).toMatchObject({ highlight: 2, class: "3YO", card: { page: 1, auto: true, seconds: 9 }, result: { page: 1, locked: [2] } });
    expect(out.races[0].runners[1]).toMatchObject({ fav: 1, finish: 1, time: "1:32.9", margin: "1/2" });
    expect(out.horses[0]).toMatchObject({ owner: "O", races: [{ name: "Prep", finish: 1 }] });
    expect(out.home).toMatchObject({ title: "Kyoto Races", subtitle: "2026.11.29", page: 1, showDate: false });
  });
});

describe("JSON schema", () => {
  it("schema/race.schema.json is up to date (run npm run schema)", () => {
    expect(read("schema/race.schema.json")).toBe(buildSchema());
  });
});
