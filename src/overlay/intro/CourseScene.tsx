/**
 * The course scene (1920x1080): the 3D globe and course (course3d.ts) behind, the race title top left, and the
 * boxes along the bottom picked in the dock (venue, distance facts, records, weather and going). The history
 * modal opens over it; a history moment's video plays inside the modal.
 */
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import type { Race } from "../../lib/model";
import { courseFacts, courseOf, type Track, type Venue } from "../../lib/venues";
import { GOINGS, WEATHERS, type RaceRecord } from "../../lib/introSchema";
import { cx } from "../../lib/cx";
import { Flag } from "../../components/Flag";
import { useLeaving } from "../leaving";
import { BACKDROP_SKIP, CourseView3D, loadWorld, type World } from "./course3d";
import { EASE, IntroHeader, slant } from "./IntroHeader";
import { HistoryModal } from "./HistoryModal";
import { WeatherIcon } from "./WeatherIcon";

const regionName = (code: string) => {
  try { return new Intl.DisplayNames(["en"], { type: "region" }).of(code) ?? code; } catch { return code; }
};
const dotDate = (d: string) => d.replaceAll("-", ".");

/** One box of the bottom row: a yellow label tab and its content on a dark glass plate. */
function Panel({ label, i, delay, children, testId, grow = 1 }: { label: string; i: number; delay: number; children: ReactNode; testId: string; grow?: number }) {
  const leaving = useLeaving();
  return (
    <motion.section data-testid={testId} layout="position" className="relative grid min-w-0 content-start" style={{ flex: `${grow} 1 0` }}
      initial={{ opacity: 0, y: 80 }}
      animate={leaving ? { opacity: 0, y: 80, transition: { duration: 0.3, ease: EASE, delay: i * 0.04 } } : { opacity: 1, y: 0, transition: { duration: 0.55, ease: EASE, delay: delay + i * 0.12 } }}
      exit={{ opacity: 0, y: 80, transition: { duration: 0.3, ease: EASE } }}>
      <span className="justify-self-start bg-yellow px-5 py-0.5 font-display text-[20px] font-bold tracking-[.14em] text-navy" style={slant(10)}>{label}</span>
      <div className="mt-[-2px] h-[178px] border-t-[4px] border-yellow bg-[linear-gradient(180deg,rgb(6_14_90/.9),rgb(3_8_52/.94))] px-6 py-4 text-white shadow-[0_18px_40px_rgb(0_0_0/.35)] backdrop-blur-[6px]">
        {children}
      </div>
    </motion.section>
  );
}

const factLabel = "font-display text-[18px] font-semibold tracking-[.12em] text-white/65";
const factValue = "font-display text-[34px] leading-none font-bold";

function Fact({ label, value, testId }: { label: string; value: ReactNode; testId?: string }) {
  return <div className="grid content-start gap-1" data-testid={testId}><span className={factLabel}>{label}</span><span className={factValue}>{value}</span></div>;
}

function RecordLine({ title, r, testId }: { title: string; r: RaceRecord; testId: string }) {
  if (!r.time) return null;
  return (
    <div className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-x-4" data-testid={testId}>
      <span className="row-span-2 font-display text-[44px] leading-none font-bold text-yellow">{r.time}</span>
      <span className={cx(factLabel, "truncate")}>{title}{r.date ? ` · ${dotDate(r.date)}` : ""}</span>
      <span className="truncate font-display text-[26px] leading-tight font-bold uppercase">{[r.horse, r.jockey].filter(Boolean).join(" / ")}</span>
    </div>
  );
}

