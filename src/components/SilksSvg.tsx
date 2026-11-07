/**
 * The owner's silks as an SVG jersey with sleeves (front view, sleeves arching down both sides), in the
 * colours and patterns of `Silks`. Patterns follow the JRA list (netkeiba) and the US / European names
 * (Breeders' Cup). Scales to any size without blurring.
 */
import { useId, type ReactNode } from "react";
import type { Silks } from "../lib/horses";

const BODY = "M330 40 Q640 -14 950 40 L922 300 Q890 470 902 720 L378 720 Q390 470 358 300 Z";
const LEFT = "M330 40 L252 70 Q64 250 40 720 L196 720 Q214 420 358 300 Z";
const RIGHT = "M950 40 L1028 70 Q1216 250 1240 720 L1084 720 Q1066 420 922 300 Z";
const CX = 640;

/** A five-pointed star centred on (x, y). */
function star(x: number, y: number, r: number, key?: string | number) {
  const pts = Array.from({ length: 10 }, (_, i) => {
    const a = -Math.PI / 2 + (i * Math.PI) / 5, rr = i % 2 ? r * 0.42 : r;
    return `${(x + rr * Math.cos(a)).toFixed(1)},${(y + rr * Math.sin(a)).toFixed(1)}`;
  }).join(" ");
  return <polygon key={key} points={pts} />;
}
const diamond = (x: number, y: number, w: number, h: number, key?: string | number) =>
  <polygon key={key} points={`${x},${y - h} ${x + w},${y} ${x},${y + h} ${x - w},${y}`} />;
/** Squares of a checkerboard over the whole picture (clipped to the part); the cell whose corner is (x0, y0) is filled. */
const checks = (w: number, h = w, x0 = 0, y0 = 0) => {
  const out: ReactNode[] = [];
  const i0 = Math.ceil(x0 / w), j0 = Math.ceil(y0 / h);
  for (let j = -j0; y0 + j * h < 720; j++) for (let i = -i0; x0 + i * w < 1280; i++) if ((i + j) % 2 === 0) out.push(<rect key={`${i}-${j}`} x={x0 + i * w} y={y0 + j * h} width={w} height={h} />);
  return out;
};

/**
 * A zigzag across the whole picture: a point every `step` px, at height `at` on the centre line (x 640) and on
 * every second point from there, `other` on the points between. Body and sleeves share it, so it runs on across both.
 */
const zig = (at: number, other: number, step: number) =>
  Array.from({ length: 2 * Math.ceil(700 / step) + 1 }, (_, i) => i - Math.ceil(700 / step)).map((k) => `${CX + k * step},${k % 2 ? other : at}`).join(" ");
/** The thick zigzag band (netkeiba: about three peaks across the body). */
const ZIGZAG_BAND = <polyline points={zig(312, 400, 150)} fill="none" strokeWidth={126} strokeLinejoin="miter" strokeMiterlimit={8} />;
/** A yoke whose lower edge is a row of big teeth, pointing down on the centre line; it covers the tops of the sleeves too. */
const JAGGED_YOKE = <path d={`M-40 -40 H1320 V200 L${zig(320, 200, 97).split(" ").reverse().join(" L")} L-40 200 Z`} />;
/** A fleur-de-lys about 220 high, centred on (0, 0). */
const FLEUR = (
  <>{[
    // central petal: pointed tip, widest in the middle, narrowing into the band
    "M0 -122 C26 -96 42 -62 38 -30 C36 -6 26 8 20 14 L-20 14 C-26 8 -36 -6 -38 -30 C-42 -62 -26 -96 0 -122 Z",
    // side petals: thick arcs up and out from the band, drooping into a curl
    "M16 14 C14 -40 66 -78 104 -52 C130 -32 120 6 94 8 C78 9 74 -8 88 -14 C98 -19 100 -32 88 -38 C70 -46 46 -24 50 14 Z",
    "M-16 14 C-14 -40 -66 -78 -104 -52 C-130 -32 -120 6 -94 8 C-78 9 -74 -8 -88 -14 C-98 -19 -100 -32 -88 -38 C-70 -46 -46 -24 -50 14 Z",
    // the band
    "M-48 12 H48 V38 H-48 Z",
    // under the band: a short stem with two small tails flaring out
    "M-14 38 H14 L9 80 L0 94 L-9 80 Z",
    "M8 38 C40 38 72 56 66 86 C62 100 44 98 46 86 C48 78 56 80 54 72 C48 62 28 62 8 68 Z",
    "M-8 38 C-40 38 -72 56 -66 86 C-62 100 -44 98 -46 86 C-48 78 -56 80 -54 72 C-48 62 -28 62 -8 68 Z",
  ].map((d) => <path key={d} d={d} />)}</>
);

