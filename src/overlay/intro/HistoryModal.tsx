/**
 * The history modal over the course scene: a card per moment in the race's history (year big, title, text).
 * Playing a moment's video grows it out of its card to fill the modal with the sound fading in; with it the
 * date, the text and the horses in it. When the video ends (or is stopped) the sound fades out and it folds
 * back into its card.
 */
import { AnimatePresence, motion, usePresence } from "motion/react";
import { useEffect, useRef, useState } from "react";
import type { Race } from "../../lib/model";
import type { HistoryItem } from "../../lib/introSchema";
import { horseFor, playingItem } from "../../lib/intro";
import { getImage } from "../../lib/images";
import { failureOf, writeVideoStatus, type VideoState } from "../../lib/videoStatus";
import { useData } from "../../lib/store";
import { cx } from "../../lib/cx";
import { Flag } from "../../components/Flag";
import { HorseSilks } from "../../components/HorseSilks";
import { useLeaving } from "../leaving";
import { EASE, slant } from "./IntroHeader";

/** Sound fades in over this long at the start, and out over this long before the end (or when stopped). */
export const FADE_IN_MS = 1200, FADE_OUT_MS = 1200;
/**
 * The volume a video starts at, before it fades in. Not 0: Chrome counts a video at volume 0 as muted, lets it start
 * without a click on the page, then pauses it the moment the fade-in raises the volume ("Unmuting failed and the
 * element was paused instead…"). Just above 0, a page that may not play sound says so at play(), and we play muted.
 */
export const START_VOLUME = 0.01;
/** At most this many cards side by side; with more, the ones around the picked card. */
const MAX_CARDS = 5;

const dotDate = (d: string) => d.replaceAll("-", ".");

/** Ramp a video's volume to `to` over `ms` (cancels the ramp before it). */
function useVolumeRamp() {
  const raf = useRef(0);
  useEffect(() => () => cancelAnimationFrame(raf.current), []);
  return (v: HTMLVideoElement, to: number, ms: number, done?: () => void) => {
    cancelAnimationFrame(raf.current);
    const from = v.volume, t0 = performance.now();
    const step = (now: number) => {
      const k = Math.min(1, (now - t0) / ms);
      v.volume = Math.max(0, Math.min(1, from + (to - from) * k));
      v.dataset.volume = v.volume.toFixed(2);
      if (k < 1) raf.current = requestAnimationFrame(step);
      else done?.();
    };
    raf.current = requestAnimationFrame(step);
  };
}

function HorseChip({ name, small }: { name: string; small?: boolean }) {
  const d = useData();
  const h = horseFor(d, name);
  return (
    <span className={cx("flex items-center bg-white/12 font-display font-bold uppercase", small ? "gap-2 px-2.5 py-1 text-[20px]" : "gap-2.5 px-3 py-1.5 text-[26px]")} data-testid={small ? "history-card-horse" : "history-horse"}>
      {h?.trainedIn && <Flag code={h.trainedIn} className={small ? "h-[15px] w-[22px]" : "h-[20px] w-[30px]"} />}
      <HorseSilks horse={h} className={small ? "h-[24px] w-[32px]" : "h-[30px] w-[40px]"} />
      {name}
    </span>
  );
}

