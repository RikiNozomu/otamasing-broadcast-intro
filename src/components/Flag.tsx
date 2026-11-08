/** A national flag image by ISO code; nothing for "" or an unknown code. Size comes from className; `style` overrides the thin edge. */
import type { CSSProperties } from "react";
import { flagUrl } from "../lib/flags";
import { cx } from "../lib/cx";

export function Flag({ code, className, style, testId }: { code: string; className?: string; style?: CSSProperties; testId?: string }) {
  const url = flagUrl(code);
  return url ? <img className={cx("block flex-none rounded-[3px] object-cover shadow-[0_0_0_1px_rgb(255_255_255/.35)]", className)} style={style} src={url} alt={code} data-testid={testId} /> : null;
}
