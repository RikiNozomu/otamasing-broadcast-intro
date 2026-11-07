/** Joins class names, skipping false/empty ones. */
export const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(" ");
