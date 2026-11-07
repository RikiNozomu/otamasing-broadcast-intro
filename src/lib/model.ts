/**
 * Data model and the JSON file format (docs/race-json.md, schema/race.schema.json).
 * Everything the dock edits lives in one AppData object in localStorage; pictures live in IndexedDB.
 * The import schema fills defaults, so a hand-written file only needs the race facts and runners.
 */
import { z } from "zod";
import { HorseSchema, HorseSettingsSchema, type Horse, type HorseSettings } from "./horseSchema.ts";

export const MAX_RUNNERS = 30;
export const MIN_RUNNERS = 2;

export const SCHEMES = ["jra", "us", "plain", "custom"] as const;
export type Scheme = (typeof SCHEMES)[number];
export const TRANSITIONS = ["wipe", "slide", "fade", "none"] as const;
export type Transition = (typeof TRANSITIONS)[number];
export const GRADES = ["G1", "G2", "G3", "L"] as const;
export type Grade = (typeof GRADES)[number];
/** Race class pills: label and colour (blue for age, pink for fillies/mares). */
export const CLASSES = {
  "2YO": { label: "2YO", color: "#3F5AB0" },
  "2YO_F": { label: "2YO", color: "#DF6FA3" },
  "3YO": { label: "3YO", color: "#3F5AB0" },
  FM: { label: "F&M", color: "#DF6FA3" },
} as const;
export type RaceClass = keyof typeof CLASSES;
export const SURFACES = ["Turf", "Dirt", "Jump"] as const;
export const OUTCOMES = ["dnf", "dq"] as const;
export type Outcome = (typeof OUTCOMES)[number];

