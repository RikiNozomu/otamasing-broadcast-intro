import { describe, expect, it } from "vitest";
import { PhotoSetSchema } from "../../src/lib/model";
import { setAuto, showPhoto, shownIndex } from "../../src/lib/photos";

const set = (patch = {}) => PhotoSetSchema.parse({ keys: ["a", "b", "c"], auto: true, ...patch });

describe("photo slideshow", () => {
  it("defaults to changing pictures by hand (auto off, 5 seconds when turned on)", () => {
    expect(PhotoSetSchema.parse({})).toMatchObject({ keys: [], auto: false, seconds: 5 });
  });
  it("auto moves on every `seconds` from `since` and wraps around", () => {
    const s = set({ since: 1000, index: 1 });
    expect(shownIndex(s, 1000)).toBe(1);
    expect(shownIndex(s, 5999)).toBe(1);
    expect(shownIndex(s, 6000)).toBe(2);
    expect(shownIndex(s, 11000)).toBe(0);
  });
  it("manual mode stays on the chosen picture", () => {
    expect(shownIndex(set({ auto: false, index: 2 }), 99_999)).toBe(2);
    expect(shownIndex(set({ keys: [] }))).toBe(-1);
  });
  it("showing a picture restarts the timer from it, wrapping both ways", () => {
    expect(showPhoto(set(), -1, 50)).toMatchObject({ index: 2, since: 50 });
    expect(showPhoto(set(), 3, 50)).toMatchObject({ index: 0 });
  });
  it("changing auto or the speed keeps the picture on screen", () => {
    const s = set({ since: 0 });
    const t = 7000; // picture 2 (index 1) is on screen
    expect(shownIndex(setAuto(s, { auto: false }, t), t + 60_000)).toBe(1);
    expect(shownIndex(setAuto(s, { seconds: 2 }, t), t)).toBe(1);
    expect(shownIndex(setAuto(s, { seconds: 2 }, t), t + 2000)).toBe(2);
  });
});