function Panels({ race, venue, track, delay }: { race: Race; venue: Venue; track: Track; delay: number }) {
  const P = race.intro.course.panels, rec = race.intro.records, w = race.intro.weather;
  const facts = courseFacts(track, race.distanceM);
  const boxes: ReactNode[] = [];
  let i = 0;
  if (P.venue) boxes.push(
    <Panel key="venue" testId="panel-venue" label="VENUE" i={i++} delay={delay} grow={1.1}>
      <div className="flex items-center gap-4">
        <Flag code={venue.country} className="h-[46px] w-[69px] flex-none" />
        <span className="line-clamp-2 min-w-0 font-display text-[46px] leading-[.95] font-bold uppercase" data-testid="venue-name">{venue.name}</span>
      </div>
      <div className="mt-3 truncate font-display text-[26px] font-semibold tracking-[.04em] text-white/85 uppercase">{venue.city} · {regionName(venue.country)}</div>
    </Panel>,
  );
  if (P.distance) boxes.push(
    <Panel key="distance" testId="panel-distance" label="DISTANCE" i={i++} delay={delay} grow={1.35}>
      <div className="flex items-baseline gap-4">
        <span className="font-display text-[58px] leading-none font-bold">{race.distanceM ?? track.length}<span className="ml-1 text-[30px]">M</span></span>
        <span className="font-display text-[26px] font-semibold tracking-[.06em] text-yellow uppercase">{track.label}</span>
        <span className="font-display text-[22px] tracking-[.06em] text-white/65 uppercase" data-testid="direction">{venue.direction === "right" ? "Right-handed" : "Left-handed"}</span>
      </div>
      <div className="mt-3 grid grid-cols-4 gap-4">
        <Fact label="CORNERS" value={facts.corners} testId="fact-corners" />
        <Fact label="HILL" value={<>{facts.height}<span className="text-[20px]"> M</span></>} testId="fact-hill" />
        <Fact label="BACK STR." value={facts.back != null ? <>{facts.back}<span className="text-[20px]"> M</span></> : "–"} testId="fact-back" />
        <Fact label="HOME STR." value={<>{facts.home}<span className="text-[20px]"> M</span></>} testId="fact-home" />
      </div>
    </Panel>,
  );
  if (P.records && (rec.course.time || rec.race.time)) boxes.push(
    <Panel key="records" testId="panel-records" label="RECORDS" i={i++} delay={delay} grow={1.3}>
      <div className="grid gap-3">
        <RecordLine title="COURSE RECORD" r={rec.course} testId="record-course" />
        <RecordLine title="RACE RECORD" r={rec.race} testId="record-race" />
      </div>
    </Panel>,
  );
  if (P.weather && (w.condition || race.intro.going)) boxes.push(
    <Panel key="weather" testId="panel-weather" label="CONDITIONS" i={i++} delay={delay} grow={1}>
      <div className="flex items-center gap-5">
        {w.condition && <WeatherIcon kind={w.condition} className="size-[84px] flex-none text-yellow" />}
        <div className="grid gap-1">
          {w.condition && <span className="font-display text-[34px] leading-none font-bold uppercase">{WEATHERS[w.condition]}</span>}
          <span className="font-display text-[26px] font-semibold text-white/85">
            {[w.tempC != null ? `${w.tempC}°C` : "", w.windMs != null ? `WIND ${w.windMs} M/S` : ""].filter(Boolean).join(" · ")}
          </span>
        </div>
      </div>
      {race.intro.going && (
        <div className="mt-3 flex items-baseline gap-3" data-testid="going">
          <span className={factLabel}>{(track.surface === "Dirt" ? "DIRT" : "TURF")} GOING</span>
          <span className="font-display text-[36px] leading-none font-bold text-yellow uppercase">{race.intro.going}</span>
        </div>
      )}
    </Panel>,
  );
  return <div className="absolute right-[60px] bottom-[44px] left-[60px] flex items-end gap-5">{boxes}</div>;
}

/**
 * The 3D canvas; built once per venue/track/distance (and when the dock replays it), options passed on live.
 * As a `backdrop` (behind the STARTING GATE) it starts already orbiting, without the globe, START/FINISH or focus.
 */
