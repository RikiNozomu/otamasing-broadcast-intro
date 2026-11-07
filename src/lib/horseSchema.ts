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

const hex = z.string().regex(/^#[0-9a-fA-F]{6}$/, "สีต้องเป็น #RRGGBB");
/** Patterns of the owner's silks drawn by the app (body and sleeves). */
/**
 * Body patterns, from the JRA list (netkeiba) and the US / European names (Breeders' Cup):
 * hoops 一本輪 二本輪 三本輪, belt 帯, sash 襷, crossbelts, stripes 縦縞, seams, braces, halves, quartered,
 * check 格子, harlequin 元禄/菱形, diamond band, chevron 山形, large V, sawtooth 鋸歯形, hash 井桁,
 * yoke, spots 銭形, stars 星散, large star, ring 蛇目, large diamond.
 */
export const SILKS_BODY = ["plain", "hoop1", "hoop2", "hoop3", "belt", "sash", "cross", "stripes", "seams", "braces", "halves", "quartered", "check", "harlequin", "diamondBand", "chevron", "bigV", "sawtooth", "hash", "yoke", "spots", "stars", "star", "ring", "diamond",
  "jaggedYoke", "zigzag2", "zigzagBand", "rings", "bigCheck", "bigHarlequin", "bigDiamondBand",
  "disc", "fleurDeLys", "spots3", "triangle", "sashReverse", "blockGrid"] as const;
/** Sleeve patterns: armlets (one to five), stripes along the arm (two, or four dense ones), a thick zigzag band (with the body's zigzagBand), chevrons, diamonds, check, spots, stars, cuffs, halved (top/bottom). */
export const SILKS_SLEEVES = ["plain", "hoop1", "hoop2", "hoop3", "stripes", "chevrons", "diamonds", "check", "spots", "stars", "cuffs", "halved",
  "hoop4", "hoop5", "stripesDense", "zigzagBand", "blocks", "stripe1"] as const;
/** The owner's silks drawn as an SVG jersey with sleeves: body colour, a pattern in a second colour, sleeves. */
export const SilksSchema = z.object({
  body: hex.default("#000000"),
  pattern: z.enum(SILKS_BODY).default("plain"),
  accent: hex.default("#E30613"),
  sleeves: hex.default("#000000"),
  sleevePattern: z.enum(SILKS_SLEEVES).default("plain"),
  sleeveAccent: hex.default("#FFE600"),
  /** A yoke over the shoulders in this colour, drawn on top of the body pattern (e.g. with "triangle"); null = none. */
  yoke: hex.nullable().optional(),
});
export type Silks = z.infer<typeof SilksSchema>;

/** The horse's pictures (names of pictures stored in the browser) and their slideshow; same shape as a race's PhotoSet. */
export const HorsePhotosSchema = z.object({
  keys: z.array(z.string()).default([]),
  index: z.number().int().min(0).default(0),
  auto: z.boolean().default(false),
  seconds: z.number().min(1).max(600).default(5),
  since: z.number().default(0),
});

/** How the owner's silks are shown: an uploaded picture, the pattern drawn by the app, or none. */
export const SILKS_MODES = ["upload", "pattern", "none"] as const;
export type SilksMode = (typeof SILKS_MODES)[number];

/** Which page of the horse scene is on screen; the pages take turns with `auto` like the racecard. */
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
  /** The owner's silks drawn by the app (its colours and patterns). */
  silks: SilksSchema.nullable().default(null),
  /** Which silks are shown; left out = the drawn pattern when `silks` is set, otherwise none. */
  silksMode: z.enum(SILKS_MODES).optional(),
  /** Name of the uploaded silks picture stored in the browser (image/<date-time>.<ext>), or none. */
  silksImage: z.string().nullable().default(null),
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

