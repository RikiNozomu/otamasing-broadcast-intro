/** Sample data written on first open, so every page shows something straight away. Names are made up. */
import { newHorseSettings, newHorseView, type Horse } from "./horses";
import { introOf, newPhotos, newCard, newResult, newStyle, type AppData, type Race, type Runner } from "./model";
import { newIntro, type Intro } from "./introSchema";
import { SILKS_BODY, SILKS_SLEEVES } from "./horseSchema";

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

const race = (r: Omit<Race, "style" | "highlight" | "runners" | "result" | "card" | "photos" | "intro"> & { n: number }): Race => {
  const { n, ...rest } = r;
  return { ...rest, highlight: null, style: newStyle(), result: newResult(), card: newCard(), photos: newPhotos(), intro: newIntro(), runners: Array.from({ length: n }, (_, i) => sampleRunner(i)) };
};

export function sampleData(): AppData {
  const r10 = race({ id: "sample-10", date: "2026-11-29", course: "Tokyo", round: "10R", postTime: "15:01", jpName: "", name: "Shimotsuki Stakes", subtitle: "", grade: null, jump: false, class: null, surface: "Dirt", distanceM: 2100, n: 14 });
  const r11 = race({ id: "sample-11", date: "2026-11-29", course: "Kyoto", round: "11R", postTime: "13:40", jpName: "第1回 サンプルカップ", name: "Sample Cup", subtitle: "Example race for the broadcast overlay", grade: "G1", jump: false, class: null, surface: "Turf", distanceM: 2200, n: 18 });
  r11.intro = sampleIntro();
  const r12 = race({ id: "sample-12", date: "2026-11-29", course: "Tokyo", round: "12R", postTime: "16:30", jpName: "", name: "Sample Juvenile", subtitle: "", grade: "G3", jump: false, class: "2YO", surface: "Turf", distanceM: 1600, n: 12 });
  r11.runners[5].scratched = true;
  r10.style.drawScheme = "us";
  r10.style.numberScheme = "us";
  return { version: 1, races: [r10, r11, r12], horses: NAMES.map(sampleRunnerHorse), horseSettings: newHorseSettings(), jockeys: [], active: introOf("runner", r11.id), transition: "stripes", home: { title: "Tokyo Races", subtitle: "2026.11.29", highlight: null, page: 0, background: null, showCourse: true, showDate: true }, images: {} };
}

/** Made-up course scene settings for the sample: Kyoto outer turf, every box on, three history moments. */
export function sampleIntro(): Intro {
  const intro = newIntro();
  intro.course = { ...intro.course, venue: "kyoto", track: "turf-outer", panels: { venue: true, distance: true, records: true, weather: true } };
  intro.records = {
    course: { time: "2:09.8", horse: "Royal Furlong", jockey: "E. Saddle", date: "2025-11-16" },
    race: { time: "2:10.4", horse: "Paper Owner", jockey: "F. Whip", date: "2024-11-17" },
  };
  intro.weather = { condition: "sunny", tempC: 17, windMs: 2.4, source: "manual" };
  intro.going = "Good";
  intro.history.items = [
    { id: "hist-1", year: 1996, date: "1996-11-10", title: "The first Sample Cup", text: "A made-up first running, won from the front by Morning Gallop.", horses: ["Morning Gallop"], video: null, duration: null },
    { id: "hist-2", year: 2011, date: "2011-11-13", title: "A photo finish", text: "Made-up story: Photo Finish and Last Corner could not be split by eye; the camera gave it to Photo Finish by a nose.", horses: ["Photo Finish", "Last Corner"], video: null, duration: null },
    { id: "hist-3", year: 2025, date: "2025-11-16", title: "A new course record", text: "Made-up story: Royal Furlong took the race in a course record time.", horses: ["Royal Furlong"], video: null, duration: null },
  ];
  return intro;
}

const SIRES = ["Example Sire", "Model Stallion", "Grand Example", "Northern Sample", "Paper Emperor", "Silver Template"];
const DAMS = ["Paper Princess", "Sample Lady", "Demo Mare", "Model Queen", "Test Beauty", "Draft Dancer", "Mock Rose", "Proof Belle", "Spare Duchess"];
const BMS = ["Old Champion", "Classic Sample", "Retired Model", "Former Example", "Legacy Paper"];
const COLOURS = ["#0A056B", "#E30613", "#FFE600", "#FFFFFF", "#00843D", "#000000", "#F28C00", "#7A2E8C", "#5BC2E7", "#C8102E"];

/** A made-up horse-tab entry for each sample runner: pedigree and silks for the runner intro. */
export function sampleRunnerHorse(name: string, i: number): Horse {
  const c = (k: number) => COLOURS[(i * 3 + k) % COLOURS.length];
  return {
    id: `sample-runner-${i + 1}`, name, trainedIn: "JP", bornIn: "JP", foaled: `202${1 + (i % 3)}-04-0${1 + (i % 9)}`, coat: null, sex: i % 4 === 3 ? "F" : "M",
    sire: SIRES[i % SIRES.length], dam: DAMS[i % DAMS.length], bms: BMS[i % BMS.length], sireSire: "", sireDam: "", damDam: "", owner: "", trainer: "",
    silksMode: "pattern", silksImage: null, photos: { keys: [], index: 0, auto: false, seconds: 5, since: 0 },
    silks: { body: c(0), pattern: SILKS_BODY[(i * 5) % 12], accent: c(1), sleeves: c(2), sleevePattern: SILKS_SLEEVES[(i * 7) % 8], sleeveAccent: c(1) },
    record: { starts: 0, first: 0, second: 0, third: 0 }, earnings: null, currency: "JPY", races: [], view: newHorseView(),
  };
}
