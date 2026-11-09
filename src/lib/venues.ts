/**
 * Venues for the course scene: built by scripts/venues/build_venue.py into src/venues/<id>.json
 * (track shapes from OpenStreetMap, course facts from the racing authority). Distances along a track
 * are official metres from the winning post in running order, 0 ≤ s < length.
 */
import type { Race } from "./model";
import type { Focus } from "./introSchema";

export type SectionId = "home" | "back" | "c1" | "c2" | "c3" | "c4";
export interface Section { id: SectionId; kind: "straight" | "corner"; from: number; to: number }
/**
 * A chute: a straight spur off the loop where some races start (Kyoto's pocket behind the 2nd corner). A race whose
 * start would fall up to `length` metres before `join` on the loop starts up the chute instead and runs into the loop
 * at `join`. `line` is its centre line, from the far end to the loop (metres, like the running line).
 */
export interface Chute {
  join: number;
  length: number;
  line: [number, number][];
  /**
   * Race distances that start up the chute whatever the arithmetic says: a race as long as the lap (Morioka's mile)
   * starts at the far end of the chute instead of going a whole lap round.
   */
  distances?: number[];
}
export interface Track {
  id: string;
  label: string;
  surface: "Turf" | "Dirt" | "Jump";
  /** Official lap length, home straight (4th corner to the post) and height difference, in metres. */
  length: number;
  homestretch: number;
  height: number;
  /** The running line as drawn: x east, y north (metres), a closed loop in running order from the post. */
  line: [number, number][];
  sections: Section[];
  /** Height (m) every 10 m from the post: [s, h]. */
  elevation: [number, number][];
  chute?: Chute;
  /** Race distances usually run on this track, to pick it over another of the same surface (inner or outer course). */
  distances?: number[];
}
export interface Venue {
  id: string;
  name: string;
  city: string;
  country: string;
  timezone: string;
  lat: number;
  lon: number;
  direction: "right" | "left";
  /** Other names a race card may use for the venue, lower case ("oi", "tck" for Ohi). */
  aliases?: string[];
  source: string;
  /** Thin context lines: every track edge around the venue. */
  outline: [number, number][][];
  tracks: Track[];
}

const files = import.meta.glob<Venue>("../venues/*.json", { eager: true, import: "default" });
export const VENUES: Venue[] = Object.values(files).sort((a, b) => a.name.localeCompare(b.name));

export const SECTION_LABEL: Record<SectionId, string> = {
  home: "Home Straight", back: "Back Straight", c1: "1st Corner", c2: "2nd Corner", c3: "3rd Corner", c4: "4th Corner",
};

/** `s` on the loop (0 ≤ s < length). */
export const wrap = (s: number, length: number) => ((s % length) + length) % length;

/** A course name as race cards write it, without "Racecourse" and the like: "Tokyo Racecourse" -> "tokyo". */
const bare = (name: string) => name.trim().toLowerCase().replace(/\s+(racecourse|race course|race track|keibajo)$/, "");

/**
 * The venue and track of a race: as set in the dock, or found from the race's course name (the venue's id, name or
 * another name it goes by first, so "Tokyo" is never Tokyo City Keiba; then the start of its name), surface and
 * distance (inner or outer course).
 */
export function courseOf(race: Pick<Race, "course" | "surface" | "intro"> & { distanceM?: number | null }, venues = VENUES): { venue: Venue; track: Track } | null {
  const c = race.intro.course;
  const name = bare(race.course);
  const venue = venues.find((v) => v.id === c.venue)
    ?? (name ? venues.find((v) => v.id === name || bare(v.name) === name || v.aliases?.includes(name))
      ?? venues.find((v) => v.name.toLowerCase().startsWith(name)) : undefined);
  if (!venue) return null;
  const d = race.distanceM ?? null;
  const surface = venue.tracks.filter((t) => t.surface === race.surface);
  const track = venue.tracks.find((t) => t.id === c.track)
    ?? (d ? surface.find((t) => t.distances?.includes(d)) : undefined)
    ?? surface[0]
    ?? venue.tracks[0];
  return track ? { venue, track } : null;
}

