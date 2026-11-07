/**
 * The horse scene (1920x1080). The horse's picture sharp on the left third; on the right, beside the
 * picture, the trained-in flag and the name, then "SIRE – DAM (by BMS)", then the owner (O) and trainer (T).
 * Below that the pages: page 1 is the profile (foaled, sex, coat, born in, trained in, owner with silks,
 * trainer, record, prize money), page 2 the pedigree (three generations as a knockout bracket), the next pages
 * the past races newest first. With auto on, the pages take turns.
 */
import { AnimatePresence, motion } from "motion/react";
import { createContext, useContext, useLayoutEffect, useRef, type ReactNode } from "react";
import { careerPage, COATS, dotDate, earningsIn, horsePageKinds, silksModeOf, moneyText, posText, recordText, sexText, useHorsePage, CAREER_ROWS, type CareerRace, type Horse } from "../lib/horses";
import { useData } from "../lib/store";
import { useImage } from "../lib/images";
import { useShownIndex } from "../lib/photos";
import { GRADE_COLOR } from "../lib/colors";
import { cx } from "../lib/cx";
import { Flag } from "../components/Flag";
import { FitText } from "../components/FitText";
import { Logo } from "../components/Logo";
import { SilksSvg } from "../components/SilksSvg";
import { PageCount, pill } from "./RaceBackdrop";
import { cell, headClass, headLeft, rowMotion } from "./RacecardScene";

/** Width of the picture on the left (a third of the screen). */
export const PHOTO_W = 640;
/** Where the text on the right starts, and its width up to the right margin. */
const RIGHT = 60;
/** Where the text starts and how wide it is: beside the picture, or the whole screen when the horse has no picture. */
type Area = { left: number; w: number };
const BESIDE_PHOTO: Area = { left: PHOTO_W + 60, w: 1920 - PHOTO_W - 60 - RIGHT };
const FULL: Area = { left: 60, w: 1920 - 60 - RIGHT };
const AreaCtx = createContext<Area>(BESIDE_PHOTO);
/** The text area moves smoothly when a picture is added or removed. */
const areaMove = "transition-[left,width] duration-500 ease-in-out";
/** The page heading (PROFILE, PEDIGREE, RACE RECORD) and the page under it. */
const HEADING_TOP = 270, CONTENT_TOP = 340;
const ROW_H = 86;

/** A country's English name ("JP" → "Japan"), for the overlay. */
const REGION = new Intl.DisplayNames(["en"], { type: "region" });
const countryName = (c: string) => { try { return REGION.of(c) ?? c; } catch { return c; } };

/** Colour of a grade pill: "Jpn1" and the jump grade "JG-1" like G1, anything else (OP…) a muted blue unless known. */
const gradeColor = (g: string) => GRADE_COLOR[g.replace(/^(Jpn|JG-?)/i, "G").toUpperCase()] ?? "#4A5590";

/** Light blue for the male side, light red for the female side. */
export const MALE_BG = "#CDE6FF", FEMALE_BG = "#FFD3DA";
/** Light blue for a male, light red for a female, white for a gelding (and when not known). */
const sexBg = (sex: Horse["sex"]) => (sex === "F" ? FEMALE_BG : sex === "M" ? MALE_BG : "#FFFFFF");
/** A pedigree box: the same colour, a little see-through, lighter at the top and deeper at the bottom for depth. */
const boxBg = (sex: Horse["sex"]) => {
  const [top, bottom] = sex === "F" ? ["#FFE6EA", "#F4A9B6"] : sex ? ["#E6F3FF", "#9CC8F2"] : ["#FFFFFF", "#D5DAE6"];
  return `linear-gradient(180deg, ${top}E6 0%, ${bottom}C7 100%)`;
};

