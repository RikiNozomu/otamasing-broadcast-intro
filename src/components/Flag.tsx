/** A national flag image by ISO code; nothing for "" or an unknown code. Size comes from className; `style` overrides the thin edge. */
import type { CSSProperties } from "react";
import { flagUrl } from "../lib/flags";
import { CENTER_COLOR } from "../lib/nations";
import { cx } from "../lib/cx";

export function Flag({ code, className, style, testId }: { code: string; className?: string; style?: CSSProperties; testId?: string }) {
  if (CENTER_COLOR[code]) return <CenterBadge code={code} className={className} style={style} testId={testId} />;
  const url = flagUrl(code);
  return url ? <img className={cx("block flex-none rounded-[3px] object-cover shadow-[0_0_0_1px_rgb(255_255_255/.35)]", className)} style={style} src={url} alt={code} data-testid={testId} /> : null;
}

/**
 * MIHO / RITTO: a pill (7:3) with the name in white, as tall as the flag it stands in for and wider than it
 * (the width set in className is overridden). Drawn as SVG so the text scales with the height.
 */
function CenterBadge({ code, className, style, testId }: { code: string; className?: string; style?: CSSProperties; testId?: string }) {
  return (
    <svg viewBox="0 0 70 30" role="img" aria-label={code} data-center={code} data-testid={testId} className={cx("block flex-none overflow-visible rounded-full shadow-[0_0_0_1px_rgb(255_255_255/.35)]", className)}
      style={{ ...style, width: "auto", aspectRatio: "7 / 3" }}>
      <rect width="70" height="30" rx="15" fill={CENTER_COLOR[code]} />
      <text x="35" y="16" textAnchor="middle" dominantBaseline="central" fill="#fff" fontSize="21" fontWeight="700" letterSpacing=".5"
        style={{ fontFamily: "var(--font-display)" }} textLength={code.length > 4 ? 50 : 42} lengthAdjust="spacingAndGlyphs">{code}</text>
    </svg>
  );
}