/** Rows of spots / stars: two columns, three rows (stars: 2-1-2). */
const GRID_2X3 = [[500, 165], [780, 165], [500, 352], [780, 352], [500, 540], [780, 540]];
const QUINCUNX = [[487, 220], [793, 220], [640, 376], [487, 540], [793, 540]];

/** Hoops as [top, height] pairs, the same on body and sleeves (netkeiba draws them level across both). */
const HOOPS = {
  hoop1: [[305, 140]],
  hoop2: [[252, 84], [432, 84]],
  hoop3: [[228, 88], [372, 88], [516, 80]],
  hoop4: [[140, 76], [306, 60], [456, 54], [600, 120]],
  hoop5: [[120, 56], [240, 56], [360, 56], [480, 56], [600, 56]],
} as const;
const hoops = (hs: readonly (readonly [number, number])[], c: string) => <g fill={c}>{hs.map(([y, h]) => <rect key={y} x={0} y={y} width={1280} height={h} />)}</g>;

function bodyPattern(p: Silks["pattern"], c: string): ReactNode {
  switch (p) {
    // hoops sit at the same heights as the sleeve hoops (netkeiba)
    case "hoop1": return hoops(HOOPS.hoop1, c);
    case "hoop2": return hoops(HOOPS.hoop2, c);
    case "hoop3": return hoops(HOOPS.hoop3, c);
    case "belt": return <rect x={0} y={260} width={1280} height={210} fill={c} />;
    case "sash": return <line x1={300} y1={-40} x2={980} y2={760} stroke={c} strokeWidth={130} />;
    case "cross": return <g stroke={c} strokeWidth={120}><line x1={300} y1={-40} x2={980} y2={760} /><line x1={980} y1={-40} x2={300} y2={760} /></g>;
    // three broad stripes, as wide as the gaps between them, one on the centre line
    case "stripes": return <g fill={c}>{[CX - 180, CX, CX + 180].map((x) => <rect key={x} x={x - 45} y={0} width={90} height={720} />)}</g>;
    case "seams": return <rect x={CX - 9} y={0} width={18} height={720} fill={c} />;
    case "braces": return <g fill={c}><rect x={470} y={0} width={46} height={720} /><rect x={764} y={0} width={46} height={720} /></g>;
    case "halves": return <rect x={CX} y={0} width={640} height={720} fill={c} />;
    case "quartered": return <g fill={c}><rect x={CX} y={0} width={640} height={340} /><rect x={0} y={340} width={CX} height={380} /></g>;
    case "check": return <g fill={c}>{checks(96)}</g>;
    case "harlequin": {
      const out: ReactNode[] = [];
      for (let row = 0; row < 8; row++) for (let col = -1; col < 8; col++) out.push(diamond(358 + col * 96 + (row % 2) * 48, 70 + row * 96, 48, 48, `${row}-${col}`));
      return <g fill={c}>{out}</g>;
    }
    case "diamondBand": return <g fill={c}>{[430, 535, 640, 745, 850].map((x) => diamond(x, 210, 52, 62, x))}</g>;
    case "chevron": return <polyline points="320,240 640,520 960,240" fill="none" stroke={c} strokeWidth={110} />;
    case "bigV": return <polygon points="372,30 470,30 640,420 810,30 908,30 640,600" fill={c} />;
    case "sawtooth": return <polyline points={Array.from({ length: 11 }, (_, i) => `${340 + i * 60},${i % 2 ? 250 : 340}`).join(" ")} fill="none" stroke={c} strokeWidth={60} strokeLinejoin="miter" />;
    case "hash": return <g fill={c}><rect x={500} y={0} width={46} height={720} /><rect x={734} y={0} width={46} height={720} /><rect x={0} y={240} width={1280} height={46} /><rect x={0} y={470} width={1280} height={46} /></g>;
    case "yoke": return <path d="M0 0 H1280 V200 H922 L640 250 L358 200 H0 Z" fill={c} />;
    case "spots": return <g fill={c}>{GRID_2X3.map(([x, y]) => <circle key={`${x}${y}`} cx={x} cy={y} r={64} />)}</g>;
    case "stars": return <g fill={c}>{QUINCUNX.map(([x, y], i) => star(x, y, 80, i))}</g>;
    case "star": return <g fill={c}>{star(CX, 350, 190)}</g>;
    case "ring": return <circle cx={CX} cy={340} r={130} fill="none" stroke={c} strokeWidth={50} />;
    case "diamond": return <g fill={c}>{diamond(CX, 360, 170, 230)}</g>;
    case "jaggedYoke": return <g fill={c}>{JAGGED_YOKE}</g>;
    // two zigzag bands, peaks on the centre line
    case "zigzag2": return <g fill="none" stroke={c} strokeWidth={100} strokeLinejoin="miter" strokeMiterlimit={8}>{[[300, 356], [478, 536]].map(([a, b]) => <polyline key={a} points={zig(a, b, 121)} />)}</g>;
    case "zigzagBand": return <g stroke={c}>{ZIGZAG_BAND}</g>;
    case "rings": return <g fill="none" stroke={c} strokeWidth={30}>{GRID_2X3.map(([x, y]) => <circle key={`${x}${y}`} cx={x} cy={y} r={48} />)}</g>;
    // a column of squares on the centre line, the middle one in the accent colour
    case "bigCheck": return <g fill={c}>{checks(162, 145, CX - 81, 294)}</g>;
    // accent diamonds about three across, the body colour's diamonds between them
    case "bigHarlequin": {
      const out: ReactNode[] = [];
      for (let row = -2; row < 2; row++) for (let col = -3; col < 3; col++) out.push(diamond(CX + 108 + col * 216, 490 + row * 204, 108, 102, `${row}${col}`));
      return <g fill={c}>{out}</g>;
    }
    // three big tall diamonds across the middle, touching
    // a large solid disc ("ball") on the centre of the body
    case "disc": return <circle cx={CX} cy={340} r={165} fill={c} />;
    case "fleurDeLys": return <g fill={c} transform={`translate(${CX} 360) scale(2.2)`}>{FLEUR}</g>;
    // three large spots on a diagonal, upper right to lower left
    case "spots3": return <g fill={c}>{[[815, 190], [655, 385], [480, 585]].map(([x, y]) => <circle key={x} cx={x} cy={y} r={92} />)}</g>;
    // a triangle pointing down, under the shoulders
    case "triangle": return <polygon points={`${CX - 210},205 ${CX + 210},205 ${CX},415`} fill={c} />;
    // the sash the other way: from the viewer's right shoulder down to the lower left
    // squares in a loose grid: two columns either side of the centre (the outer ones cut by the side seams), four rows
    case "blockGrid": return <g fill={c}>{[61, 252, 457, 651].flatMap((y) => [-342, -108, 108, 342].map((dx) => <rect key={`${y}${dx}`} x={CX + dx - 56} y={y - 54} width={112} height={108} />))}</g>;
    case "sashReverse": return <line x1={980} y1={-40} x2={300} y2={760} stroke={c} strokeWidth={130} />;
    case "bigDiamondBand": return <g fill={c}>{[CX - 225, CX, CX + 225].map((x) => diamond(x, 380, 113, 152, x))}</g>;
    default: return null;
  }
}