/** Real gold, silver and bronze for the first three places (the text stays navy, white on bronze). */
export const MEDAL: Record<number, { background: string; color: string }> = {
  1: { background: "linear-gradient(135deg,#FFF1A8 0%,#F2C94C 30%,#C9971C 62%,#F6D86B 100%)", color: "#3A2A00" },
  2: { background: "linear-gradient(135deg,#FFFFFF 0%,#D9DEE3 32%,#A7B0B8 64%,#E6EAEE 100%)", color: "#1F2A36" },
  3: { background: "linear-gradient(135deg,#F7C08A 0%,#CD7F32 38%,#8C4F1C 70%,#D8935A 100%)", color: "#FFFFFF" },
};

function Badge({ letter }: { letter: string }) {
  return <span className="grid size-[44px] flex-none place-items-center rounded-[6px] bg-yellow font-display text-[30px] font-bold text-navy [text-shadow:none]">{letter}</span>;
}

/** One picture of the slideshow: sharp on the left third, and faintly across the whole screen behind. Fades in once loaded. */
function HorsePicture({ k, rev }: { k: string; rev: number | undefined }) {
  const url = useImage(k, rev);
  const fade = { initial: { opacity: 0 }, animate: { opacity: url ? 1 : 0 }, exit: { opacity: 0 }, transition: { duration: 0.8, ease: "easeInOut" } } as const;
  return (
    <>
      <motion.div {...fade} animate={{ opacity: url ? 0.35 : 0 }} className="absolute inset-0 scale-110 bg-cover bg-center blur-[18px]" style={{ backgroundImage: url ? `url("${url}")` : undefined }} />
      <motion.div {...fade} data-testid="horse-photo-img" data-key={k} className="absolute inset-y-0 left-0 bg-cover bg-center" style={{ width: PHOTO_W, backgroundImage: url ? `url("${url}")` : undefined }} />
    </>
  );
}

/** The horse's pictures (a slideshow when there are several), the navy over them, and the logo. */
function HorsePhoto({ h }: { h: Horse }) {
  const d = useData();
  // pictures that are not in this browser (e.g. after importing a file) are skipped
  const set = { ...h.photos, keys: h.photos.keys.filter((k) => d.images[k]) };
  const i = useShownIndex(set);
  const key = i >= 0 ? set.keys[i] : null;
  // no picture: the navy fills the screen and the text takes the whole width
  if (!set.keys.length) return (
    <>
      <div data-testid="horse-photo" className="absolute inset-0 bg-[linear-gradient(180deg,rgb(0_21_125/.9)_0%,rgb(0_21_125/.8)_45%,rgb(0_10_70/.94)_100%)]" />
      <Logo className="absolute top-[34px] right-[60px] w-40" />
    </>
  );
  return (
    <>
      <AnimatePresence initial={false}>
        {key && <HorsePicture key={key} k={key} rev={d.images[key]} />}
      </AnimatePresence>
      {/* the navy over the right of the screen (the blurred picture shows through) */}
      <div className="absolute inset-y-0 right-0 bg-[linear-gradient(180deg,rgb(0_21_125/.9)_0%,rgb(0_21_125/.8)_45%,rgb(0_10_70/.94)_100%)]" style={{ left: PHOTO_W }} />
      <div data-testid="horse-photo" data-has={key ? "" : undefined} className="pointer-events-none absolute inset-y-0 left-0 overflow-hidden" style={{ width: PHOTO_W }}>
        {!key && (
          <div className="absolute inset-0 grid place-items-center bg-[radial-gradient(70%_60%_at_50%_45%,#1d2f9e_0%,#0b1a86_60%,var(--color-scene)_100%)]">
            <Logo className="w-56 opacity-30" />
          </div>
        )}
        {/* the right edge melts into the navy, and a yellow rule marks the edge */}
        <div className="absolute inset-y-0 right-0 w-40 bg-[linear-gradient(90deg,transparent,rgb(0_21_125/.85))]" />
      </div>
      <div className="absolute inset-y-0 w-[6px] bg-yellow" style={{ left: PHOTO_W - 6 }} />
      <Logo className="absolute top-[34px] right-[60px] w-40" />
    </>
  );
}