const hex = z.string().regex(/^#[0-9A-Fa-f]{6}$/, "สีต้องเป็น #RRGGBB");
/** ISO 3166 alpha-2 code ("JP", "GB"...) or "" for no flag. */
const country = z.union([z.string().regex(/^[A-Z]{2}$/, "รหัสประเทศต้องเป็นตัวพิมพ์ใหญ่ 2 ตัว เช่น JP"), z.literal("")]);

export const RunnerSchema = z.object({
  number: z.number().int().min(1).max(MAX_RUNNERS),
  draw: z.number().int().min(1).max(MAX_RUNNERS).nullable().default(null),
  name: z.string().default(""),
  jockey: z.string().default(""),
  horseCountry: country.default(""),
  jockeyCountry: country.default(""),
  fav: z.number().int().min(1).max(MAX_RUNNERS).nullable().default(null),
  /** The horse's body weight in kg (e.g. 486) and its change since the last race (e.g. +4), shown on the racecard. */
  horseWeight: z.number().int().min(200).max(800).nullable().default(null),
  horseWeightChange: z.number().int().min(-99).max(99).nullable().default(null),
  /** Weight carried (the jockey's weight) in kg, e.g. 57 or 57.5. */
  weight: z.number().min(30).max(80).multipleOf(0.5).nullable().default(null),
  scratched: z.boolean().default(false),
  /** Result: finishing position (null = no result yet), time and margin as written, e.g. "1:56.7", "1¼", "nk". */
  finish: z.number().int().min(1).max(MAX_RUNNERS).nullable().default(null),
  /** Result for a horse with no position: did not finish or disqualified. (A scratched horse shows as SCR on its own.) */
  outcome: z.enum(OUTCOMES).nullable().default(null),
  time: z.string().default(""),
  margin: z.string().default(""),
});
export type Runner = z.infer<typeof RunnerSchema>;

export const ShowSchema = z.object({
  draw: z.boolean().default(true),
  grade: z.boolean().default(true),
  class: z.boolean().default(true),
  fav: z.boolean().default(true),
  horseFlag: z.boolean().default(true),
  jockeyFlag: z.boolean().default(true),
  horseWeight: z.boolean().default(true),
  weight: z.boolean().default(true),
  jpName: z.boolean().default(true),
});

export const StyleSchema = z.object({
  drawScheme: z.enum(SCHEMES).default("jra"),
  numberScheme: z.enum(SCHEMES).default("plain"),
  autoDraw: z.boolean().default(true),
  gradeStyle: z.enum(["jra", "intl"]).default("jra"),
  show: ShowSchema.default({}),
  /** Custom scheme colours by number: [background, text]. Missing numbers fall back to the US colours. */
  customColors: z.record(z.string().regex(/^\d+$/), z.tuple([hex, hex])).default({}),
});
export type Style = z.infer<typeof StyleSchema>;

/** How the result page is shown: which page of finishers, and the horses (by number) locked at the top of every page. */
/**
 * How the result page is shown: `page` is the page on screen at time `since`; with `auto` the pages
 * take turns every `seconds` from there (like the picture slideshow). Locked horses stay on every page.
 */
export const ResultViewSchema = z.object({
  page: z.number().int().min(0).default(0),
  locked: z.array(z.number().int().min(1).max(MAX_RUNNERS)).default([]),
  auto: z.boolean().default(false),
  seconds: z.number().min(1).max(600).default(5),
  since: z.number().default(0),
});
export type ResultView = z.infer<typeof ResultViewSchema>;
export const newResult = (): ResultView => ResultViewSchema.parse({});

/**
 * How the racecard pages: at most 10 horses a page, `page` on screen at time `since`; with `auto`
 * the pages take turns every `seconds` (like the result page).
 */
export const CardViewSchema = z.object({
  page: z.number().int().min(0).default(0),
  auto: z.boolean().default(false),
  seconds: z.number().min(1).max(600).default(5),
  since: z.number().default(0),
});
export type CardView = z.infer<typeof CardViewSchema>;
export const newCard = (): CardView => CardViewSchema.parse({});

/**
 * The left-hand pictures of one scene (racecard or result): keys of pictures in IndexedDB, in order.
 * `index` is the picture shown at time `since`; with `auto` it moves on every `seconds` from there
 * (every page works out the same picture from the clock, so nothing has to write while it runs).
 */
export const PhotoSetSchema = z.object({
  keys: z.array(z.string()).default([]),
  index: z.number().int().min(0).default(0),
  auto: z.boolean().default(false),
  seconds: z.number().min(1).max(600).default(5),
  since: z.number().default(0),
});
export type PhotoSet = z.infer<typeof PhotoSetSchema>;
export type PhotoView = "card" | "result";

export const RaceSchema = z
  .object({
    id: z.string().min(1).optional(),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "วันที่ต้องเป็น YYYY-MM-DD"),
    course: z.string().default(""),
    round: z.string().default(""),
    postTime: z.string().default(""),
    name: z.string().min(1, "ต้องมีชื่อรายการ"),
    jpName: z.string().default(""),
    subtitle: z.string().default(""),
    grade: z.enum(GRADES).nullable().default(null),
    jump: z.boolean().default(false),
    class: z.enum(Object.keys(CLASSES) as [RaceClass, ...RaceClass[]]).nullable().default(null),
    surface: z.enum(SURFACES).default("Turf"),
    distanceM: z.number().int().positive().nullable().default(null),
    highlight: z.number().int().nullable().default(null),
    style: StyleSchema.default({}),
    result: ResultViewSchema.default({}),
    /** Racecard paging (10 horses a page). */
    card: CardViewSchema.default({}),
    /** Pictures live in the browser; the file holds their names (image/<date-time>.<ext>), order and slideshow settings. */
    photos: z.object({ card: PhotoSetSchema.default({}), result: PhotoSetSchema.default({}) }).default({}),
    runners: z.array(RunnerSchema).min(MIN_RUNNERS, `ม้าต้องมีอย่างน้อย ${MIN_RUNNERS} ตัว`).max(MAX_RUNNERS, `ม้าได้ไม่เกิน ${MAX_RUNNERS} ตัว`),
  })
  .superRefine((r, ctx) => {
    const seen = new Set<number>();
    for (const h of r.runners) {
      if (seen.has(h.number)) ctx.addIssue({ code: "custom", message: `เบอร์ ${h.number} ซ้ำ`, path: ["runners"] });
      seen.add(h.number);
    }
  });