/** Points along the middle of the left sleeve (t from 0 at the shoulder to 1 at the cuff) and the arm's angle there. */
function onSleeve(t: number) {
  const [x0, y0, cx, cy, x1, y1] = [292, 84, 142, 262, 118, 720];
  const u = 1 - t;
  const x = u * u * x0 + 2 * u * t * cx + t * t * x1, y = u * u * y0 + 2 * u * t * cy + t * t * y1;
  const dx = 2 * u * (cx - x0) + 2 * t * (x1 - cx), dy = 2 * u * (cy - y0) + 2 * t * (y1 - cy);
  return { x, y, deg: (Math.atan2(dy, dx) * 180) / Math.PI - 90 };
}
/** The same mark on both sleeves at each t (the right sleeve mirrored). */
function alongSleeves(ts: number[], mark: (i: number) => ReactNode) {
  return ts.flatMap((t, i) => {
    const { x, y, deg } = onSleeve(t);
    return [
      <g key={`l${i}`} transform={`translate(${x} ${y}) rotate(${deg})`}>{mark(i)}</g>,
      <g key={`r${i}`} transform={`translate(${1280 - x} ${y}) rotate(${-deg}) scale(-1 1)`}>{mark(i)}</g>,
    ];
  });
}

/** A line parallel to the outer edge of both sleeves, `d` px in from it, starting at `t0` along the edge (0 = shoulder). */
function alongOuterEdge(d: number, t0: number) {
  const [x0, y0, cx, cy, x1, y1] = [252, 70, 64, 250, 40, 720];
  const u = 1 - t0;
  const sx = u * u * x0 + 2 * u * t0 * cx + t0 * t0 * x1, sy = u * u * y0 + 2 * u * t0 * cy + t0 * t0 * y1;
  const qx = cx + t0 * (x1 - cx), qy = cy + t0 * (y1 - cy);
  const left = `M${sx + d} ${sy + d * 0.6} Q${qx + d} ${qy} ${x1 + d} ${y1 + 20}`;
  const right = `M${1280 - sx - d} ${sy + d * 0.6} Q${1280 - qx - d} ${qy} ${1280 - x1 - d} ${y1 + 20}`;
  return [<path key={`l${d}`} d={left} />, <path key={`r${d}`} d={right} />];
}

