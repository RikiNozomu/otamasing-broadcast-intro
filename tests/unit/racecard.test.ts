import { describe, expect, it } from "vitest";
import { bracket, boxColors, JRA, US } from "../../src/lib/colors";
import { gradeLabel, ordinal } from "../../src/lib/labels";
import { newStyle } from "../../src/lib/model";

const sizes = (n: number) => {
  const s = Array(8).fill(0);
  for (let no = 1; no <= n; no++) s[bracket(no, n) - 1]++;
  return s;
};

describe("JRA bracket rule", () => {
  it("gives each horse its own bracket up to 8 runners", () => {
    for (let n = 2; n <= 8; n++) for (let no = 1; no <= n; no++) expect(bracket(no, n)).toBe(no);
  });
  it("puts the extra horses in the last brackets first", () => {
    expect(sizes(9)).toEqual([1, 1, 1, 1, 1, 1, 1, 2]);
    expect(sizes(10)).toEqual([1, 1, 1, 1, 1, 1, 2, 2]);
    expect(sizes(16)).toEqual([2, 2, 2, 2, 2, 2, 2, 2]);
    expect(sizes(18)).toEqual([2, 2, 2, 2, 2, 2, 3, 3]);
  });
  it("matches the JRA 18-runner card (horse 13 in bracket 7, 16 in bracket 8)", () => {
    expect([1, 2, 3, 12, 13, 15, 16, 18].map((no) => bracket(no, 18))).toEqual([1, 1, 2, 6, 7, 7, 8, 8]);
  });
  it("works up to 30 runners and never leaves a bracket out of order", () => {
    for (let n = 9; n <= 30; n++) {
      expect(sizes(n).reduce((a, b) => a + b, 0)).toBe(n);
      for (let no = 2; no <= n; no++) expect(bracket(no, n)).toBeGreaterThanOrEqual(bracket(no - 1, n));
    }
  });
});

describe("box colours", () => {
  const s = newStyle();
  it("JRA NO. follows the horse's bracket", () => {
    expect(boxColors("jra", 18, 18, 18, s, true)).toEqual(JRA[8]);
    expect(boxColors("jra", 3, 3, 18, s, true)).toEqual(JRA[2]);
  });
  it("US uses the saddle towel colours and custom falls back to them", () => {
    expect(boxColors("us", 6, 6, 10, s, false)).toEqual(US[6]);
    expect(boxColors("custom", 4, 4, 10, { ...s, customColors: { "4": ["#123456", "#FFFFFF"] } }, false)).toEqual(["#123456", "#FFFFFF"]);
    expect(boxColors("custom", 5, 5, 10, s, false)).toEqual(US[5]);
  });
  it("plain has no colours", () => expect(boxColors("plain", 1, 1, 8, s, true)).toBeNull());
});

describe("labels", () => {
  it("grade labels in both styles, with J- for jump races", () => {
    expect(gradeLabel({ grade: "G1", jump: false }, { gradeStyle: "jra" })).toBe("GI");
    expect(gradeLabel({ grade: "L", jump: true }, { gradeStyle: "jra" })).toBe("J-LR");
    expect(gradeLabel({ grade: "G2", jump: false }, { gradeStyle: "intl" })).toBe("G2");
    expect(gradeLabel({ grade: null, jump: false }, { gradeStyle: "jra" })).toBe("");
  });
  it("ordinals", () => expect([1, 2, 3, 4, 11, 12, 13, 21, 22].map(ordinal)).toEqual(["1st", "2nd", "3rd", "4th", "11th", "12th", "13th", "21st", "22nd"]));
});
