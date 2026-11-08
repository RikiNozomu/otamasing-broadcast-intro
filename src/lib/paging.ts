/** Splitting a list into pages for the screen. */

export interface Paged<T> { rows: T[]; page: number; pageCount: number }

/** Page `page` (0-based, clamped) of `items`, `per` at a time. */
export function paginate<T>(items: T[], per: number, page: number): Paged<T> {
  const pageCount = Math.max(1, Math.ceil(items.length / per));
  const p = Math.min(Math.max(0, page), pageCount - 1);
  return { rows: items.slice(p * per, (p + 1) * per), page: p, pageCount };
}
