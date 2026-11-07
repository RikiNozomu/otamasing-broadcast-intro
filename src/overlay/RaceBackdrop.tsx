/**
 * What the compact racecard and result page share (1920x1080): the scene's pictures full screen behind a
 * navy gradient, the logo top right, the race title on top (name with its grade and class badges, then
 * date · round · course · distance) and the page number bottom right.
 */
import { AnimatePresence, motion } from "motion/react";
import { useLayoutEffect, useRef, type ReactNode } from "react";
import { CLASSES, type PhotoSet, type Race } from "../lib/model";
import { GRADE_COLOR } from "../lib/colors";
import { gradeLabel } from "../lib/labels";
import { useData } from "../lib/store";
import { useImage } from "../lib/images";
import { useShownIndex } from "../lib/photos";
import { cx } from "../lib/cx";
import { Logo } from "../components/Logo";

export const pill = "inline-flex items-center justify-center whitespace-nowrap rounded-full font-display font-bold leading-none [text-shadow:none]";

/** Left and right margin of the title and the table. */
export const SIDE = 60;
/** Width of the table: the whole screen less the margins. */
export const TABLE_W = 1920 - 2 * SIDE;
/** Where the table starts (its header). */
export const TABLE_TOP = 262;

/** One picture of the slideshow; it fades in once it has loaded (and out when the next one comes). */
function Picture({ k, rev }: { k: string; rev: number | undefined }) {
  const url = useImage(k, rev);
  return (
    <motion.div data-testid="photo" data-key={k} className="absolute inset-0 bg-cover bg-center"
      style={{ backgroundImage: url ? `url("${url}")` : undefined }}
      initial={{ opacity: 0 }} animate={{ opacity: url ? 1 : 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.8, ease: "easeInOut" }} />
  );
}

/** The scene's pictures full screen (a slideshow when there are several) under a navy gradient; a blue glow when there is none. */
export function RacePhoto({ photos }: { photos: PhotoSet }) {
  const data = useData();
  // pictures that are not in this browser (e.g. after importing a file) are skipped
  const set = { ...photos, keys: photos.keys.filter((k) => data.images[k]) };
  const i = useShownIndex(set);
  const key = i >= 0 ? set.keys[i] : null;
  return (
    <>
      <div className="absolute inset-0 bg-[radial-gradient(60%_70%_at_30%_35%,#1d2f9e_0%,#0b1a86_55%,var(--color-scene)_100%)]" />
      <AnimatePresence initial={false}>
        {key && <Picture key={key} k={key} rev={data.images[key]} />}
      </AnimatePresence>
      {/* the filter: darker at the top behind the title and towards the bottom, the picture shows through the middle */}
      <div data-testid="photo-filter" className="absolute inset-0 bg-[linear-gradient(180deg,rgb(0_21_125/.92)_0%,rgb(0_21_125/.62)_30%,rgb(0_21_125/.55)_60%,rgb(0_10_70/.88)_100%)]" />
      <Logo className="absolute top-[34px] right-[60px] w-40" />
    </>
  );
}

/**
 * The title on top: the race name with the grade and class badges right after it (the name shrinks until
 * the line fits beside the logo), then date · round · course · distance. `tag` goes before those facts (e.g. RESULT).
 */
export function RaceTitle({ race, tag }: { race: Race; tag?: ReactNode }) {
  const S = race.style, show = S.show;
  const lineRef = useRef<HTMLDivElement>(null);
  const nameRef = useRef<HTMLDivElement>(null);
  const maxWidth = 1920 - SIDE - SIDE - 160 - 50; // up to the logo
  const cls = race.class ? CLASSES[race.class] : null;
  const showGrade = !!(show.grade && race.grade), showClass = !!(show.class && cls);
  useLayoutEffect(() => {
    const line = lineRef.current, name = nameRef.current;
    if (!line || !name) return;
    let s = 104;
    name.style.fontSize = s + "px";
    while (line.scrollWidth > maxWidth && s > 48) { s -= 4; name.style.fontSize = s + "px"; }
  }, [race.name, showGrade, showClass, race.grade, race.class, maxWidth]);
  const distance = [race.surface, race.distanceM ? `${race.distanceM} meters` : ""].filter(Boolean).join(" ");
  const facts = [race.date.replaceAll("-", "."), race.round, race.course, distance].filter(Boolean);
  return (
    <div className="absolute grid gap-1.5 text-white [text-shadow:0_2px_14px_rgb(0_0_0/.45)]" style={{ left: SIDE, top: 40 }}>
      <div ref={lineRef} data-testid="title-line" className="flex w-max items-center gap-5">
        <div ref={nameRef} data-testid="race-name" className="font-display text-[104px] leading-[.95] font-bold tracking-[-.005em] whitespace-nowrap uppercase">{race.name}</div>
        {showGrade && <span data-testid="grade" className={cx(pill, "h-[52px] flex-none px-6 text-[36px] text-white")} style={{ background: GRADE_COLOR[race.grade!] }}>{gradeLabel(race, S)}</span>}
        {showClass && <span data-testid="class" className={cx(pill, "h-[52px] flex-none px-6 text-[36px] text-white")} style={{ background: cls!.color }}>{cls!.label}</span>}
      </div>
      <div className="flex items-center gap-4">
        {tag}
        <div data-testid="race-facts" className="font-display text-[40px] leading-[1.2] font-semibold tracking-[.02em] uppercase">
          {facts.map((f, i) => <span key={i}>{i > 0 && <span className="px-3 text-white/55">·</span>}{f}</span>)}
        </div>
      </div>
    </div>
  );
}

/** "PAGE 1 / 2" bottom right while there is more than one page. */
export function PageCount({ page, count }: { page: number; count: number }) {
  if (count < 2) return null;
  return (
    <div data-testid="page-count" className="absolute bottom-[26px] flex items-center gap-2" style={{ right: SIDE }} aria-label={`หน้า ${page + 1} จาก ${count}`}>
      {Array.from({ length: count }, (_, i) => (
        <span key={i} className={cx("h-2.5 rounded-full transition-all duration-300", i === page ? "w-10 bg-yellow" : "w-2.5 bg-white/45")} />
      ))}
    </div>
  );
}