/** Name, pedigree, connections. The name shrinks until it fits beside the logo. */
function Header({ h }: { h: Horse }) {
  const { left, w: W } = useContext(AreaCtx);
  const nameRef = useRef<HTMLDivElement>(null);
  const lineRef = useRef<HTMLDivElement>(null);
  const maxWidth = W - 160 - 40;
  useLayoutEffect(() => {
    const line = lineRef.current, name = nameRef.current;
    if (!line || !name) return;
    let s = 112;
    name.style.fontSize = s + "px";
    while (line.scrollWidth > maxWidth && s > 52) { s -= 4; name.style.fontSize = s + "px"; }
  }, [h.name, h.trainedIn, h.sex, maxWidth]);
  const pedigree = [h.sire, h.dam].filter(Boolean).join(" – ");
  return (
    <div className={cx("absolute grid gap-2 text-white [text-shadow:0_2px_14px_rgb(0_0_0/.45)]", areaMove)} style={{ left, top: 44, width: W }}>
      <div ref={lineRef} className="flex w-max items-center gap-5">
        <Flag code={h.trainedIn} className="h-[60px] w-[90px] rounded-[5px]" />
        <div ref={nameRef} data-testid="horse-name" className="font-display text-[112px] leading-[.95] font-bold whitespace-nowrap uppercase">{h.name}</div>
        {h.sex && <span data-testid="horse-sex" className={cx(pill, "h-[52px] flex-none px-6 text-[36px] text-navy")} style={{ background: sexBg(h.sex) }}>{sexText(h)}</span>}
      </div>
      {(pedigree || h.bms) && (
        <div data-testid="pedigree" className="font-display text-[40px] leading-[1.15] font-semibold tracking-[.02em] uppercase">
          {pedigree}{h.bms && <span className="text-white/70">{pedigree ? " " : ""}(by {h.bms})</span>}
        </div>
      )}
      <div className="mt-1 flex min-w-0 items-center gap-8 font-display text-[34px] font-semibold uppercase">
        {/* one line each: a long owner is squeezed to fit, the trainer keeps its width */}
        {h.owner && <span data-testid="owner" className="flex min-w-0 items-center gap-3"><Badge letter="O" /><FitText grow={false}>{h.owner}</FitText></span>}
        {h.trainer && <span data-testid="trainer" className="flex flex-none items-center gap-3 whitespace-nowrap"><Badge letter="T" />{h.trainer}</span>}
      </div>
    </div>
  );
}

/** One cell of the profile. `color` tints its value (e.g. the sex). */
function Fact({ i, label, testId, span = 3, color, children }: { i: number; label: string; testId: string; span?: number; color?: string; children: ReactNode }) {
  return (
    <motion.div {...rowMotion(i)} data-testid={testId} style={{ gridColumn: `span ${span}`, color }}
      className="grid min-w-0 content-center gap-1 bg-[linear-gradient(90deg,var(--color-band)_70%,rgb(44_48_96/.4))] px-7 py-3 text-white">
      <span className="font-display text-[24px] font-bold tracking-[.08em] text-yellow">{label}</span>
      <span className="flex min-w-0 items-center gap-4 font-display text-[44px] leading-[1.1] font-bold uppercase">{children}</span>
    </motion.div>
  );
}