function Player({ item, at, onEnded }: { item: HistoryItem; at: number; onEnded: () => void }) {
  const d = useData();
  const rev = item.video ? d.images[item.video] : undefined;
  const [url, setUrl] = useState<string | null>(null);
  const ref = useRef<HTMLVideoElement>(null);
  const ramp = useVolumeRamp();
  const fadingOut = useRef(false);
  // stopped from the dock: nothing may start a new ramp after that (it would cancel the exit and leave the player on screen)
  const exiting = useRef(false);
  const [isPresent, safeToRemove] = usePresence();
  // tell the dock how it goes (videoStatus.ts); while playing, at most once a second
  const lastReport = useRef(0);
  const report = (state: VideoState, detail?: string) => {
    lastReport.current = Date.now();
    writeVideoStatus({ id: item.id, at, state, t: ref.current?.currentTime ?? 0, detail });
  };

  // the file from this browser's store: not there means the dock that picked it isn't in this browser
  useEffect(() => {
    let alive = true, made: string | null = null;
    report("loading");
    if (!item.video) return;
    getImage(item.video).then((b) => {
      if (!alive) return;
      if (!b) return report("missing");
      made = URL.createObjectURL(b);
      setUrl(made);
    }).catch((e) => alive && report("failed", String(e)));
    return () => { alive = false; if (made) URL.revokeObjectURL(made); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item.video, rev]);

  // a normal browser may refuse sound until the page has had a click (OBS plays it): play muted rather than not at
  // all, and let the first click on the overlay page bring the sound in
  const unmuteOnClick = useRef<(() => void) | null>(null);
  const playMuted = (v: HTMLVideoElement) => {
    v.muted = true;
    v.dataset.muted = "true";
    v.play().catch((e: DOMException) => { const f = failureOf(v.error ?? e); report(f.state, f.detail); });
    if (unmuteOnClick.current) return;
    const unmute = () => {
      if (exiting.current) return;
      v.muted = false;
      delete v.dataset.muted;
      ramp(v, 1, FADE_IN_MS);
      if (!v.paused) report("playing");
    };
    unmuteOnClick.current = unmute;
    document.addEventListener("pointerdown", unmute, { once: true });
  };
  useEffect(() => () => { if (unmuteOnClick.current) document.removeEventListener("pointerdown", unmuteOnClick.current); }, []);

  useEffect(() => {
    const v = ref.current;
    if (!v || !url) return;
    v.volume = START_VOLUME;
    v.dataset.volume = START_VOLUME.toFixed(2);
    // joining late (the page was reloaded while it played): carry on from where it should be
    const late = (Date.now() - at) / 1000;
    if (late > 1.5) v.currentTime = late;
    v.muted = false;
    // a hidden tab doesn't start videos until it is shown
    if (document.hidden) report("hidden");
    v.play().then(() => { if (!exiting.current && !v.muted) ramp(v, 1, FADE_IN_MS); }).catch((e: DOMException) => {
      if (e.name !== "NotAllowedError") return report(failureOf(v.error ?? e).state, failureOf(v.error ?? e).detail);
      playMuted(v);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url]);

  // paused by the browser, not by us (a sound policy we didn't see coming): carry on muted
  const onPause = () => {
    const v = ref.current;
    if (!v || exiting.current || v.ended || v.muted) return;
    playMuted(v);
  };

  // stopped from the dock: fade the sound out, then let the exit finish
  useEffect(() => {
    if (isPresent) return;
    exiting.current = true;
    const v = ref.current;
    if (!v) return safeToRemove?.();
    let gone = false;
    const finish = () => { if (gone) return; gone = true; v.pause(); safeToRemove?.(); };
    ramp(v, 0, Math.min(FADE_OUT_MS, 700), finish);
    // and a timer: animation frames stop in a hidden page, and the player has to go all the same
    const t = window.setTimeout(finish, 1000);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPresent]);

  const onTime = () => {
    const v = ref.current;
    if (!v) return;
    if (Date.now() - lastReport.current >= 1000 && !v.paused) report(v.muted ? "muted" : "playing");
    if (fadingOut.current || exiting.current || !v.duration) return;
    if (v.duration - v.currentTime <= FADE_OUT_MS / 1000) {
      fadingOut.current = true;
      ramp(v, 0, Math.max(100, (v.duration - v.currentTime) * 1000));
    }
  };

  return (
    <motion.div layoutId={`history-${item.id}`} data-testid="history-player" data-item={item.id}
      className="absolute inset-[28px] z-10 overflow-hidden bg-black shadow-[0_30px_80px_rgb(0_0_0/.6)]"
      transition={{ duration: 0.6, ease: EASE }}>
      {url && (
        <video ref={ref} src={url} playsInline className="absolute inset-0 h-full w-full object-cover" data-testid="history-video"
          onTimeUpdate={onTime} onPause={onPause} onPlaying={(e) => report(e.currentTarget.muted ? "muted" : "playing")}
          onError={(e) => { const f = failureOf(e.currentTarget.error); report(f.state, f.detail); }}
          onEnded={() => { report("ended"); onEnded(); }} />
      )}
      {/* lower third: date, title, text, the horses in it */}
      <motion.div className="absolute inset-x-0 bottom-0 grid gap-2 bg-[linear-gradient(180deg,transparent,rgb(2_8_50/.92)_38%)] px-12 pt-24 pb-10 text-white"
        initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0, transition: { delay: 0.7, duration: 0.5, ease: EASE } }} exit={{ opacity: 0 }}>
        <div className="flex items-center gap-4">
          {(item.date || item.year) && <span className="bg-yellow px-5 py-0.5 font-display text-[30px] font-bold text-navy" style={slant(12)} data-testid="history-date">{item.date ? dotDate(item.date) : item.year}</span>}
          <span className="font-display text-[48px] leading-none font-bold uppercase" data-testid="history-title">{item.title}</span>
        </div>
        {item.text && <p className="m-0 max-w-[1400px] text-[26px] leading-snug text-white/90">{item.text}</p>}
        {item.horses.length > 0 && <div className="flex flex-wrap gap-2">{item.horses.map((n) => <HorseChip key={n} name={n} />)}</div>}
      </motion.div>
    </motion.div>
  );
}

function Card({ item, on, dim }: { item: HistoryItem; on: boolean; dim: boolean }) {
  return (
    <motion.article layoutId={`history-${item.id}`} data-testid="history-card" data-item={item.id} data-on={on ? "" : undefined}
      className={cx("relative flex min-w-0 flex-1 flex-col gap-3 overflow-hidden border-t-[6px] bg-[linear-gradient(180deg,rgb(18_32_150/.75),rgb(6_12_70/.85))] px-7 pt-6 pb-7 text-white",
        on ? "border-yellow shadow-[0_0_0_3px_var(--color-yellow),0_20px_60px_rgb(0_0_0/.5)]" : "border-white/40")}
      initial={{ opacity: 0, y: 60 }} animate={{ opacity: dim ? 0.45 : 1, y: 0, scale: on ? 1.03 : 1 }} exit={{ opacity: 0, y: 40 }}
      transition={{ duration: 0.5, ease: EASE }}>
      <span className="font-display text-[110px] leading-[.85] font-extrabold text-yellow">{item.year ?? "—"}</span>
      <span className="font-display text-[38px] leading-tight font-bold uppercase">{item.title}</span>
      {item.text && <p className="m-0 line-clamp-6 text-[23px] leading-snug text-white/85">{item.text}</p>}
      {/* the horses in it and the date, along the bottom */}
      {(item.horses.length > 0 || item.date) && (
        <div className="mt-auto grid gap-2 border-t border-white/15 pt-4">
          {item.horses.length > 0 && <div className="flex flex-wrap gap-1.5">{item.horses.slice(0, 4).map((n) => <HorseChip key={n} name={n} small />)}</div>}
          {item.date && <span className="font-display text-[22px] font-semibold tracking-[.1em] text-white/60">{dotDate(item.date)}</span>}
        </div>
      )}
      {item.video && <span className="absolute top-5 right-5 grid size-[46px] place-items-center rounded-full border-2 border-white/70 text-[20px]" aria-label="มีวิดีโอ">▶</span>}
    </motion.article>
  );
}

export function HistoryModal({ race }: { race: Race }) {
  const leaving = useLeaving();
  const h = race.intro.history;
  const [endedAt, setEndedAt] = useState<number | null>(null);
  // playing until the video ends (or was over before this page loaded, e.g. OBS reloaded the source)
  const live = playingItem(race);
  const playing = h.play && endedAt !== h.play.at && live ? live : undefined;
  const sel = playing?.id ?? h.selected;
  const at = Math.max(0, h.items.findIndex((x) => x.id === sel));
  const from = Math.min(Math.max(0, at - Math.floor(MAX_CARDS / 2)), Math.max(0, h.items.length - MAX_CARDS));
  const cards = h.items.slice(from, from + MAX_CARDS);
  return (
    <motion.div data-testid="history-modal" className="absolute inset-x-[80px] top-[64px] bottom-[64px] overflow-hidden border border-white/15 bg-[rgb(3_8_60/.82)] shadow-[0_40px_120px_rgb(0_0_0/.55)] backdrop-blur-[10px]"
      initial={{ opacity: 0, scale: 0.96, y: 30 }} animate={leaving ? { opacity: 0 } : { opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.97, y: 30 }}
      transition={{ duration: 0.5, ease: EASE }}>
      <div className="absolute top-0 left-0 h-full w-[10px] bg-yellow" />
      <div className="flex items-center gap-6 px-14 pt-10">
        <span className="bg-yellow px-7 py-1 font-display text-[28px] font-bold tracking-[.14em] text-navy" style={slant(14)}>RACE HISTORY</span>
        <span className="font-display text-[56px] leading-none font-bold uppercase text-white">{race.name}</span>
      </div>
      <div className="absolute inset-x-14 top-[150px] bottom-12 flex items-stretch gap-6">
        <AnimatePresence mode="popLayout">
          {cards.map((x) => (playing?.id === x.id ? <div key={x.id} className="flex-1" /> : <Card key={x.id} item={x} on={x.id === sel} dim={!!sel && x.id !== sel} />))}
        </AnimatePresence>
        {!h.items.length && <div className="m-auto font-display text-[40px] text-white/60">ยังไม่มีเหตุการณ์ (เพิ่มใน dock)</div>}
      </div>
      <AnimatePresence>
        {playing && h.play && <Player key={h.play.at} item={playing} at={h.play.at} onEnded={() => setEndedAt(h.play!.at)} />}
      </AnimatePresence>
    </motion.div>
  );
}