/**
 * Metres a race of `distance` runs on the chute before it reaches the loop (0 when it starts on the loop): when its
 * start, counted back round the loop (laps and all), falls on the stretch the chute stands in for. The chute as drawn
 * can come out a few metres short of the official distances, so a start just past its far end still counts.
 */
export function chuteRun(track: Pick<Track, "length" | "chute">, distance: number): number {
  const c = track.chute;
  if (c?.distances?.includes(distance)) return Math.max(0, distance - (track.length - c.join));
  if (!c) return 0;
  const back = c.join - wrap(-distance, track.length);
  return back > 0 && back <= c.length * 1.05 ? back : 0;
}

/**
 * Where a race of `distance` metres starts: `s` on the loop (as if the loop ran on round), how many whole laps come
 * after it, and `chute`: metres up the chute from where it joins the loop when the race starts there (else 0).
 */
export function startOf(track: Pick<Track, "length" | "chute">, distance: number) {
  const chute = chuteRun(track, distance);
  return { s: wrap(-distance, track.length), laps: Math.floor((distance - chute) / track.length), chute };
}

/**
 * The race's path as pieces of the loop, in running order: from the start (or where the chute joins the loop) to
 * the post, lapping when the race is longer than one lap. Each piece is [from, to] with from < to, inside 0..length.
 */
export function racePieces(track: Pick<Track, "length" | "chute">, distance: number): [number, number][] {
  distance -= chuteRun(track, distance);
  const L = track.length;
  let left = distance, s = wrap(-distance, L);
  const out: [number, number][] = [];
  while (left > 1e-6) {
    const room = (s === 0 ? L : L - s);
    const go = Math.min(room, left);
    out.push([s, s + go]);
    left -= go;
    s = wrap(s + go, L);
  }
  return out;
}

/** A section as pieces inside 0..length (the home straight runs through the post, so it is split there). */
export function sectionPieces(track: Pick<Track, "length">, sec: Pick<Section, "from" | "to">): [number, number][] {
  const L = track.length, a = sec.from, b = sec.to;
  if (a < 0) return [[wrap(a, L), L], [0, b]];
  if (b > L) return [[a, L], [0, b - L]];
  return [[a, b]];
}

const overlap = (a: [number, number], b: [number, number]) => Math.max(0, Math.min(a[1], b[1]) - Math.max(a[0], b[0]));

/** Corners the race goes through (a corner counts each time it is run, if at least half of it is run). */
export function cornersRun(track: Pick<Track, "length" | "sections" | "chute">, distance: number): number {
  const path = racePieces(track, distance);
  let n = 0;
  for (const sec of track.sections) {
    if (sec.kind !== "corner") continue;
    const len = sec.to - sec.from;
    for (const p of path) {
      const run = sectionPieces(track, sec).reduce((t, q) => t + overlap(p, q), 0);
      if (run >= len / 2) n++;
    }
  }
  return n;
}

export const sectionLength = (sec: Pick<Section, "from" | "to">) => sec.to - sec.from;

/** Height (m) at `s`, from the profile. */
export function heightAt(track: Pick<Track, "elevation" | "length">, s: number): number {
  const e = track.elevation;
  if (!e.length) return 0;
  const x = wrap(s, track.length);
  let i = 0;
  while (i < e.length - 1 && e[i + 1][0] <= x) i++;
  const [s0, h0] = e[i], [s1, h1] = e[Math.min(i + 1, e.length - 1)];
  return s1 > s0 ? h0 + ((h1 - h0) * (x - s0)) / (s1 - s0) : h0;
}

/** Sections picked out by a focus setting. */
export function focused(track: Pick<Track, "sections">, focus: Focus): Section[] {
  if (focus === "none") return [];
  if (focus === "straights") return track.sections.filter((x) => x.kind === "straight");
  if (focus === "corners") return track.sections.filter((x) => x.kind === "corner");
  return track.sections.filter((x) => x.id === focus);
}

/** Facts for the distance box: corners run, height difference, back straight and home straight. */
export function courseFacts(track: Track, distance: number | null) {
  const back = track.sections.find((x) => x.id === "back");
  return {
    corners: distance ? cornersRun(track, distance) : track.sections.filter((x) => x.kind === "corner").length,
    height: track.height,
    back: back ? Math.round(sectionLength(back)) : null,
    home: track.homestretch,
  };
}
