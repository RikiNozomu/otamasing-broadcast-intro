/** Number/draw colour schemes, the JRA bracket rule, and the grade and Fav pill colours. */
import type { Scheme, Style } from "./model";

export type Pair = readonly [bg: string, fg: string];

/** JRA bracket (waku) colours 1–8. */
export const JRA: Record<number, Pair> = {
  1: ["#FFFFFF", "#000000"], 2: ["#000000", "#FFFFFF"], 3: ["#E8392A", "#FFFFFF"], 4: ["#1239B5", "#FFFFFF"],
  5: ["#FFEF3A", "#000000"], 6: ["#8CD43A", "#FFFFFF"], 7: ["#EE7330", "#FFFFFF"], 8: ["#E672A8", "#FFFFFF"],
};

/** US saddle towel colours 1–24 (Figma "Saddle Towel US"). */
export const US: Record<number, Pair> = {
  1: ["#E23419", "#FFFFFF"], 2: ["#FFFFFF", "#000000"], 3: ["#0F147C", "#FFFFFF"], 4: ["#F8EF4A", "#000000"],
  5: ["#4CB632", "#FFFFFF"], 6: ["#000000", "#FFED0D"], 7: ["#E26E35", "#000000"], 8: ["#DE72A6", "#000000"],
  9: ["#70E2E3", "#000000"], 10: ["#4D2F6D", "#FFFFFF"], 11: ["#C0BEC3", "#E23419"], 12: ["#92D43F", "#000000"],
  13: ["#382B1B", "#FFFFFF"], 14: ["#5D302B", "#FFED0D"], 15: ["#B5AC81", "#000000"], 16: ["#A3CDF7", "#E23419"],
  17: ["#101B2D", "#FFFFFF"], 18: ["#102214", "#FFED0D"], 19: ["#10137E", "#E23419"], 20: ["#E46FA3", "#FFED0D"],
  21: ["#B5B3DB", "#0F147C"], 22: ["#21446A", "#FFFFFF"], 23: ["#C4D8CF", "#000000"], 24: ["#3F4A2A", "#FFFFFF"],
};
const FALLBACK: Pair = ["#5A5F8C", "#FFFFFF"];

/**
 * JRA bracket of horse `no` in a field of `n` (2–30): up to 8 runners each has its own bracket;
 * above that the extra horses go to the LAST brackets first (e.g. 9 runners: bracket 8 holds 8 and 9).
 */
export function bracket(no: number, n: number): number {
  if (n <= 8) return no;
  const base = Math.floor(n / 8), extra = n % 8;
  let acc = 0;
  for (let b = 1; b <= 8; b++) {
    acc += base + (b > 8 - extra ? 1 : 0);
    if (no <= acc) return b;
  }
  return 8;
}

export const customPair = (s: Style, k: number): Pair => (s.customColors[String(k)] as Pair | undefined) ?? US[k] ?? FALLBACK;

/** Colours of a DRAW or NO. box; null = plain (white frame on navy). */
export function boxColors(scheme: Scheme, value: number, horseNo: number, n: number, s: Style, isNumberBox: boolean): Pair | null {
  switch (scheme) {
    case "jra":
      // NO. in JRA colours follows the horse's bracket; DRAW in JRA colours is the bracket itself.
      return JRA[isNumberBox ? bracket(horseNo, n) : Math.min(Math.max(value, 1), 8)];
    case "us":
      return US[value] ?? customPair(s, value);
    case "custom":
      return customPair(s, value);
    default:
      return null;
  }
}

export const drawOf = (s: Style, number: number, draw: number | null, n: number) => (s.autoDraw ? bracket(number, n) : draw ?? number);

export const GRADE_COLOR: Record<string, string> = { G1: "#E23B24", G2: "#0E1478", G3: "#4DB437", L: "#F2BD34" };
export const favColor = (n: number) => (n === 1 ? "#F2BE34" : n === 2 ? "#7EA3C6" : n === 3 ? "#C0907E" : "#BDBDBD");