export type RaceInput = z.input<typeof RaceSchema>;
export type Race = Omit<z.output<typeof RaceSchema>, "id"> & { id: string };

export const HomeSchema = z.object({
  title: z.string().default("Today's Races"),
  subtitle: z.string().default(""),
  highlight: z.string().nullable().default(null),
  /** Page of the race list on screen (0-based), HOME_ROWS races a page. */
  page: z.number().int().min(0).default(0),
  /** Name of the background picture stored in the browser (image/<date-time>.<ext>), or none. */
  background: z.string().nullable().default(null),
  /** Show each race's course (racecourse) in its own column. */
  showCourse: z.boolean().default(true),
  /** Show each race's date (YYYY.MM.DD) in its own column. */
  showDate: z.boolean().default(true),
});
export type Home = z.infer<typeof HomeSchema>;

/** A whole export, or a file written by hand / by Claude: `races` or `horses` (or both). */
export const FileSchema = z.object({
  version: z.literal(1).default(1),
  races: z.array(RaceSchema).default([]),
  horses: z.array(HorseSchema).default([]),
  horseSettings: HorseSettingsSchema.optional(),
  home: HomeSchema.optional(),
  active: z.string().optional(),
  transition: z.enum(TRANSITIONS).optional(),
}).refine((f) => f.races.length + f.horses.length > 0, { message: "ต้องมีอย่างน้อย 1 รายการหรือม้า 1 ตัว", path: ["races"] });
export type FileInput = z.input<typeof FileSchema>;
export type FileOutput = z.output<typeof FileSchema>;

export interface AppData {
  version: 1;
  races: Race[];
  /** Horse profiles (the ม้า tab) and their settings. */
  horses: Horse[];
  horseSettings: HorseSettings;
  /** "home" (the race list page), "blank" (nothing), a race id (its racecard), `<race id>:result` (its result page) or `horse:<id>`. */
  active: string;
  transition: Transition;
  home: Home;
  /** Bumped when a picture changes in IndexedDB, so other pages reload it. Key: "race:<id>" or "home". */
  images: Record<string, number>;
}

export const HOME = "home";
/** Active value for an empty (transparent) screen. */
export const BLANK = "blank";
const RESULT = ":result";
const HORSE = "horse:";
/** The Active value that shows a horse's profile. */
export const horseOf = (horseId: string) => HORSE + horseId;
/** The Active value that shows a race's result page. */
export const resultOf = (raceId: string) => raceId + RESULT;
/** What an Active value points at. */
export function parseActive(active: string):
  | { view: "home" | "blank"; raceId?: undefined; horseId?: undefined }
  | { view: "card" | "result"; raceId: string; horseId?: undefined }
  | { view: "horse"; raceId?: undefined; horseId: string } {
  if (active === HOME || active === BLANK) return { view: active };
  if (active.startsWith(HORSE)) return { view: "horse", horseId: active.slice(HORSE.length) };
  return active.endsWith(RESULT) ? { view: "result", raceId: active.slice(0, -RESULT.length) } : { view: "card", raceId: active };
}
/** An Active value is valid when it is home or blank, or points at a race or a horse in the lists. */
export function activeExists(active: string, races: Pick<Race, "id">[], horses: Pick<Horse, "id">[] = []): boolean {
  const a = parseActive(active);
  if (a.view === "horse") return horses.some((h) => h.id === a.horseId);
  return a.view === "home" || a.view === "blank" || races.some((r) => r.id === a.raceId);
}

export const newStyle = (): Style => StyleSchema.parse({});
export const newPhotos = (): Race["photos"] => ({ card: PhotoSetSchema.parse({}), result: PhotoSetSchema.parse({}) });

