import { describe, expect, it } from "vitest";
import { careerPage, silksModeOf, earningsIn, horsePageKinds, horsePages, sexText, HorseSchema, moneyText, newHorseSettings, posText, recordFromRaces, recordText, type Horse } from "../../src/lib/horses";
import { activeExists, exportHorse, horseOf, mergeImport, parseActive, parseFile } from "../../src/lib/model";
import { sampleData, sampleHorse } from "../../src/lib/sample";

const horse = (o: Record<string, unknown> = {}): Horse => ({ ...HorseSchema.parse({ name: "Test", ...o }), id: "h1" });
const race = (date: string, finish: number | null, extra = {}) => ({ date, name: `R ${date}`, finish, ...extra });

describe("horse profile", () => {
  it("record text counts the unplaced runs", () => {
    expect(recordText({ starts: 12, first: 5, second: 3, third: 1 })).toBe("12 (5-3-1-3)");
    expect(recordText({ starts: 0, first: 0, second: 0, third: 0 })).toBe("0 (0-0-0-0)");
  });
  it("record can be counted from the races", () => {
    const h = horse({ races: [race("2026-01-01", 1), race("2026-02-01", 3), race("2026-03-01", 1), race("2026-04-01", null, { outcome: "dnf" })] });
    expect(recordFromRaces(h)).toEqual({ starts: 4, first: 2, second: 0, third: 1 });
  });
  it("pages: the profile, then 7 races a page newest first", () => {
    const races = Array.from({ length: 9 }, (_, i) => race(`2026-0${i + 1}-01`, i + 1));
    const h = horse({ races });
    expect(horsePages(h)).toBe(3);
    expect(careerPage(h, 0)).toEqual([]);
    expect(careerPage(h, 1).map((r) => r.date)[0]).toBe("2026-09-01");
    expect(careerPage(h, 1)).toHaveLength(7);
    expect(careerPage(h, 2).map((r) => r.date)).toEqual(["2026-02-01", "2026-01-01"]);
    expect(horsePages(horse())).toBe(1);
  });
  it("a horse with a sire or dam gets the pedigree page after the profile", () => {
    const h = horse({ sire: "S", races: Array.from({ length: 8 }, (_, i) => race(`2026-0${i + 1}-01`, 1)) });
    expect(horsePageKinds(h).map((k) => k.kind)).toEqual(["profile", "pedigree", "races", "races"]);
    expect(careerPage(h, 1)).toEqual([]);
    expect(careerPage(h, 2)).toHaveLength(7);
    expect(careerPage(h, 3)).toHaveLength(1);
  });
  it("sex text by age", () => {
    const now = new Date("2026-11-05");
    expect(sexText({ sex: "M", foaled: "2022-03-14" }, now)).toBe("COLT");
    expect(sexText({ sex: "M", foaled: "2021-03-14" }, now)).toBe("HORSE");
    expect(sexText({ sex: "F", foaled: "2023-01-01" }, now)).toBe("FILLY");
    expect(sexText({ sex: "F", foaled: "2020-01-01" }, now)).toBe("MARE");
    expect(sexText({ sex: "G", foaled: "" }, now)).toBe("GELDING");
    expect(sexText({ sex: null, foaled: "" }, now)).toBe("");
  });
  it("silks mode: the drawn pattern when silks are set, unless chosen", () => {
    expect(silksModeOf(horse())).toBe("none");
    expect(silksModeOf(horse({ silks: {} }))).toBe("pattern");
    expect(silksModeOf(horse({ silks: {}, silksMode: "upload" }))).toBe("upload");
  });
  it("position text", () => {
    const [a, b, c] = horse({ races: [race("2026-01-01", 1, { field: 18 }), race("2026-01-02", null, { outcome: "dq" }), race("2026-01-03", null)] }).races;
    expect([posText(a), posText(b), posText(c)]).toEqual(["1/18", "DQ", "–"]);
  });
  it("prize money in the horse's own currency or converted", () => {
    const h = horse({ earnings: 1_000_000, currency: "JPY" });
    const s = newHorseSettings();
    expect(earningsIn(h, s)).toEqual({ amount: 1_000_000, currency: "JPY", converted: false });
    const usd = earningsIn(h, { ...s, currency: "USD", rates: { JPY: 0.01 } })!;
    expect(usd).toEqual({ amount: 10_000, currency: "USD", converted: true });
    expect(moneyText(usd.amount, usd.currency)).toBe("$10,000");
    expect(earningsIn(horse(), s)).toBeNull();
  });
});

describe("horses in the data", () => {
  it("Active can point at a horse", () => {
    expect(parseActive(horseOf("h1"))).toEqual({ view: "horse", horseId: "h1" });
    expect(activeExists(horseOf("h1"), [], [{ id: "h1" }])).toBe(true);
    expect(activeExists(horseOf("gone"), [], [{ id: "h1" }])).toBe(false);
  });
  it("a file with only horses imports; append replaces a horse with the same name", () => {
    const res = parseFile(JSON.stringify({ horses: [{ name: "sample star", earnings: 5, currency: "USD" }, { name: "Other" }] }));
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    const cur = sampleData();
    const next = mergeImport(cur, res.data, "append");
    expect(next.horses.map((h) => h.name)).toEqual(["sample star", "Other"]);
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
    const res = parseFile(JSON.stringify(exportHorse(d, sampleHorse().id)));
    expect(res.ok).toBe(true);
    if (res.ok) expect(res.data.horses[0]).toMatchObject({ name: "Sample Star", races: d.horses[0].races });
  });
});
