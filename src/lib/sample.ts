/** Sample data written on first open, so every page shows something straight away. Names are made up. */
import { newHorseSettings, newHorseView, type Horse } from "./horses";
import { HOME, newPhotos, newCard, newResult, newStyle, type AppData, type Race, type Runner } from "./model";

const NAMES = ["Morning Gallop", "Silver Paddock", "Northern Lantern", "Checkered Flag", "Royal Furlong", "Paper Owner", "Gate Seven", "Blue Silks", "Final Furlong", "Yellow Draw", "Navy Plate", "Turf Comet", "Night Rally", "Rising Second", "Cream Headline", "Long Stretch", "Photo Finish", "Last Corner"];
const JOCKEYS: [string, string][] = [["A. Sample", "JP"], ["B. Example", "JP"], ["C. Rider", "FR"], ["D. Jockey", "JP"], ["E. Saddle", "IT"], ["F. Whip", "JP"], ["G. Stirrup", "GB"], ["H. Reins", "JP"], ["I. Crop", "JP"], ["J. Girth", "IE"], ["K. Bridle", "JP"], ["L. Bit", "JP"], ["M. Halter", "DE"], ["N. Tack", "JP"], ["O. Visor", "JP"], ["P. Blinker", "JP"], ["Q. Hood", "FR"], ["R. Shoe", "JP"]];
const FAVS = [9, 4, 12, 1, 15, 7, 11, 3, 14, 2, 16, 8, 13, 6, 18, 5, 17, 10];
const HC: Record<number, string> = { 2: "GB", 4: "US", 6: "FR", 9: "AU", 13: "IE", 16: "AR" };

export const sampleRunner = (i: number): Runner => ({
  number: i + 1, draw: null, name: NAMES[i % NAMES.length], jockey: JOCKEYS[i % 18][0],
  horseCountry: HC[i] ?? "JP", jockeyCountry: JOCKEYS[i % 18][1], fav: FAVS[i] ?? null, scratched: false,
  horseWeight: 440 + ((i * 37) % 90), horseWeightChange: ((i * 5) % 17) - 8, weight: 54 + ((i * 3) % 7) * 0.5,
  finish: null, outcome: null, time: "", margin: "",
});

/** A made-up finish for the 11R sample: [number, time, margin]. */
const RESULT_11: [number, string, string][] = [
  [9, "2:24.1", ""], [3, "2:24.3", "1¼"], [12, "2:24.3", "nk"], [1, "2:24.4", "½"], [7, "2:24.4", "hd"], [15, "2:24.6", "1½"],
  [4, "2:24.6", "nse"], [10, "2:24.9", "2"], [18, "2:25.0", "¾"], [2, "2:25.2", "1"], [11, "2:25.2", "hd"], [14, "2:25.4", "1¼"],
  [5, "2:25.9", "3"], [16, "2:25.9", "nk"], [8, "2:26.3", "2½"], [13, "2:26.5", "1"],
];

const race = (r: Omit<Race, "style" | "highlight" | "runners" | "result" | "card" | "photos"> & { n: number }): Race => {
  const { n, ...rest } = r;
  return { ...rest, highlight: null, style: newStyle(), result: newResult(), card: newCard(), photos: newPhotos(), runners: Array.from({ length: n }, (_, i) => sampleRunner(i)) };
};