function sleevePattern(p: Silks["sleevePattern"], c: string): ReactNode {
  const bands = (ys: number[], h: number) => <g fill={c}>{ys.map((y) => <rect key={y} x={0} y={y} width={1280} height={h} />)}</g>;
  switch (p) {
    case "hoop1": return hoops(HOOPS.hoop1, c);
    case "hoop2": return hoops(HOOPS.hoop2, c);
    case "hoop3": return hoops(HOOPS.hoop3, c);
    case "cuffs": return bands([640], 80);
    case "halved": return bands([400], 320);
    case "stripes":
      // two bands following the arc of each sleeve
      return (
        <g fill="none" stroke={c} strokeWidth={50}>
          <path d="M268 92 Q100 270 82 720" /><path d="M318 236 Q178 400 164 720" />
          <path d="M1012 92 Q1180 270 1198 720" /><path d="M962 236 Q1102 400 1116 720" />
        </g>
      );
    case "chevrons": return <g fill="none" stroke={c} strokeWidth={64} strokeLinejoin="miter">{alongSleeves([0.36, 0.62, 0.88], () => <polyline points="-150,-60 0,30 150,-60" />)}</g>;
    case "diamonds": return <g fill={c}>{alongSleeves([0.22, 0.4, 0.58, 0.76, 0.94], () => diamond(0, 0, 44, 52))}</g>;
    case "spots": return <g fill={c}>{alongSleeves([0.48, 0.63, 0.78, 0.93], () => <circle cx={-18} r={30} />)}</g>;
    case "stars": return <g fill={c}>{alongSleeves([0.25, 0.45, 0.65, 0.85], () => star(0, 0, 44))}</g>;
    case "check": return <g fill={c}>{checks(72)}</g>;
    case "hoop4": return hoops(HOOPS.hoop4, c);
    case "hoop5": return hoops(HOOPS.hoop5, c);
    // four thin stripes packed together on the outer side of each sleeve, shoulder to cuff
    case "stripesDense": return <g fill="none" stroke={c} strokeWidth={19}>{[28, 56, 84, 112].map((d) => alongOuterEdge(d, 0))}</g>;
    // one broad stripe on the outer side of each sleeve, from just below the shoulder to the cuff
    case "stripe1": return <g fill="none" stroke={c} strokeWidth={50}>{alongOuterEdge(50, 0.15)}</g>;
    case "zigzagBand": return <g stroke={c}>{ZIGZAG_BAND}</g>;
    // large squares in two columns down the sleeve, alternating sides
    case "blocks": return <g fill={c}>{alongSleeves([0.18, 0.34, 0.5, 0.66, 0.82, 0.98], (i) => <rect x={i % 2 ? 0 : -120} y={-62} width={120} height={124} />)}</g>;
    default: return null;
  }
}

export function SilksSvg({ silks: s, className }: { silks: Silks; className?: string }) {
  const id = useId().replace(/:/g, "");
  return (
    <svg viewBox="0 0 1280 720" className={className} role="img" aria-label="สีเสื้อเจ้าของ" data-testid="silks-svg">
      <defs>
        <clipPath id={`${id}b`}><path d={BODY} /></clipPath>
        <clipPath id={`${id}s`}><path d={LEFT} /><path d={RIGHT} /></clipPath>
      </defs>
      <g clipPath={`url(#${id}s)`}>
        <rect width={1280} height={720} fill={s.sleeves} />
        {sleevePattern(s.sleevePattern, s.sleeveAccent)}
        {s.pattern === "jaggedYoke" && <g fill={s.accent}>{JAGGED_YOKE}</g>}
      </g>
      <g clipPath={`url(#${id}b)`}>
        <rect width={1280} height={720} fill={s.body} />
        {bodyPattern(s.pattern, s.accent)}
        {s.yoke && <path d="M0 0 H1280 V190 H922 L640 225 L358 190 H0 Z" fill={s.yoke} />}
      </g>
      <g fill="none" stroke="#111" strokeWidth={8} strokeLinejoin="round"><path d={LEFT} /><path d={RIGHT} /><path d={BODY} /></g>
    </svg>
  );
}
