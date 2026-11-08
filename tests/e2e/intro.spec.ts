import { expect, test, type BrowserContext, type Page } from "@playwright/test";

/** Dock and overlay open side by side in one browser profile, like OBS. */
async function open(context: BrowserContext): Promise<{ dock: Page; overlay: Page }> {
  const overlay = await context.newPage();
  await overlay.setViewportSize({ width: 1920, height: 1080 });
  await overlay.goto("#/overlay");
  const dock = await context.newPage();
  await dock.setViewportSize({ width: 420, height: 900 });
  await dock.goto("#/dock");
  return { dock, overlay };
}
const live = (overlay: Page) => overlay.locator("[data-layer][data-active]");
const fixture = (name: string) => new URL(`../fixtures/${name}`, import.meta.url).pathname;

test("course scene: the globe turns in, then the course; options switch while it runs, boxes show the facts", async ({ context }) => {
  test.slow(); // WebGL runs on the CPU here (SwiftShader), so frames come slowly when other tests run alongside
  const { dock, overlay } = await open(context);
  await dock.getByRole("button", { name: "ตั้งสนาม 11R Sample Cup เป็น Active" }).click();
  await expect(dock.getByTestId("active-tag")).toHaveText("Active: 11R สนาม");
  const scene = live(overlay).getByTestId("course-scene");
  // the course scene (with three.js) is its own chunk, loaded on first use: slow while other tests run alongside
  await expect(scene.getByTestId("scene-tag")).toHaveText("THE COURSE", { timeout: 20_000 });
  const view = scene.getByTestId("course-3d");
  await expect(view).toHaveAttribute("data-globe", "on");
  await expect(view.getByTestId("course-canvas")).toBeAttached();
  await expect(view).toHaveAttribute("data-phase", "course", { timeout: 60_000 });
  // the boxes along the bottom
  await expect(scene.getByTestId("panel-venue")).toContainText("Kyoto Racecourse", { timeout: 15_000, ignoreCase: true });
  await expect(scene.getByTestId("fact-corners")).toContainText("4");
  await expect(scene.getByTestId("direction")).toHaveText(/right-handed/i);
  await expect(scene.getByTestId("record-course")).toContainText("2:09.8");
  await expect(scene.getByTestId("panel-weather")).toContainText(/sunny/i);
  await expect(scene.getByTestId("going")).toContainText(/good/i);
  // options from the dock while the camera turns
  await dock.getByRole("tab", { name: "การแข่งขัน" }).click();
  await dock.locator("#sub-course").click();
  await dock.getByTestId("course-elevation").click();
  await expect(view).toHaveAttribute("data-elevation", "on");
  await dock.locator("#c-focus").selectOption("corners");
  await expect(view).toHaveAttribute("data-focus", "corners");
  await dock.getByTestId("show-panel-records").click();
  await expect(scene.getByTestId("panel-records")).toHaveCount(0);
  // straight to the course without the globe
  await dock.getByTestId("course-globe").click();
  await expect(live(overlay).getByTestId("course-3d")).toHaveAttribute("data-globe", "off");
  await expect(live(overlay).getByTestId("course-3d")).toHaveAttribute("data-phase", "course");
});

