import { describe, expect, it } from "vitest";
import { extOf, imageName, imageRefs, isImageName, mapImageRefs, stamp } from "../../src/lib/imageRefs";
import { sampleData } from "../../src/lib/sample";

describe("picture names", () => {
  it("image/ + local date and time to the millisecond + the file's extension", () => {
    const t = new Date(2026, 10, 6, 3, 14, 51, 7).getTime();
    expect(stamp(t)).toBe("20261106031451007");
    expect(imageName({ name: "Horse Photo.JPEG" }, t)).toBe("image/20261106031451007.jpeg");
    expect(isImageName("image/20261106031451007.jpeg")).toBe(true);
    expect(isImageName("photo:abc")).toBe(false);
  });
  it("two pictures in the same millisecond get different names", () => {
    const t = new Date(2027, 0, 1).getTime();
    const a = imageName({ name: "a.png" }, t), b = imageName({ name: "b.png" }, t);
    expect(a).not.toBe(b);
    expect(b).toBe("image/20270101000000001.png");
  });
  it("the extension comes from the name, else the type, else png", () => {
    expect(extOf({ name: "silks.svg" })).toBe("svg");
    expect(extOf({ name: "", type: "image/jpeg" })).toBe("jpg");
    expect(extOf({})).toBe("png");
  });
  it("finds and renames or removes every picture the data names", () => {
    const d = sampleData();
    d.races[0].photos.card.keys = ["image/1.png", "image/2.png"];
    d.races[1].photos.result.keys = ["image/2.png"];
    d.horses[0].photos.keys = ["image/3.png"];
    d.horses[0].silksImage = "image/4.svg";
    d.home.background = "image/5.jpg";
    expect(imageRefs(d).sort()).toEqual(["image/1.png", "image/2.png", "image/3.png", "image/4.svg", "image/5.jpg"]);
    const gone = new Set(["image/2.png", "image/4.svg", "image/5.jpg"]);
    const next = mapImageRefs(d, (k) => (gone.has(k) ? null : k));
    expect(next.races[0].photos.card.keys).toEqual(["image/1.png"]);
    expect(next.races[1].photos.result.keys).toEqual([]);
    expect(next.horses[0].photos.keys).toEqual(["image/3.png"]);
    expect(next.horses[0].silksImage).toBeNull();
    expect(next.home.background).toBeNull();
    expect(d.home.background).toBe("image/5.jpg");
  });
});
