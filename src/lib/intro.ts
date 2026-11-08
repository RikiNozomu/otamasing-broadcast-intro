/**
 * The race intro scenes' rules: the order runners are introduced in (gate order), what is known about
 * each runner from the horse and jockey tabs, the grid's pages, and the weather forecast.
 */
import { useCycle, cycleAt, cycleSet, cycleTo } from "./cycle";
import { jockeyKey, type AppData, type Race, type Runner } from "./model";
import { paginate } from "./paging";
import type { Horse } from "./horseSchema";
import type { HistoryItem, Jockey, Weather } from "./introSchema";

export * from "./introSchema";

/** The stall a horse starts from: its number under JRA rules (auto draw), else its draw. */
export const stallOf = (race: Pick<Race, "style">, h: Pick<Runner, "number" | "draw">) => (race.style.autoDraw ? h.number : h.draw ?? h.number);

/** Runners in the intro: not scratched, in gate order (then by number). */
export function introRunners(race: Pick<Race, "runners" | "style">): Runner[] {
  return race.runners.filter((h) => !h.scratched).sort((a, b) => stallOf(race, a) - stallOf(race, b) || a.number - b.number);
}

const nameKey = (s: string) => s.trim().toLowerCase();
/** The horse tab's entry for a runner (same name, ignoring case). */
export const horseFor = (d: Pick<AppData, "horses">, name: string): Horse | undefined =>
  name.trim() ? d.horses.find((h) => nameKey(h.name) === nameKey(name)) : undefined;
/** The jockey tab's entry for a jockey's name (case, spaces and dots don't count). */
export const jockeyFor = (d: Pick<AppData, "jockeys">, name: string): Jockey | undefined =>
  name.trim() ? d.jockeys.find((j) => jockeyKey(j.name) === jockeyKey(name)) : undefined;

/** "SIRE × DAM (by BMS)" as two lines; empty parts are left out. */
export function pedigreeLines(h: Pick<Horse, "sire" | "dam" | "bms"> | undefined): { cross: string; bms: string } {
  if (!h) return { cross: "", bms: "" };
  return { cross: [h.sire, h.dam].filter(Boolean).join(" × "), bms: h.bms ? `by ${h.bms}` : "" };
}

/** Runner on screen in the runner intro (index into introRunners), following auto stepping. */
export function useIntroRunner(race: Race): { runners: Runner[]; index: number } {
  const runners = introRunners(race);
  const index = useCycle(race.intro.runner, runners.length);
  return { runners, index };
}
export const shownRunner = (race: Race, now = Date.now()) => cycleAt(race.intro.runner, introRunners(race).length, now);
export const showRunner = (race: Race, i: number, now = Date.now()) => cycleTo(race.intro.runner, i, introRunners(race).length, now);
export const setRunnerAuto = (race: Race, patch: { auto?: boolean; seconds?: number }, now = Date.now()) =>
  cycleSet(race.intro.runner, patch, introRunners(race).length, now);

/** The grid's rows on a page and the number of pages. */
export function gridPage(race: Race) {
  return paginate(introRunners(race), race.intro.grid.perPage, race.intro.grid.page);
}

/** The history moment that is playing at `now`, if its video has not ended (unknown length = until stopped). */
export function playingItem(race: Pick<Race, "intro">, now = Date.now()): HistoryItem | null {
  const p = race.intro.history.play;
  if (!p) return null;
  const item = race.intro.history.items.find((x) => x.id === p.id);
  if (!item?.video) return null;
  if (item.duration && now - p.at > item.duration * 1000 + 2500) return null;
  return item;
}

/** WMO weather code (Open-Meteo) to the intro's weather words. */
export function weatherOfCode(code: number): Weather {
  if (code <= 1) return "sunny";
  if (code === 2) return "partly";
  if (code === 3) return "cloudy";
  if (code === 45 || code === 48) return "fog";
  if (code >= 51 && code <= 57) return "drizzle";
  if ((code >= 61 && code <= 67) || (code >= 80 && code <= 82)) return "rain";
  if ((code >= 71 && code <= 77) || code === 85 || code === 86) return "snow";
  return "storm";
}

/**
 * The post time as a UTC instant. Post times in this project's files are Thai time (UTC+7), e.g. JRA 15:40 JST
 * is written 13:40; with no time, 12:00 Thai time.
 */
export function postInstant(date: string, postTime: string): Date {
  const m = /^(\d{1,2}):(\d{2})/.exec(postTime.trim());
  const [hh, mm] = m ? [+m[1], +m[2]] : [12, 0];
  return new Date(Date.UTC(+date.slice(0, 4), +date.slice(5, 7) - 1, +date.slice(8, 10), hh - 7, mm));
}

/** Forecast (or recent past) for the venue at post time, from Open-Meteo (free, no key; about −90 to +15 days). */
export async function fetchForecast(lat: number, lon: number, date: string, postTime: string, fetcher: typeof fetch = fetch):
  Promise<{ condition: Weather; tempC: number; windMs: number }> {
  const at = postInstant(date, postTime);
  const day = at.toISOString().slice(0, 10);
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&hourly=temperature_2m,weather_code,wind_speed_10m`
    + `&wind_speed_unit=ms&timezone=GMT&start_date=${day}&end_date=${day}`;
  const res = await fetcher(url);
  const j = await res.json() as { error?: boolean; reason?: string; hourly?: { time: string[]; temperature_2m: number[]; weather_code: number[]; wind_speed_10m: number[] } };
  if (!res.ok || j.error || !j.hourly) throw new Error(j.reason ?? `HTTP ${res.status}`);
  const hour = at.toISOString().slice(0, 13) + ":00";
  let i = j.hourly.time.indexOf(hour);
  if (i < 0) i = Math.min(j.hourly.time.length - 1, at.getUTCHours());
  const t = j.hourly.temperature_2m[i], c = j.hourly.weather_code[i], w = j.hourly.wind_speed_10m[i];
  if (t == null || c == null) throw new Error("ไม่มีพยากรณ์ของเวลานั้น");
  return { condition: weatherOfCode(c), tempC: Math.round(t), windMs: Math.round((w ?? 0) * 10) / 10 };
}
