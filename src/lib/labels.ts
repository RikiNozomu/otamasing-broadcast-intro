/** Text shown on pills: the grade label. */
import type { Race, Style } from "./model";

export function gradeLabel(r: Pick<Race, "grade" | "jump">, s: Pick<Style, "gradeStyle">): string {
  if (!r.grade) return "";
  const roman = { G1: "GI", G2: "GII", G3: "GIII", L: "LR" }, intl = { G1: "G1", G2: "G2", G3: "G3", L: "L" };
  return (r.jump ? "J-" : "") + (s.gradeStyle === "jra" ? roman : intl)[r.grade];
}
