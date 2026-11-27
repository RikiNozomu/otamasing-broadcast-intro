/**
 * Horse profile schemas (the JSON file format and the stored data). Kept free of app imports so the
 * schema script (npm run schema, plain Node) can load it through model.ts.
 */
import { z } from "zod";

const country = z.union([z.string().regex(/^[A-Z]{2}$/, "รหัสประเทศต้องเป็นตัวพิมพ์ใหญ่ 2 ตัว เช่น JP"), z.literal("")]);

/** Coat colours with the colour of their swatch (JRA's eight). */
export const COATS = {
  Bay: { th: "Bay (鹿毛)", color: "#8A4B22" },
  "Dark Bay": { th: "Dark Bay (黒鹿毛)", color: "#4B2716" },
  Brown: { th: "Brown (青鹿毛)", color: "#2F1E16" },
  Black: { th: "Black (青毛)", color: "#121014" },
  Chestnut: { th: "Chestnut (栗毛)", color: "#B65A26" },
  "Dark Chestnut": { th: "Dark Chestnut (栃栗毛)", color: "#7A3518" },
  Grey: { th: "Grey (芦毛)", color: "#A5A7AA" },
  White: { th: "White (白毛)", color: "#F2F0EA" },
} as const;
export type Coat = keyof typeof COATS;

/** Currencies for prize money: symbol, and the default value of 1 unit in US dollars (editable in the dock). */
export const CURRENCIES = {
  JPY: { symbol: "¥", usd: 0.0066, digits: 0 },
  USD: { symbol: "$", usd: 1, digits: 0 },
  GBP: { symbol: "£", usd: 1.27, digits: 0 },
  EUR: { symbol: "€", usd: 1.08, digits: 0 },
  AUD: { symbol: "A$", usd: 0.65, digits: 0 },
  HKD: { symbol: "HK$", usd: 0.128, digits: 0 },
  AED: { symbol: "AED ", usd: 0.272, digits: 0 },
  SAR: { symbol: "SAR ", usd: 0.267, digits: 0 },
  THB: { symbol: "฿", usd: 0.028, digits: 0 },
} as const;
export type Currency = keyof typeof CURRENCIES;
const CURRENCY_CODES = Object.keys(CURRENCIES) as [Currency, ...Currency[]];

/** One past race of a horse. `other` is the winner, or the runner-up when this horse won. */
export const CareerRaceSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "วันที่ต้องเป็น YYYY-MM-DD"),
  name: z.string().min(1, "ต้องมีชื่อรายการ"),
  /** Written as shown: "G1", "Jpn1", "L", "OP"… ("" for none). */
  grade: z.string().default(""),
  course: z.string().default(""),
  surface: z.enum(["Turf", "Dirt", "Jump"]).default("Turf"),
  distanceM: z.number().int().positive().nullable().default(null),
  /** Popularity in the betting (1 = favourite). */
  fav: z.number().int().min(1).nullable().default(null),
  /** Finishing position; null with `outcome` for a horse that did not finish or was disqualified. */
  finish: z.number().int().min(1).nullable().default(null),
  outcome: z.enum(["dnf", "dq"]).nullable().default(null),
  field: z.number().int().min(1).nullable().default(null),
  time: z.string().default(""),
  other: z.string().default(""),
});
export type CareerRace = z.infer<typeof CareerRaceSchema>;


/** The horse's pictures (names of pictures stored in the browser) and their slideshow; same shape as a race's PhotoSet. */
export const HorsePhotosSchema = z.object({
  keys: z.array(z.string()).default([]),
  index: z.number().int().min(0).default(0),
  auto: z.boolean().default(false),
  seconds: z.number().min(1).max(600).default(5),
  since: z.number().default(0),
});

/** Which page of broadcast compact's horse scene is on screen (kept for compact); the pages take turns with `auto` like the racecard. */
export const HorseViewSchema = z.object({
  page: z.number().int().min(0).default(0),
  auto: z.boolean().default(false),
  seconds: z.number().min(1).max(600).default(8),
  since: z.number().default(0),
});
export type HorseView = z.infer<typeof HorseViewSchema>;

export const HorseSchema = z.object({
  id: z.string().min(1).optional(),
  name: z.string().min(1, "ต้องมีชื่อม้า"),
  /** Where the horse is trained (the flag beside its name) and where it was foaled. */
  trainedIn: country.default(""),
  bornIn: country.default(""),
  foaled: z.union([z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "วันเกิดต้องเป็น YYYY-MM-DD"), z.literal("")]).default(""),
  coat: z.enum(Object.keys(COATS) as [Coat, ...Coat[]]).nullable().default(null),
  /** M = male (colt / horse), F = female (filly / mare), G = gelding. */
  sex: z.enum(["M", "F", "G"]).nullable().default(null),
  sire: z.string().default(""),
  dam: z.string().default(""),
  /** Broodmare sire (the dam's sire). */
  bms: z.string().default(""),
  /** The other grandparents, for the pedigree page: the sire's sire and dam, the dam's dam. */
  sireSire: z.string().default(""),
  sireDam: z.string().default(""),
  damDam: z.string().default(""),
  owner: z.string().default(""),
  trainer: z.string().default(""),
  /**
   * The owner's silks: a name from the shared silks list (otamasing-broadcast-shared lib/silks, e.g. "Godolphin"), "" = none.
   * Older files held drawn silks (an object) or an uploaded picture here; those read as none.
   */
  silks: z.preprocess((v) => (typeof v === "string" ? v : ""), z.string()),
  /** The horse's pictures on the left of the scene, taking turns. */
  photos: HorsePhotosSchema.default({}),
  /** Career record: starts and 1st / 2nd / 3rd (4th or worse = the rest). */
  record: z.object({
    starts: z.number().int().min(0).default(0),
    first: z.number().int().min(0).default(0),
    second: z.number().int().min(0).default(0),
    third: z.number().int().min(0).default(0),
  }).default({}),
  earnings: z.number().min(0).nullable().default(null),
  currency: z.enum(CURRENCY_CODES).default("JPY"),
  races: z.array(CareerRaceSchema).default([]),
  view: HorseViewSchema.default({}),
});
export type HorseInput = z.input<typeof HorseSchema>;
export type Horse = Omit<z.output<typeof HorseSchema>, "id"> & { id: string };

/** Settings of the horse tab: the currency prize money is shown in ("own" = each horse's) and the exchange rates. */
export const HorseSettingsSchema = z.object({
  currency: z.union([z.literal("own"), z.enum(CURRENCY_CODES)]).default("own"),
  /** Value of 1 unit in US dollars. */
  rates: z.record(z.string(), z.number().positive()).default({}),
});
export type HorseSettings = z.infer<typeof HorseSettingsSchema>;
export const newHorseSettings = (): HorseSettings => HorseSettingsSchema.parse({});
export const newHorseView = (): HorseView => HorseViewSchema.parse({});