test("history: cards in a modal over the course, a picked card's video plays with the sound fading in and folds back when it ends", async ({ context }) => {
  test.slow();
  const { dock, overlay } = await open(context);
  await dock.getByRole("button", { name: "ตั้งสนาม 11R Sample Cup เป็น Active" }).click();
  await dock.getByRole("tab", { name: "การแข่งขัน" }).click();
  await dock.locator("#sub-course").click();
  await dock.getByTestId("course-globe").click();
  await dock.locator("#sub-history").click();
  await dock.getByTestId("history-open").click();
  const modal = live(overlay).getByTestId("history-modal");
  await expect(modal.getByTestId("history-card")).toHaveCount(3);
  await expect(live(overlay).getByTestId("panel-venue")).toHaveCount(0); // the boxes make way for the modal
  await dock.getByRole("button", { name: "เลือก A photo finish" }).click();
  await expect(modal.locator("[data-testid=history-card][data-on]")).toHaveAttribute("data-item", "hist-2");
  // add a video to that moment, then play it
  await dock.getByRole("button", { name: "A photo finish", exact: true }).click();
  await dock.getByTestId("history-video-file").setInputFiles(fixture("clip.webm"));
  await expect(dock.getByTestId("history-video-name")).toHaveText(/^video\/\d{17}\.webm · 0:0[23]$/);
  await dock.getByRole("button", { name: "เล่น A photo finish" }).click();
  await expect(dock.getByTestId("history-playing")).toContainText("A photo finish");
  const player = modal.getByTestId("history-player");
  await expect(player).toHaveAttribute("data-item", "hist-2");
  await expect(player.getByTestId("history-date")).toHaveText("2011.11.13");
  await expect(player.getByTestId("history-horse")).toHaveText([/photo finish/i, /last corner/i]);
  const video = player.getByTestId("history-video");
  await expect(video).toHaveAttribute("data-volume", /^0\.[3-9]|^1\.00$/, { timeout: 5000 });
  expect(await video.evaluate((v: HTMLVideoElement) => v.muted)).toBe(false);
  // the clip is 2.5 s: it ends, the sound fades out and it folds back into its card
  await expect(player).toHaveCount(0, { timeout: 8000 });
  await expect(modal.locator("[data-testid=history-card][data-item=hist-2]")).toBeVisible();
  await expect(dock.getByTestId("history-playing")).toHaveCount(0, { timeout: 8000 });
  // closing the modal brings the boxes back
  await dock.getByTestId("history-open").click();
  await expect(modal).toHaveCount(0);
  await expect(live(overlay).getByTestId("panel-venue")).toBeVisible();
});

test("runner intro goes through the field in gate order; STARTING GATE lists every runner top to bottom", async ({ context }) => {
  const { dock, overlay } = await open(context);
  await dock.getByRole("button", { name: "ตั้งแนะนำ 11R Sample Cup เป็น Active" }).click();
  const scene = live(overlay).getByTestId("runner-scene");
  const runner = scene.getByTestId("runner").last();
  await expect(runner).toHaveAttribute("data-no", "1");
  await expect(runner.getByTestId("horse-name")).toHaveText("MORNING GALLOP");
  await expect(runner.getByTestId("jockey-name")).toHaveText("A. SAMPLE");
  await expect(runner.getByTestId("jockey-weight")).toContainText("54.0");
  await expect(runner.getByTestId("pedigree")).toContainText(/example sire.*×.*paper princess.*by old champion/i);
  await expect(runner.getByTestId("horse-weight")).toContainText("440");
  await expect(scene.getByTestId("gate-band")).toHaveAttribute("data-stall", "1");
  const quick = dock.getByTestId("quick-runner");
  for (const no of ["2", "3", "4", "5", "7"]) { // 6 is scratched
    await quick.getByRole("button", { name: "ม้าตัวถัดไป" }).click();
    await expect(scene.getByTestId("gate-band")).toHaveAttribute("data-stall", no);
  }
  await expect(scene.getByTestId("scene-tag")).toContainText("6 / 17");

  await dock.getByRole("button", { name: "ตั้งGate 11R Sample Cup เป็น Active" }).click();
  const grid = live(overlay).getByTestId("grid-scene");
  await expect(grid.getByTestId("scene-tag")).toHaveText("STARTING GATE");
  const rows = grid.locator("[data-no]");
  await expect(rows).toHaveCount(17);
  await expect(rows.first()).toHaveCSS("opacity", "1", { timeout: 5000 });
  await overlay.waitForTimeout(1500);
  // top to bottom by gate
  const ys = await rows.evaluateAll((els) => els.map((e) => [Number(e.getAttribute("data-stall")), e.getBoundingClientRect().top] as const));
  const byY = [...ys].sort((a, b) => a[1] - b[1]).map((x) => x[0]);
  expect(byY).toEqual([...byY].sort((a, b) => a - b));
  expect(byY).not.toContain(6);
  // every row lines up on the same left edge (no stepped rows)
  await expect.poll(() => rows.evaluateAll((els) => new Set(els.map((e) => Math.round(e.getBoundingClientRect().left))).size)).toBe(1);
  // columns can be hidden, and a page holds fewer rows
  await dock.getByRole("tab", { name: "การแข่งขัน" }).click();
  await dock.locator("#sub-grid").click();
  await dock.getByTestId("gate-show-jockey").click();
  await expect(grid.getByTestId("jockey")).toHaveCount(0);
  await dock.locator("#g-per").fill("6");
  await expect(rows).toHaveCount(6);
  await dock.getByTestId("gate-pages").getByRole("button", { name: "หน้า 3" }).click();
  await expect(live(overlay).getByTestId("grid-scene")).toHaveAttribute("data-page", "3");
  await expect(live(overlay).locator("[data-testid=grid-scene] [data-no]")).toHaveCount(5);
});