let counter = 0;
export const newId = () => `r${Date.now().toString(36)}${(counter++).toString(36)}${Math.random().toString(36).slice(2, 6)}`;

/** Same race = same date + course + round (case-insensitive); importing it again replaces it. */
export const raceKey = (r: Pick<Race, "date" | "course" | "round">) => `${r.date}|${r.course.trim().toLowerCase()}|${r.round.trim().toLowerCase()}`;

export type ParseResult = { ok: true; data: z.output<typeof FileSchema> } | { ok: false; error: string };

/** Validate a JSON text; errors are short Thai messages with the path, for the dock toast. */
export function parseFile(text: string): ParseResult {
  if (!text.trim()) return { ok: false, error: "ไฟล์ว่างเปล่า (ไม่มีข้อมูล) ถ้าส่งออกจาก dock ใน OBS ให้ใช้ \"คัดลอก JSON\" แทนการบันทึกไฟล์" };
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    return { ok: false, error: "ไฟล์ไม่ใช่ JSON ที่ถูกต้อง" };
  }
  // A bare array of races is accepted too.
  if (Array.isArray(json)) json = { races: json };
  const res = FileSchema.safeParse(json);
  if (res.success) return { ok: true, data: res.data };
  const issue = res.error.issues[0];
  return { ok: false, error: `${issue.path.join(".") || "ไฟล์"}: ${issue.message}` };
}

/**
 * Merge imported races into the current data.
 * "append": add, replacing races with the same date+course+round (keeping their id, so Active stays).
 * "replace": what the file holds becomes the whole list (its races replace all races, its horses all horses;
 * a file without races keeps the races, one without horses keeps the horses).
 * Either way the screen goes to the home page afterwards, unless the blank page was on (it stays blank).
 */
export function mergeImport(cur: AppData, file: z.output<typeof FileSchema>, mode: "append" | "replace"): AppData {
  const active = cur.active === BLANK ? BLANK : HOME;
  const incoming: Race[] = file.races.map((r) => ({ ...r, id: r.id ?? newId() }));
  const incomingHorses: Horse[] = file.horses.map((h) => ({ ...h, id: h.id ?? newId() }));
  if (mode === "replace") {
    // only what the file holds is replaced: a file of races keeps the horses, a file of horses keeps the races
    const hasRaces = incoming.length > 0, hasHorses = incomingHorses.length > 0;
    const races = hasRaces ? incoming : cur.races;
    const horses = hasHorses ? incomingHorses : cur.horses;
    return {
      ...cur,
      races,
      horses,
      horseSettings: hasHorses ? file.horseSettings ?? cur.horseSettings : cur.horseSettings,
      active,
      transition: file.transition ?? cur.transition,
      home: hasRaces ? file.home ?? cur.home : cur.home,
    };
  }
  const races = [...cur.races];
  for (const r of incoming) {
    const i = races.findIndex((x) => raceKey(x) === raceKey(r) || x.id === r.id);
    if (i >= 0) races[i] = { ...r, id: races[i].id };
    else races.push(r);
  }
  // same horse = same name (case-insensitive) or same id; importing it again replaces it
  const horses = [...cur.horses];
  const hk = (h: Pick<Horse, "name">) => h.name.trim().toLowerCase();
  for (const h of incomingHorses) {
    const i = horses.findIndex((x) => hk(x) === hk(h) || x.id === h.id);
    if (i >= 0) horses[i] = { ...h, id: horses[i].id };
    else horses.push(h);
  }
  return { ...cur, races, horses, active };
}

export function exportFile(data: AppData, only?: string): FileInput {
  const races = only ? data.races.filter((r) => r.id === only) : data.races;
  return only
    ? { version: 1, races }
    : { version: 1, races, horses: data.horses, horseSettings: data.horseSettings, home: data.home, active: data.active, transition: data.transition };
}

/** A file with just one horse (from the ม้า tab). */
export const exportHorse = (data: AppData, id: string): FileInput => ({ version: 1, horses: data.horses.filter((h) => h.id === id) });
