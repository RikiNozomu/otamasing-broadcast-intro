import { describe, expect, it } from "vitest";
import { strToU8, zipSync } from "fflate";
import { isZip, readBundle } from "../../src/lib/bundle";
import { mimeOf } from "../../src/lib/imageRefs";

describe(".zip with the JSON and its pictures", () => {
  it("reads data.json and the pictures under image/, typed by extension", async () => {
    const zip = zipSync({ "data.json": strToU8('{"races":[],"horses":[{"name":"ม้า"}]}'), "image/20261106031451123.svg": strToU8("<svg/>"), "other.txt": strToU8("x") });
    expect(isZip(zip)).toBe(true);
    const r = readBundle(zip);
    if (!r.ok) throw new Error(r.error);
    expect(JSON.parse(r.text).horses[0].name).toBe("ม้า");
    expect(Object.keys(r.images)).toEqual(["image/20261106031451123.svg"]);
    expect(r.images["image/20261106031451123.svg"].type).toBe("image/svg+xml");
    expect(await r.images["image/20261106031451123.svg"].text()).toBe("<svg/>");
  });
  it("a .zip without JSON or a broken one is refused", () => {
    expect(readBundle(zipSync({ "image/a.png": strToU8("x") })).ok).toBe(false);
    expect(readBundle(new Uint8Array([0x50, 0x4b, 3, 4, 1, 2])).ok).toBe(false);
    expect(isZip(strToU8("{}"))).toBe(false);
  });
  it("picture types", () => {
    expect(mimeOf("image/1.jpg")).toBe("image/jpeg");
    expect(mimeOf("image/1.JPEG")).toBe("image/jpeg");
    expect(mimeOf("image/1.png")).toBe("image/png");
  });
});