function Profile({ h }: { h: Horse }) {
  const d = useData();
  const mode = silksModeOf(h);
  const silks = useImage(h.silksImage ?? "", mode === "upload" && h.silksImage ? d.images[h.silksImage] : undefined);
  const money = earningsIn(h, d.horseSettings);
  const coat = h.coat ? COATS[h.coat] : null;
  const dash = <span className="text-white/50">–</span>;
  const place = (c: string) => (c ? <><Flag code={c} className="h-[34px] w-[51px]" /><FitText>{countryName(c)}</FitText></> : dash);
  return (
    <div data-testid="horse-profile" className="grid grid-cols-6 gap-x-4 gap-y-3" style={{ gridAutoRows: 128 }}>
      <Fact i={0} span={2} label="FOALED" testId="fact-foaled">{h.foaled ? dotDate(h.foaled) : dash}</Fact>
      <Fact i={1} span={2} label="SEX" testId="fact-sex" color={h.sex ? sexBg(h.sex) : undefined}>
        {h.sex ? <FitText>{sexText(h)}</FitText> : dash}
      </Fact>
      <Fact i={2} span={2} label="COLOR" testId="fact-coat">
        {coat ? <><span className="size-[40px] flex-none rounded-[4px] shadow-[0_0_0_3px_#fff]" style={{ background: coat.color }} /><FitText>{h.coat}</FitText></> : dash}
      </Fact>
      <Fact i={3} label="BORN IN" testId="fact-born">{place(h.bornIn)}</Fact>
      <Fact i={4} label="TRAINED IN" testId="fact-trained">{place(h.trainedIn)}</Fact>
      <Fact i={5} label="OWNER" testId="fact-owner">
        {/* the uploaded picture (PNG or SVG) or the silks drawn by the app, whole on a light tile */}
        {((mode === "upload" && silks) || (mode === "pattern" && h.silks)) && (
          <span data-testid="silks" className="grid h-[72px] w-[116px] flex-none place-items-center overflow-hidden rounded-[8px] bg-white p-1 shadow-[0_0_0_3px_rgb(255_255_255/.35)]">
            {silks ? <img src={silks} alt="" className="h-full w-full object-contain" /> : <SilksSvg silks={h.silks!} className="h-full w-full" />}
          </span>
        )}
        {/* a long owner (several partners) wraps onto up to three smaller lines instead of being squeezed thin */}
        {!h.owner ? dash : h.owner.length > 40
          ? <span data-testid="owner-wrap" className="line-clamp-3 min-w-0 flex-1 text-[24px] leading-[1.05] whitespace-normal">{h.owner}</span>
          : <FitText>{h.owner}</FitText>}
      </Fact>
      <Fact i={6} label="TRAINER" testId="fact-trainer">{h.trainer ? <FitText>{h.trainer}</FitText> : dash}</Fact>
      <Fact i={7} label="RECORD" testId="fact-record">{recordText(h.record)}</Fact>
      <Fact i={8} label="EARNINGS" testId="fact-earnings">
        {money ? <FitText>{money.converted && <span className="text-white/60">≈ </span>}{moneyText(money.amount, money.currency)}</FitText> : dash}
      </Fact>
    </div>
  );
}

const COLS = "minmax(0,1.75fr) minmax(0,1.05fr) 82px 128px 150px minmax(0,1.2fr)";
const td = cx(cell, "overflow-hidden whitespace-nowrap bg-band px-4 font-display text-[34px] font-semibold");

function CareerRow({ r, i }: { r: CareerRace; i: number }) {
  const dim = r.outcome != null;
  const winner = r.other ? (r.finish === 1 ? `(${r.other})` : r.other) : "";
  return (
    <motion.div {...rowMotion(i, dim)} data-testid="career-row" className="grid items-center gap-2 py-1 text-white" style={{ height: ROW_H, gridTemplateColumns: COLS }}>
      <span className={cx(cell, "grid content-center gap-0.5 overflow-hidden bg-[linear-gradient(90deg,var(--color-band)_80%,rgb(44_48_96/.35))] px-5")}>
        <span className="flex min-w-0 items-center gap-3 font-display text-[34px] leading-none font-bold uppercase">
          <FitText grow={false}>{r.name}</FitText>
          {r.grade && <span data-testid="career-grade" className={cx(pill, "h-[30px] flex-none px-3 text-[22px] text-white")} style={{ background: gradeColor(r.grade) }}>{r.grade}</span>}
        </span>
        <span className="font-display text-[22px] leading-none font-semibold tracking-[.04em] text-white/70">{dotDate(r.date)}</span>
      </span>
      <span className={cx(cell, "grid content-center gap-0.5 overflow-hidden bg-band px-4 uppercase")}>
        <FitText className="font-display text-[30px] leading-none font-bold">{r.course || "–"}</FitText>
        <span className="font-display text-[22px] leading-none font-semibold text-white/70">{[r.surface, r.distanceM ? `${r.distanceM}m` : ""].filter(Boolean).join(" ")}</span>
      </span>
      <span className={cx(td, "justify-center")}>{r.fav ?? "–"}</span>
      <span data-testid="career-pos" data-medal={r.finish && MEDAL[r.finish] ? r.finish : undefined} className={cx(td, "justify-center font-bold")}
        style={r.finish && !r.outcome ? MEDAL[r.finish] : undefined}>{posText(r)}</span>
      <span className={cx(td, "justify-center")}>{r.time || "–"}</span>
      <span data-testid="career-winner" className={cx(td, "uppercase")}><FitText>{winner || "–"}</FitText></span>
    </motion.div>
  );
}

