/** A horse's silks from the horse tab: the uploaded picture or the pattern drawn by the app (nothing when there is none). */
import { silksModeOf, type Horse } from "../lib/horses";
import { useImage } from "../lib/images";
import { useData } from "../lib/store";
import { cx } from "../lib/cx";
import { SilksSvg } from "./SilksSvg";

export function HorseSilks({ horse, className }: { horse: Horse | undefined; className?: string }) {
  const d = useData();
  const mode = horse ? silksModeOf(horse) : "none";
  const url = useImage(horse?.silksImage ?? "", mode === "upload" && horse?.silksImage ? d.images[horse.silksImage] : undefined);
  if (!horse || mode === "none" || (mode === "upload" && !url) || (mode === "pattern" && !horse.silks)) return null;
  return (
    <span data-testid="silks" className={cx("grid flex-none place-items-center", className)}>
      {url ? <img src={url} alt="" className="h-full w-full object-contain" /> : <SilksSvg silks={horse.silks!} className="h-full w-full" />}
    </span>
  );
}

/** Whether HorseSilks would draw something (so a layout can keep or drop its place). */
export function hasSilks(horse: Horse | undefined, images: Record<string, number>): boolean {
  if (!horse) return false;
  const mode = silksModeOf(horse);
  return (mode === "pattern" && !!horse.silks) || (mode === "upload" && !!horse.silksImage && !!images[horse.silksImage]);
}