test("jockeys tab: add the riders from the race card; a cut-out photo stands on the right of the runner intro", async ({ context }) => {
  const { dock, overlay } = await open(context);
  await dock.getByRole("tab", { name: "จ็อกกี้" }).click();
  await expect(dock.getByTestId("jockey-row")).toHaveCount(0);
  await dock.getByTestId("jockeys-missing").getByRole("button", { name: "เพิ่มทั้งหมด" }).click();
  await expect(dock.getByTestId("jockeys-missing")).toHaveCount(0);
  const n = await dock.getByTestId("jockey-row").count();
  expect(n).toBeGreaterThan(17);
  await dock.getByTestId("jockey-row").filter({ hasText: "A. Sample" }).locator("button[aria-expanded]").click();
  await dock.getByTestId("jockey-photo-file").setInputFiles(fixture("jockey.png"));
  await expect(dock.getByTestId("jockey-edit").getByTestId("jockey-thumb")).toHaveAttribute("data-has", "");
  await dock.getByRole("tab", { name: "ภาพรวม" }).click();
  await dock.getByRole("button", { name: "ตั้งแนะนำ 11R Sample Cup เป็น Active" }).click();
  await expect(live(overlay).getByTestId("jockey-photo")).toBeVisible();
  // a jockey without a photo: the owner's silks stand in
  await dock.getByTestId("quick-runner").getByRole("button", { name: "ม้าตัวถัดไป" }).click();
  await expect(live(overlay).locator("[data-testid=runner][data-no='2'] [data-testid=jockey-silks]")).toBeVisible();
});

test("stripes: the old scene plays its exit, then slanted bands sweep the new one in", async ({ context }) => {
  const { dock, overlay } = await open(context);
  await expect(dock.getByLabel("ทรานซิชัน")).toHaveValue("stripes");
  // note what the overlay goes through, however quickly it happens: the old scene alone while it exits, then both under the bands
  await overlay.evaluate(() => {
    const seen: string[] = [];
    (window as unknown as { seen: string[] }).seen = seen;
    const note = () => {
      const s = `${document.querySelectorAll("[data-layer]").length}${document.querySelector("[data-testid=stripes]") ? "+stripes" : ""}`;
      if (seen[seen.length - 1] !== s) seen.push(s);
    };
    new MutationObserver(note).observe(document.body, { childList: true, subtree: true });
  });
  await dock.getByRole("button", { name: "ตั้งGate 11R Sample Cup เป็น Active" }).click();
  await expect(live(overlay).getByTestId("grid-scene")).toBeVisible();
  await expect(overlay.locator("[data-layer]")).toHaveCount(1, { timeout: 4000 });
  await expect(overlay.getByTestId("stripes")).toHaveCount(0);
  const seen = await overlay.evaluate(() => (window as unknown as { seen: string[] }).seen);
  expect(seen).toContain("2+stripes");
  expect(seen.indexOf("2+stripes")).toBeLessThan(seen.lastIndexOf("1"));
});