function Career({ h, page }: { h: Horse; page: number }) {
  const rows = careerPage(h, page);
  return (
    <div data-testid="horse-career" className="grid content-start">
      <div className={headClass} style={{ gridTemplateColumns: COLS }}>
        <span className={headLeft}>RACE</span><span className="px-4 text-left">COURSE</span><span>FAV</span><span>POS</span><span>TIME</span><span className="px-4 text-left">WINNER (2ND)</span>
      </div>
      {rows.map((r, i) => <CareerRow key={`${r.date}${r.name}${i}`} r={r} i={i} />)}
      {/* keep the table the same height on a short last page */}
      {rows.length < CAREER_ROWS && <div style={{ height: (CAREER_ROWS - rows.length) * ROW_H }} />}
    </div>
  );
}

/** Pedigree box sizes and columns: the horse, its parents, its grandparents (left to right). */
const BOX_H = 112, PED_GAP = 70, PED_H = 640;
type PedBox = { col: number; y: number; label: string; name: string; sex: Horse["sex"]; id: string };

/** Three generations as a knockout bracket: each pair on the right joins with a line into the one it comes from. */
function Pedigree({ h }: { h: Horse }) {
  // three columns share the width (340 px boxes beside a picture, wider on the whole screen)
  const { w: W } = useContext(AreaCtx);
  const BOX_W = (W - 2 * PED_GAP) / 3, COL_X = [0, 1, 2].map((c) => c * (BOX_W + PED_GAP));
  const ys4 = [0, 1, 2, 3].map((k) => (PED_H / 4) * (k + 0.5));
  const ys2 = [(ys4[0] + ys4[1]) / 2, (ys4[2] + ys4[3]) / 2];
  const boxes: PedBox[] = [
    { col: 0, y: (ys2[0] + ys2[1]) / 2, label: "", name: h.name, sex: h.sex, id: "self" },
    { col: 1, y: ys2[0], label: "SIRE", name: h.sire, sex: "M", id: "sire" },
    { col: 1, y: ys2[1], label: "DAM", name: h.dam, sex: "F", id: "dam" },
    { col: 2, y: ys4[0], label: "SIRE'S SIRE", name: h.sireSire, sex: "M", id: "sireSire" },
    { col: 2, y: ys4[1], label: "SIRE'S DAM", name: h.sireDam, sex: "F", id: "sireDam" },
    { col: 2, y: ys4[2], label: "DAM'S SIRE", name: h.bms, sex: "M", id: "damSire" },
    { col: 2, y: ys4[3], label: "DAM'S DAM", name: h.damDam, sex: "F", id: "damDam" },
  ];
  /** The bracket from a pair (y1, y2) in column `col` into the box at y in the column before. */
  const join = (col: number, y1: number, y2: number, y: number) => {
    const xr = COL_X[col], xl = COL_X[col - 1] + BOX_W, xm = (xl + xr) / 2;
    return `M${xr} ${y1} H${xm} V${y2} H${xr} M${xm} ${y} H${xl}`;
  };
  const lines = [join(1, ys2[0], ys2[1], boxes[0].y), join(2, ys4[0], ys4[1], ys2[0]), join(2, ys4[2], ys4[3], ys2[1])];
  return (
    <div data-testid="horse-pedigree" className="relative" style={{ height: PED_H }}>
      <svg className="absolute inset-0 overflow-visible" width={W} height={PED_H} aria-hidden="true">
        {lines.map((d, i) => (
          <motion.path key={i} d={d} fill="none" stroke="#FFFFFF" strokeWidth={5} strokeLinejoin="miter"
            initial={{ pathLength: 0, opacity: 0 }} animate={{ pathLength: 1, opacity: 1, transition: { duration: 0.6, delay: 0.3 + i * 0.1, ease: "easeInOut" } }}
            // on a page change the lines go with the boxes (without this they stayed until the old page was dropped)
            exit={{ opacity: 0, transition: { duration: 0.2, ease: "easeOut" } }} />
        ))}
      </svg>
      {boxes.map((b, i) => (
        <motion.div key={b.id} {...rowMotion(i)} data-testid={`ped-${b.id}`} data-sex={b.sex ?? undefined}
          className="absolute grid content-center gap-0.5 rounded-[6px] px-5 text-navy shadow-[0_6px_18px_rgb(0_0_0/.35),inset_0_1px_0_rgb(255_255_255/.7)] backdrop-blur-[2px]"
          style={{ left: COL_X[b.col], top: b.y - BOX_H / 2, width: BOX_W, height: BOX_H, background: boxBg(b.sex) }}>
          {b.label && <span className="font-display text-[20px] leading-none font-bold tracking-[.08em] text-navy/60">{b.label}</span>}
          <FitText className={cx("font-display leading-[1.1] font-bold uppercase", b.col === 0 ? "text-[42px]" : "text-[36px]")}>{b.name || "–"}</FitText>
        </motion.div>
      ))}
    </div>
  );
}

