/**
 * Pieces of the scenes (1920x1080): the race's pictures full screen behind a navy gradient (the STARTING GATE's
 * background), the badge style and the page dots bottom right.
 */
import { AnimatePresence, motion } from "motion/react";
import type { PhotoSet } from "../lib/model";
import { useData } from "../lib/store";
import { useImage } from "../lib/images";
import { useShownIndex } from "../lib/photos";
import { cx } from "../lib/cx";
import { Logo } from "../components/Logo";

export const pill = "inline-flex items-center justify-center whitespace-nowrap rounded-full font-display font-bold leading-none [text-shadow:none]";

/** Left and right margin of the scenes. */
const SIDE = 60;

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
export function RacePhoto({ photos, logo = true }: { photos: PhotoSet; logo?: boolean }) {
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
      {logo && <Logo className="absolute top-[34px] right-[60px] w-40" />}
    </>
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
