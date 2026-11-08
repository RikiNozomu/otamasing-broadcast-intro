/**
 * Schemas of the race intro (the F1-style scenes): per race `intro` (course scene, history, runner intro,
 * starting grid) and the jockeys list. Kept free of app imports so the schema script (plain Node) can load it.
 */
import { z } from "zod";

const country = z.union([z.string().regex(/^[A-Z]{2}$/, "รหัสประเทศต้องเป็นตัวพิมพ์ใหญ่ 2 ตัว เช่น JP"), z.literal("")]);
const date = z.union([z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "วันที่ต้องเป็น YYYY-MM-DD"), z.literal("")]);

/** Parts of the course that can be picked out: all straights, all corners, or one of them. */
export const FOCUS = ["none", "straights", "corners", "home", "back", "c1", "c2", "c3", "c4"] as const;
export type Focus = (typeof FOCUS)[number];

/** Weather icons and words (WMO codes from the forecast are mapped to these). */
export const WEATHERS = {
  sunny: "Sunny", partly: "Partly Cloudy", cloudy: "Cloudy", fog: "Fog", drizzle: "Drizzle", rain: "Rain", snow: "Snow", storm: "Thunderstorm",
} as const;
export type Weather = keyof typeof WEATHERS;
const WEATHER_KEYS = Object.keys(WEATHERS) as [Weather, ...Weather[]];

/** Track conditions in JRA's English words (turf / dirt). */
export const GOINGS = {
  Turf: ["Firm", "Good", "Yielding", "Soft"],
  Dirt: ["Standard", "Good", "Muddy", "Sloppy"],
} as const;

/** A record time: who set it and when. */
export const RecordSchema = z.object({
  time: z.string().default(""),
  horse: z.string().default(""),
  jockey: z.string().default(""),
  date: date.default(""),
});
export type RaceRecord = z.infer<typeof RecordSchema>;

/** One moment in the race's history: shown as a card in the history modal, with an optional highlight video. */
export const HistoryItemSchema = z.object({
  id: z.string().min(1).optional(),
  /** The year shown big on the card. */
  year: z.number().int().min(1800).max(2200).nullable().default(null),
  /** Full date of the race, shown with the video. */
  date: date.default(""),
  title: z.string().default(""),
  text: z.string().default(""),
  /** Horses in it, by name (flags and silks come from the horse tab when the name matches). */
  horses: z.array(z.string()).default([]),
  /** Name of the video stored in the browser (video/<date-time>.<ext>), or none. */
  video: z.string().nullable().default(null),
  /** Length of the video in seconds (read when it is added), so the dock knows when it ends. */
  duration: z.number().positive().nullable().default(null),
});
export type HistoryItemInput = z.input<typeof HistoryItemSchema>;
export type HistoryItem = Omit<z.output<typeof HistoryItemSchema>, "id"> & { id: string };

/** The course scene: which venue and track, and what is shown on it. */
export const CourseViewSchema = z.object({
  /** Venue id (e.g. "kyoto") and track id (e.g. "turf-outer"); null = picked from the race's course and surface. */
  venue: z.string().nullable().default(null),
  track: z.string().nullable().default(null),
  /** Start with the globe turning in and zooming down to the course (off = straight to the course). */
  globe: z.boolean().default(true),
  /** The scene starts over (globe first) when this changes: the dock's "เล่นใหม่" button. */
  since: z.number().default(0),
  /** The race's path in the second colour, the hill in 3D, the start and the winning post, moving chevrons. */
  path: z.boolean().default(true),
  elevation: z.boolean().default(false),
  /** How many times the heights are stretched in 3D (a 4 m hill on a 2 km course is invisible at 1x). */
  // 5×: Kyoto's 3–4 m hill reads as a gentle rise; 25× (the old default) made it look like a mountain
  elevationScale: z.number().min(1).max(100).default(5),
  startFinish: z.boolean().default(true),
  chevrons: z.boolean().default(true),
  focus: z.enum(FOCUS).default("none"),
  /** Boxes along the bottom: venue, distance facts, records, weather and going. */
  panels: z.object({
    venue: z.boolean().default(true),
    distance: z.boolean().default(true),
    records: z.boolean().default(false),
    weather: z.boolean().default(false),
  }).default({}),
});
export type CourseView = z.infer<typeof CourseViewSchema>;

export const WeatherSchema = z.object({
  condition: z.enum(WEATHER_KEYS).nullable().default(null),
  tempC: z.number().min(-50).max(60).nullable().default(null),
  windMs: z.number().min(0).max(100).nullable().default(null),
  /** "manual" or "forecast" (filled by the forecast button, then editable). */
  source: z.enum(["manual", "forecast"]).default("manual"),
});

export const HistoryViewSchema = z.object({
  items: z.array(HistoryItemSchema).default([]),
  /** The history modal is on screen (over the course scene). */
  open: z.boolean().default(false),
  /** The card picked out in the modal. */
  selected: z.string().nullable().default(null),
  /** The video playing: which item, started at `at` (ms); pressing play again starts it over. */
  play: z.object({ id: z.string(), at: z.number() }).nullable().default(null),
});

/** Runner intro: one horse at a time, in gate order; `index` on screen at `since`, `auto` steps every `seconds`. */
export const RunnerViewSchema = z.object({
  index: z.number().int().min(0).default(0),
  auto: z.boolean().default(false),
  seconds: z.number().min(2).max(600).default(8),
  since: z.number().default(0),
});

/** The starting grid: every runner top to bottom in gate order, `perPage` a page. */
export const GridViewSchema = z.object({
  page: z.number().int().min(0).default(0),
  perPage: z.number().int().min(4).max(18).default(18),
  /** Behind the rows: the course in 3D slowly orbiting (when the venue is known), or the race's photos. */
  backdrop: z.enum(["course", "photo"]).default("course"),
  show: z.object({
    draw: z.boolean().default(true),
    number: z.boolean().default(true),
    silks: z.boolean().default(true),
    horseWeight: z.boolean().default(true),
    jockey: z.boolean().default(true),
    weight: z.boolean().default(true),
  }).default({}),
});

export const IntroSchema = z.object({
  course: CourseViewSchema.default({}),
  records: z.object({ course: RecordSchema.default({}), race: RecordSchema.default({}) }).default({}),
  weather: WeatherSchema.default({}),
  /** Track condition, e.g. "Good" (see GOINGS). */
  going: z.string().default(""),
  history: HistoryViewSchema.default({}),
  runner: RunnerViewSchema.default({}),
  grid: GridViewSchema.default({}),
});
export type IntroInput = z.input<typeof IntroSchema>;
export type Intro = Omit<z.output<typeof IntroSchema>, "history"> & { history: Omit<z.output<typeof HistoryViewSchema>, "items"> & { items: HistoryItem[] } };
export const newIntro = (): Intro => IntroSchema.parse({}) as Intro;

/** A jockey: matched to the runners by name; the photo (a cut-out PNG) stands on the right of the runner intro. */
export const JockeySchema = z.object({
  id: z.string().min(1).optional(),
  name: z.string().min(1, "ต้องมีชื่อจ็อกกี้"),
  country: country.default(""),
  /** Name of the photo stored in the browser (image/<date-time>.<ext>), or none. */
  photo: z.string().nullable().default(null),
});
export type JockeyInput = z.input<typeof JockeySchema>;
export type Jockey = Omit<z.output<typeof JockeySchema>, "id"> & { id: string };
