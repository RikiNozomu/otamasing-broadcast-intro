import { describe, expect, it } from "vitest";
import { silksModeOf, HorseSchema, type Horse } from "../../src/lib/horses";
import { activeExists, exportHorse, mergeImport, parseActive, parseFile } from "../../src/lib/model";
import { sampleData } from "../../src/lib/sample";

const horse = (o: Record<string, unknown> = {}): Horse => ({ ...HorseSchema.parse({ name: "Test", ...o }), id: "h1" });
const race = (date: string, finish: number | null, extra = {}) => ({ date, name: `R ${date}`, finish, ...extra });

describe("horses", () => {
  it("silks mode: the drawn pattern when silks are set, unless chosen", () => {
    expect(silksModeOf(horse())).toBe("none");
    expect(silksModeOf(horse({ silks: {} }))).toBe("pattern");
    expect(silksModeOf(horse({ silks: {}, silksMode: "upload" }))).toBe("upload");
  });
  it("a horse's whole profile (facts, career, prize money) is kept for broadcast compact", () => {
    const h = horse({ owner: "O", earnings: 5, currency: "USD", races: [race("2026-01-01", 1, { field: 18 })], record: { starts: 1, first: 1, second: 0, third: 0 } });
    const res = parseFile(JSON.stringify({ horses: [h] }));
    expect(res.ok).toBe(true);
    if (res.ok) expect(res.data.horses[0]).toMatchObject({ owner: "O", earnings: 5, currency: "USD", record: h.record, races: [{ date: "2026-01-01", finish: 1, field: 18 }] });
  });
});

describe("horses in the data", () => {
  it("compact's horse profile on Active opens here as the blank screen", () => {
    expect(parseActive("horse:h1")).toEqual({ view: "blank" });
    expect(activeExists("horse:h1", [])).toBe(true);
  });
  it("a file with only horses imports; append replaces a horse with the same name", () => {
    const res = parseFile(JSON.stringify({ horses: [{ name: "morning gallop", earnings: 5, currency: "USD" }, { name: "Other" }] }));
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    const cur = sampleData();
    const next = mergeImport(cur, res.data, "append");
    expect(next.horses.map((h) => h.name)).toEqual(["morning gallop", ...cur.horses.slice(1).map((h) => h.name), "Other"]);
    expect(next.horses[0].id).toBe(cur.horses[0].id);
    expect(next.races).toHaveLength(cur.races.length);
  });
  it("replace only swaps what the file holds", () => {
    const cur = sampleData();
    const races = parseFile(JSON.stringify({ races: [{ date: "2026-12-06", name: "Only", round: "1R", runners: [{ number: 1, name: "A" }, { number: 2, name: "B" }] }] }));
    const horses = parseFile(JSON.stringify({ horses: [{ name: "Solo" }] }));
    if (!races.ok || !horses.ok) throw new Error("bad file");
    const a = mergeImport(cur, races.data, "replace");
    expect(a.races.map((r) => r.name)).toEqual(["Only"]);
    expect(a.horses).toEqual(cur.horses);
    const b = mergeImport(cur, horses.data, "replace");
    expect(b.horses.map((h) => h.name)).toEqual(["Solo"]);
    expect(b.races).toEqual(cur.races);
  });
  it("an empty file is still refused", () => {
    expect(parseFile(JSON.stringify({ races: [], horses: [] })).ok).toBe(false);
  });
  it("one horse exports and imports back the same", () => {
    const d = sampleData();
    const res = parseFile(JSON.stringify(exportHorse(d, d.horses[0].id)));
    expect(res.ok).toBe(true);
    if (res.ok) expect(res.data.horses[0]).toMatchObject({ name: d.horses[0].name, sire: d.horses[0].sire, silks: d.horses[0].silks });
  });
});
