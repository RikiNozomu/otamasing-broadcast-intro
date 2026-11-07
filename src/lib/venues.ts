/**
 * Venues for the course scene: built by scripts/venues/build_venue.py into src/venues/<id>.json
 * (track shapes from OpenStreetMap, course facts from the racing authority). Distances along a track
 * are official metres from the winning post in running order, 0 ≤ s < length.
 */
import type { Race } from "./model";
import type { Focus } from "./introSchema";

export type SectionId = "home" | "back" | "c1" | "c2" | "c3" | "c4";
export interface Section { id: SectionId; kind: "straight" | "corner"; from: number; to: number }
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

/** The venue and track of a race: as set in the dock, or found from the race's course name and surface. */
export function courseOf(race: Pick<Race, "course" | "surface" | "intro">, venues = VENUES): { venue: Venue; track: Track } | null {
  const c = race.intro.course;
  const name = race.course.trim().toLowerCase();
  const venue = venues.find((v) => v.id === c.venue)
    ?? (name ? venues.find((v) => v.id === name || v.name.toLowerCase().startsWith(name)) : undefined);
  if (!venue) return null;
  const track = venue.tracks.find((t) => t.id === c.track)
    ?? venue.tracks.find((t) => t.surface === race.surface)
    ?? venue.tracks[0];
  return track ? { venue, track } : null;
}

/** Where a race of `distance` metres starts: `s` on the loop, and how many whole laps come after it. */
export function startOf(track: Pick<Track, "length">, distance: number) {
  return { s: wrap(-distance, track.length), laps: Math.floor(distance / track.length) };
}

/**
 * The race's path as pieces of the loop, in running order: from the start to the post, lapping when the
 * race is longer than one lap. Each piece is [from, to] with from < to, inside 0..length.
 */
export function racePieces(track: Pick<Track, "length">, distance: number): [number, number][] {
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
export function cornersRun(track: Pick<Track, "length" | "sections">, distance: number): number {
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
