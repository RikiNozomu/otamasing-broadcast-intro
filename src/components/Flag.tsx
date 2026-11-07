/** A national flag image by ISO code; nothing for "" or an unknown code. Size comes from className. */
import { flagUrl } from "../lib/flags";
import { cx } from "../lib/cx";

export function Flag({ code, className }: { code: string; className?: string }) {
  const url = flagUrl(code);
  return url ? <img className={cx("block flex-none rounded-[3px] object-cover shadow-[0_0_0_1px_rgb(255_255_255/.35)]", className)} src={url} alt={code} /> : null;
}
