/** Flag image URLs from flag-icons (4x3). Every ISO code is available; the picker lists the Figma nations. */
const files = import.meta.glob("../../node_modules/flag-icons/flags/4x3/*.svg", { query: "?url", import: "default", eager: true }) as Record<string, string>;

const byCode: Record<string, string> = {};
for (const [path, url] of Object.entries(files)) {
  const code = path.slice(path.lastIndexOf("/") + 1, -4).toUpperCase();
  byCode[code] = url;
}

export const flagUrl = (code: string): string | undefined => (code ? byCode[code] : undefined);