export function HorseScene({ horse: h }: { horse: Horse }) {
  const { page, count } = useHorsePage(h);
  const kinds = horsePageKinds(h);
  const k = kinds[page] ?? kinds[0];
  const kind = k.kind;
  const racePages = kinds.filter((x) => x.kind === "races").length;
  const d = useData();
  const area = h.photos.keys.some((key) => d.images[key]) ? BESIDE_PHOTO : FULL;
  const { left, w: W } = area;
  const heading = kind === "profile" ? "PROFILE" : kind === "pedigree" ? "PEDIGREE" : `RACE RECORD${racePages > 1 && k.kind === "races" ? ` ${k.n + 1}/${racePages}` : ""}`;
  return (
    <AreaCtx.Provider value={area}>
    <div className="absolute inset-0 overflow-hidden bg-scene" data-testid="horse" data-horse={h.id} data-page={page + 1} data-full={area === FULL ? "" : undefined}>
      <HorsePhoto h={h} />
      <Header h={h} />
      <div className={cx("absolute flex items-center gap-4", areaMove)} style={{ left, top: HEADING_TOP, width: W }}>
        <AnimatePresence initial={false} mode="popLayout">
          <motion.span key={heading} data-testid="horse-page-title"
            className="bg-yellow px-4 py-1.5 font-display text-[30px] leading-none font-bold tracking-[.08em] text-navy"
            initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -40 }} transition={{ duration: 0.35, ease: "easeOut" }}>
            {heading}
          </motion.span>
        </AnimatePresence>
        <span className="h-[3px] flex-1 bg-[linear-gradient(90deg,rgb(255_255_255/.5),transparent)]" />
      </div>
      <div className={cx("absolute", areaMove)} style={{ left, top: CONTENT_TOP, width: W }}>
        <AnimatePresence initial={false} mode="popLayout">
          <motion.div key={page} exit={{ opacity: 1 }} transition={{ duration: 0.4 }}>
            {kind === "profile" ? <Profile h={h} /> : kind === "pedigree" ? <Pedigree h={h} /> : <Career h={h} page={page} />}
          </motion.div>
        </AnimatePresence>
      </div>
      <PageCount page={page} count={count} />
    </div>
    </AreaCtx.Provider>
  );
}
