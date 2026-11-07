import { describe, expect, it } from "vitest";
import { HOME_ROWS, paginate } from "../../src/lib/paging";

describe("paginate", () => {
  const items = Array.from({ length: 13 }, (_, i) => i + 1);
  it("splits into pages of `per` and clamps the page", () => {
    expect(HOME_ROWS).toBe(8);
    expect(paginate(items, 8, 0)).toEqual({ rows: [1, 2, 3, 4, 5, 6, 7, 8], page: 0, pageCount: 2 });
    expect(paginate(items, 8, 1).rows).toEqual([9, 10, 11, 12, 13]);
    expect(paginate(items, 8, 9).page).toBe(1);
    expect(paginate([], 8, 3)).toEqual({ rows: [], page: 0, pageCount: 1 });
  });
});