function Course3D({ race, venue, track, backdrop = false }: { race: Race; venue: Venue; track: Track; backdrop?: boolean }) {
  const host = useRef<HTMLDivElement>(null);
  const view = useRef<CourseView3D | null>(null);
  const c = race.intro.course;
  const globe = c.globe && !backdrop;
  const [world, setWorld] = useState<World | null | undefined>(globe ? undefined : null);
  const [failed, setFailed] = useState(false);
  const opts = backdrop
    ? { path: c.path, elevation: c.elevation, elevationScale: c.elevationScale, startFinish: false, chevrons: c.chevrons, focus: "none" as const }
    : { path: c.path, elevation: c.elevation, elevationScale: c.elevationScale, startFinish: c.startFinish, chevrons: c.chevrons, focus: c.focus };
  useEffect(() => {
    if (!globe) return;
    let alive = true;
    loadWorld().then((w) => alive && setWorld(w));
    return () => { alive = false; };
  }, [globe]);
  useEffect(() => {
    if (world === undefined || !host.current) return;
    try {
      view.current = new CourseView3D(host.current, venue, track, race.distanceM ?? track.length, opts, globe ? world : null, backdrop ? BACKDROP_SKIP : 0);
    } catch {
      setFailed(true);
    }
    return () => { view.current?.dispose(); view.current = null; };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- options are passed on below without rebuilding
  }, [world, venue.id, track.id, race.distanceM, backdrop ? 0 : c.since]);
  useEffect(() => { view.current?.setOptions(opts); });
  return (
    <div ref={host} className="absolute inset-0" data-testid="course-3d" data-globe={globe ? "on" : "off"}>
      {failed && <div className="absolute inset-0 grid place-items-center font-display text-[40px] text-white/70">3D ใช้ไม่ได้ในเบราว์เซอร์นี้ (เปิด hardware acceleration ใน OBS)</div>}
    </div>
  );
}

/** The race's course in 3D, slowly orbiting, dimmed behind another scene (the STARTING GATE). */
export function CourseBackdrop({ race }: { race: Race }) {
  const leaving = useLeaving();
  const found = courseOf(race);
  if (!found) return null;
  return (
    <motion.div className="absolute inset-0" data-testid="gate-backdrop" initial={{ opacity: 0 }} animate={{ opacity: leaving ? 0 : 0.9 }} transition={{ duration: leaving ? 0.3 : 1 }}>
      <div className="absolute inset-0 bg-[radial-gradient(75%_85%_at_50%_45%,#1a2c9c_0%,#0b1a86_45%,#020a48_100%)]" />
      <Course3D race={race} venue={found.venue} track={found.track} backdrop />
    </motion.div>
  );
}

export function CourseScene({ race }: { race: Race }) {
  const leaving = useLeaving();
  const found = courseOf(race);
  const h = race.intro.history;
  const modal = h.open || !!h.play;
  // the boxes come in once the camera has reached the course: that wait counts from when the scene started (or
  // the dock replayed it), so a box switched back on, or the row coming back after the history modal, shows at once
  const started = useRef({ since: race.intro.course.since, at: performance.now() });
  if (started.current.since !== race.intro.course.since) started.current = { since: race.intro.course.since, at: performance.now() };
  const delay = Math.max(0, (race.intro.course.globe ? 7.4 : 3) - (performance.now() - started.current.at) / 1000);
  return (
    <div className="absolute inset-0 overflow-hidden" data-testid="course-scene" data-race={race.id}>
      <div className="absolute inset-0 bg-[radial-gradient(75%_85%_at_50%_45%,#1a2c9c_0%,#0b1a86_45%,#020a48_100%)]" />
      <motion.div className="absolute inset-0" key={race.intro.course.since}
        animate={{ opacity: leaving ? 0 : 1, filter: modal ? "blur(5px) brightness(.55)" : "blur(0px) brightness(1)" }} transition={{ duration: leaving ? 0.4 : 0.6 }}>
        {found ? <Course3D race={race} venue={found.venue} track={found.track} /> : (
          <div className="absolute inset-0 grid place-items-center font-display text-[44px] text-white/70" data-testid="no-venue">ยังไม่มีข้อมูลสนาม "{race.course}" (เลือกสนามใน dock)</div>
        )}
      </motion.div>
      <motion.div initial={false} animate={{ opacity: modal ? 0 : 1 }} transition={{ duration: 0.4 }}>
        <IntroHeader race={race} tag="THE COURSE" />
      </motion.div>
      <AnimatePresence>
        {found && !modal && <motion.div key={`panels${race.intro.course.since}`} exit={{ opacity: 0, y: 60, transition: { duration: 0.35 } }}><Panels race={race} venue={found.venue} track={found.track} delay={delay} /></motion.div>}
      </AnimatePresence>
      <AnimatePresence>{modal && <HistoryModal key="history" race={race} />}</AnimatePresence>
    </div>
  );
}

export { GOINGS };