export function sampleData(): AppData {
  const r10 = race({ id: "sample-10", date: "2026-11-29", course: "Tokyo", round: "10R", postTime: "15:01", jpName: "", name: "Shimotsuki Stakes", subtitle: "", grade: null, jump: false, class: null, surface: "Dirt", distanceM: 2100, n: 14 });
  const r11 = race({ id: "sample-11", date: "2026-11-29", course: "Tokyo", round: "11R", postTime: "15:40", jpName: "第1回 サンプルカップ", name: "Sample Cup", subtitle: "Example race for the broadcast overlay", grade: "G1", jump: false, class: null, surface: "Turf", distanceM: 2400, n: 18 });
  const r12 = race({ id: "sample-12", date: "2026-11-29", course: "Tokyo", round: "12R", postTime: "16:30", jpName: "", name: "Sample Juvenile", subtitle: "", grade: "G3", jump: false, class: "2YO", surface: "Turf", distanceM: 1600, n: 12 });
  r11.runners[5].scratched = true;
  r11.highlight = 9;
  RESULT_11.forEach(([no, time, margin], i) => Object.assign(r11.runners[no - 1], { finish: i + 1, time, margin }));
  r11.runners[16].outcome = "dnf"; // horse 17 pulled up; horse 6 is scratched and shows as SCR
  r10.style.drawScheme = "us";
  r10.style.numberScheme = "us";
  r10.style.show.draw = false;
  return { version: 1, races: [r10, r11, r12], horses: [sampleHorse()], horseSettings: newHorseSettings(), active: r11.id, transition: "wipe", home: { title: "Tokyo Races", subtitle: "2026.11.29", highlight: null, page: 0, background: null, showCourse: true, showDate: true }, images: {} };
}

export { HOME };

/** A made-up horse with ten past races (profile, pedigree, then two pages of races). */
export function sampleHorse(): Horse {
  const r = (date: string, name: string, grade: string, course: string, surface: "Turf" | "Dirt", distanceM: number, fav: number, finish: number, field: number, time: string, other: string) =>
    ({ date, name, grade, course, surface, distanceM, fav, finish, outcome: null, field, time, other });
  return {
    id: "sample-horse", name: "Sample Star", trainedIn: "JP", bornIn: "JP", foaled: "2022-03-14", coat: "Dark Bay",
    sex: "M",
    sire: "Example Sire", dam: "Paper Princess", bms: "Old Champion", sireSire: "Grand Example", sireDam: "Model Mare", damDam: "Paper Queen", owner: "Otamasing Racing", trainer: "T. Example",
    silksMode: "pattern", silksImage: null, photos: { keys: [], index: 0, auto: false, seconds: 5, since: 0 },
    silks: { body: "#000000", pattern: "cross", accent: "#E30613", sleeves: "#000000", sleevePattern: "stripes", sleeveAccent: "#FFE600" },
    record: { starts: 10, first: 5, second: 2, third: 1 }, earnings: 812_345_000, currency: "JPY",
    races: [
      r("2026-10-26", "Sample Autumn Cup", "G1", "Tokyo", "Turf", 2000, 2, 1, 18, "1:57.4", "Morning Gallop"),
      r("2026-09-28", "Example Stakes", "G2", "Nakayama", "Turf", 2200, 1, 1, 12, "2:12.1", "Silver Paddock"),
      r("2026-06-01", "Derby Sample", "G1", "Tokyo", "Turf", 2400, 3, 2, 18, "2:23.8", "Northern Lantern"),
      r("2026-04-19", "Classic Trial", "G1", "Nakayama", "Turf", 2000, 1, 3, 18, "1:58.9", "Gate Seven"),
      r("2026-03-08", "Spring Trial", "G2", "Nakayama", "Turf", 2000, 1, 1, 11, "2:00.2", "Blue Silks"),
      r("2026-02-08", "Winter Stakes", "G3", "Tokyo", "Turf", 1800, 2, 4, 14, "1:46.5", "Final Furlong"),
      r("2025-12-27", "Juvenile Sample", "G1", "Nakayama", "Turf", 2000, 4, 2, 16, "2:01.0", "Yellow Draw"),
      r("2025-11-22", "Autumn Juvenile", "", "Tokyo", "Turf", 1800, 1, 1, 9, "1:47.3", "Navy Plate"),
      r("2025-10-11", "Maiden Sample", "", "Tokyo", "Turf", 1800, 1, 1, 12, "1:48.1", "Turf Comet"),
      r("2025-09-07", "Debut Sample", "", "Nakayama", "Dirt", 1800, 2, 5, 14, "1:55.0", "Night Rally"),
    ],
    view: newHorseView(),
  };
}
