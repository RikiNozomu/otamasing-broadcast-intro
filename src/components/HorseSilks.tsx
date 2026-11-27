/** A horse's silks from the horse tab: the picture from the shared silks list (nothing when there is none). */
import type { Horse } from "../lib/horses";
import { silksUrl } from "@otamasing/broadcast-shared/lib/silks";
import { Silks } from "@otamasing/broadcast-shared/components/Silks";

export const HorseSilks = ({ horse, className }: { horse: Horse | undefined; className?: string }) => <Silks name={horse?.silks ?? ""} className={className} />;

/** Whether HorseSilks would draw something (so a layout can keep or drop its place). */
export const hasSilks = (horse: Horse | undefined): boolean => !!silksUrl(horse?.silks ?? "");
