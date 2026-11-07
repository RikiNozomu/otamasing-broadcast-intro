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

test("first open seeds the sample and the overlay shows the Active race", async ({ context }) => {
  const { dock, overlay } = await open(context);
  await expect(dock.getByTestId("active-tag")).toHaveText("Active: 11R");
  await expect(dock.getByRole("tab")).toHaveText(["ภาพรวม", "การแข่งขัน", "ม้า"]);
  await expect(overlay.locator("[data-layer][data-active] [data-testid=race-name]")).toHaveText("Sample Cup");
  // 18 runners: 10 a page (pages are turned by hand by default, so page 1 stays)
  await expect(overlay.locator("[data-layer][data-active] [data-no]")).toHaveCount(10);
  await expect(overlay.locator("[data-layer][data-active] [data-no][data-hl=on]")).toHaveAttribute("data-no", "9");
  // the title is on top: name with the grade badge after it, then date · round · course · distance
  await expect(overlay.locator("[data-layer][data-active] [data-testid=race-facts]")).toHaveText(/2026\.11\.29.*11R.*Tokyo.*2400/i);
});

test("setting home or another race Active switches the overlay with a transition", async ({ context }) => {
  const { dock, overlay } = await open(context);
  await dock.getByRole("button", { name: "ตั้งหน้าแรกเป็น Active" }).click();
  await expect(overlay.locator("[data-layer][data-active] [data-testid=race-list]")).toBeVisible();
  await expect(overlay.locator("[data-layer][data-active] [data-testid=race-list-row]")).toHaveCount(3);
  await expect(overlay.locator("[data-layer]")).toHaveCount(1, { timeout: 3000 });
  // the course column, switched off and on again in the dock
  await expect(overlay.locator("[data-layer][data-active] [data-testid=race-course]").first()).toHaveText("TOKYO");
  await dock.getByTestId("home-show-course").click();
  await expect(overlay.locator("[data-layer][data-active] [data-testid=race-course]")).toHaveCount(0);
  await dock.getByTestId("home-show-course").click();
  await expect(overlay.locator("[data-layer][data-active] [data-testid=race-course]")).toHaveCount(3);
  await expect(overlay.locator("[data-layer][data-active] [data-testid=race-date]").first()).toHaveText("2026.11.29");
  await dock.getByTestId("home-show-date").click();
  await expect(overlay.locator("[data-layer][data-active] [data-testid=race-date]")).toHaveCount(0);
  await dock.getByLabel("ทรานซิชัน").selectOption("none");
  await dock.getByRole("button", { name: /ตั้ง 12R .* เป็น Active/ }).click();
  await expect(overlay.locator("[data-layer][data-active] [data-testid=race-name]")).toHaveText("Sample Juvenile");
  await expect(dock.getByTestId("active-tag")).toHaveText("Active: 12R");
});

test("edits in the dock reach the overlay: name, round, highlight, toggles, flags", async ({ context }) => {
  const { dock, overlay } = await open(context);
  await dock.getByRole("button", { name: "แก้ไข 11R Sample Cup" }).click();
  await dock.getByLabel("ชื่อรายการ").fill("Edited Cup");
  await dock.getByLabel("เลขรอบ").fill("Main");
  await expect(overlay.locator("[data-layer][data-active] [data-testid=race-name]")).toHaveText("Edited Cup");
  await expect(overlay.locator("[data-layer][data-active] [data-testid=race-facts]")).toContainText(/Main.*Tokyo/);
  await dock.locator("[data-h='3']").click();
  await expect(overlay.locator("[data-layer][data-active] [data-no][data-hl=on]")).toHaveAttribute("data-no", "3");
  await expect(overlay.locator("[data-layer][data-active] [data-no][data-hl=out]")).toHaveAttribute("data-no", "9");
  await dock.getByRole("button", { name: "ธงม้าเบอร์ 1: ญี่ปุ่น" }).click();
  await dock.getByLabel("ค้นหาประเทศ").fill("nzl");
  await dock.getByRole("option", { name: /นิวซีแลนด์/ }).click();
  await expect(overlay.locator("[data-layer][data-active] [data-no='1'] [data-testid=horse] img")).toHaveAttribute("alt", "NZ");
  await dock.getByRole("tab", { name: "สไตล์" }).click();
  await dock.getByTestId("show-draw").click();
  await expect(overlay.locator("[data-layer][data-active] [data-testid=table-head] span")).toHaveText(["NO.", "HORSE", "HORSE WT.", "JOCKEY", "WEIGHT"]);
});

test("a moving highlight bar is never hidden behind the row backgrounds", async ({ context }) => {
  const { dock, overlay } = await open(context);
  await dock.getByRole("button", { name: "แก้ไข 11R Sample Cup" }).click();
  // page 1 (pages are turned by hand by default)
  await dock.getByTestId("card-pages").getByRole("button", { name: "หน้า 1" }).click();
  await expect(overlay.locator("[data-layer][data-active] [data-testid=racecard]")).toHaveAttribute("data-page", "1");
  await expect(overlay.locator("[data-layer][data-active] [data-no='9']")).toHaveAttribute("data-hl", "on");
  await overlay.waitForTimeout(1000); // rows finished sliding in
  // Sample every frame while the bar grows on row 3 and shrinks on row 9: wherever a bar reaches, it must be the
  // topmost element at the left edge of the horse cell (a cell animating its opacity used to be painted over it).
  const result = overlay.evaluate(() => new Promise<{ samples: Record<string, number>; hidden: number }>((resolve) => {
    const samples: Record<string, number> = { "3": 0, "9": 0 };
    let hidden = 0, start = 0;
    const tick = (t: number) => {
      const live = document.querySelector("[data-layer][data-active]");
      if (live?.querySelector("[data-no='3'] [data-testid=highlight-bar]")) start ||= t;
      if (start) {
        for (const no of ["3", "9"]) {
          const row = live!.querySelector<HTMLElement>(`[data-no='${no}']`)!;
          const bar = row.querySelector<HTMLElement>("[data-testid=highlight-bar]");
          const cell = row.querySelector<HTMLElement>("[data-testid=horse]")!.getBoundingClientRect();
          const x = cell.left + 3, y = cell.top + cell.height / 2;
          if (bar && bar.getBoundingClientRect().right > x + 1) {
            samples[no]++;
            if (document.elementFromPoint(x, y) !== bar) hidden++;
          }
        }
        if (t - start > 600) return resolve({ samples, hidden });
      }
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }));
  await dock.locator("[data-h='3']").click();
  const res = await result;
  expect(res.samples["3"]).toBeGreaterThan(5);
  expect(res.samples["9"]).toBeGreaterThan(5);
  expect(res.hidden).toBe(0);
});

test("home page settings and race highlight", async ({ context }) => {
  const { dock, overlay } = await open(context);
  await dock.getByRole("button", { name: "ตั้งหน้าแรกเป็น Active" }).click();
  await dock.getByLabel("Title", { exact: true }).fill("Kyoto Races");
  await dock.getByLabel("Sub title (วันที่)").fill("2026.12.06");
  await dock.locator("[data-lh='sample-12']").click();
  const live = overlay.locator("[data-layer][data-active]");
  await expect(live.locator("[data-testid=home-title]")).toHaveText("Kyoto Races");
  await expect(live.locator("[data-testid=home-subtitle]")).toHaveText("2026.12.06");
  await expect(live.locator("[data-testid=race-list-row][data-hl=on]")).toHaveAttribute("data-race", "sample-12");
});

test("import JSON (append / replace), reject a bad file, delete with confirm", async ({ context }) => {
  const { dock, overlay } = await open(context);
  const file = { name: "races.json", mimeType: "application/json", buffer: Buffer.from(JSON.stringify({ races: [{ date: "2026-12-06", course: "Kyoto", round: "11R", name: "Imported Stakes", runners: [{ number: 1, name: "A" }, { number: 2, name: "B" }] }] })) };
  await dock.getByTestId("import-file").setInputFiles(file);
  await dock.getByRole("button", { name: "เพิ่มต่อ" }).click();
  await expect(dock.getByRole("status")).toContainText("นำเข้า 1 รายการแล้ว");
  await expect(dock.getByTestId("race-row")).toHaveCount(4);

  await dock.getByTestId("import-file").setInputFiles({ name: "bad.json", mimeType: "application/json", buffer: Buffer.from("{ nope") });
  await expect(dock.getByRole("alert")).toContainText("นำเข้าไม่ได้");

  await dock.getByRole("button", { name: /ลบ 11R Sample Cup/ }).click();
  await dock.getByRole("button", { name: "ลบ", exact: true }).click();
  await expect(dock.getByTestId("race-row")).toHaveCount(3);
  // the deleted race was Active, so the overlay falls back to the home page
  await expect(overlay.locator("[data-layer][data-active] [data-testid=race-list]")).toBeVisible();

  await dock.getByTestId("import-file").setInputFiles(file);
  // a file of races replaces the races only: the horses stay
  await dock.getByRole("button", { name: "แทนที่รายการแข่งทั้งหมด" }).click();
  await expect(dock.getByTestId("race-row")).toHaveCount(1);
  await dock.getByRole("tab", { name: "ม้า" }).click();
  await expect(dock.getByRole("tab", { name: "Sample Star" })).toBeVisible();
});

test("export inside OBS: copy the JSON and paste it back in", async ({ context }) => {
  // OBS's browser sets window.obsstudio, and its docks ignore downloads
  await context.addInitScript(() => { (window as unknown as { obsstudio: object }).obsstudio = {}; });
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  const { dock } = await open(context);
  await dock.getByRole("button", { name: "ส่งออก", exact: true }).click();
  const panel = dock.getByTestId("export-panel");
  await expect(panel).toContainText("3 รายการ");
  await expect(panel).toContainText("dock ใน OBS บันทึกไฟล์ไม่ได้");
  // OBS's save dialog leaves an empty file, so saving is not offered there
  await expect(panel.getByRole("button", { name: "บันทึกไฟล์…" })).toHaveCount(0);
  expect(JSON.parse(await dock.getByTestId("export-text").inputValue()).races).toHaveLength(3);
  await panel.getByRole("button", { name: "คัดลอก JSON" }).click();
  await expect(panel.getByRole("status")).toContainText("คัดลอกแล้ว");
  const copied = await dock.evaluate(() => navigator.clipboard.readText());
  expect(JSON.parse(copied).races.map((r: { name: string }) => r.name)).toContain("Sample Cup");
  await panel.getByRole("button", { name: "ปิด" }).click();
  await expect(panel).toHaveCount(0);

  // the copied text goes back in through "วาง JSON"
  await dock.getByRole("button", { name: /ลบ 11R Sample Cup/ }).click();
  await dock.getByRole("button", { name: "ลบ", exact: true }).click();
  await expect(dock.getByTestId("race-row")).toHaveCount(2);
  await dock.getByRole("button", { name: "วาง JSON" }).click();
  await dock.getByTestId("paste-text").fill("{ nope");
  await dock.getByRole("button", { name: "นำเข้าข้อความนี้" }).click();
  await expect(dock.getByRole("alert")).toContainText("นำเข้าไม่ได้");
  await dock.getByTestId("paste-text").fill(copied);
  await dock.getByRole("button", { name: "นำเข้าข้อความนี้" }).click();
  await dock.getByRole("button", { name: "แทนที่ทั้งหมด" }).click();
  await expect(dock.getByTestId("race-row")).toHaveCount(3);

  // one race from the edit tab
  await dock.getByRole("button", { name: "แก้ไข 11R Sample Cup" }).click();
  await dock.getByRole("button", { name: "ส่งออกรายการนี้" }).click();
  expect(JSON.parse(await dock.getByTestId("export-text").inputValue()).races.map((r: { name: string }) => r.name)).toEqual(["Sample Cup"]);
});

test("export outside OBS downloads the file", async ({ context }) => {
  // no "Save as" dialog in this browser, so it falls back to a download
  await context.addInitScript(() => { delete (window as unknown as { showSaveFilePicker?: unknown }).showSaveFilePicker; });
  const { dock } = await open(context);
  await dock.getByRole("button", { name: "ส่งออก", exact: true }).click();
  const [download] = await Promise.all([dock.waitForEvent("download"), dock.getByRole("button", { name: "บันทึกไฟล์…" }).click()]);
  expect(download.suggestedFilename()).toMatch(/^otamasing-broadcast-compact-.*\.json$/);
  await expect(dock.getByTestId("export-panel").getByRole("status")).toContainText("ดาวน์โหลด");
});

test("a save that leaves an empty file is reported, and an empty file is named on import", async ({ context }) => {
  // a "Save as" dialog that makes the file but fails to write it, like OBS's browser
  await context.addInitScript(() => {
    (window as unknown as { showSaveFilePicker: unknown }).showSaveFilePicker = async () => ({
      createWritable: async () => ({ write: async () => {}, close: async () => { throw new DOMException("aborted", "AbortError"); } }),
      getFile: async () => new File([], "x.json"),
    });
  });
  const { dock } = await open(context);
  await dock.getByRole("button", { name: "ส่งออก", exact: true }).click();
  await dock.getByRole("button", { name: "บันทึกไฟล์…" }).click();
  await expect(dock.getByTestId("export-panel").getByRole("alert")).toContainText("บันทึกไฟล์ไม่สำเร็จ");
  await dock.getByTestId("import-file").setInputFiles({ name: "empty.json", mimeType: "application/json", buffer: Buffer.alloc(0) });
  await expect(dock.getByRole("alert").last()).toContainText("ไฟล์ว่างเปล่า");
});

test("a name too long for its box is squeezed sideways, not cut with an ellipsis", async ({ context }) => {
  const { dock, overlay } = await open(context);
  await dock.getByRole("button", { name: "แก้ไข 11R Sample Cup" }).click();
  // keep horse 1 on screen (pages are turned by hand by default)
  await dock.getByTestId("card-pages").getByRole("button", { name: "หน้า 1" }).click();
  await dock.getByLabel("ชื่อม้าเบอร์ 1", { exact: true }).fill("Onesmoothoperator Extraordinaire Of The Northern Lantern Valley");
  const cell = overlay.locator("[data-layer][data-active] [data-no='1'] [data-testid=horse]");
  const text = cell.locator("[data-fit]");
  await expect(text).toHaveText("ONESMOOTHOPERATOR EXTRAORDINAIRE OF THE NORTHERN LANTERN VALLEY");
  const k = Number(await text.getAttribute("data-fit"));
  expect(k).toBeGreaterThan(0.3);
  expect(k).toBeLessThan(1);
  // the whole name is inside the cell
  const [c, t] = await Promise.all([cell.boundingBox(), text.boundingBox()]);
  expect(t!.x + t!.width).toBeLessThanOrEqual(c!.x + c!.width);
  // a short name is left as it is
  await dock.getByLabel("ชื่อม้าเบอร์ 1", { exact: true }).fill("Short");
  await expect(cell.locator("[data-fit]")).toHaveCount(0);
});

test("racecard: 10 horses a page, turned from the dock or by itself, and a highlight opens its page", async ({ context }) => {
  const { dock, overlay } = await open(context);
  const live = overlay.locator("[data-layer][data-active] [data-testid=racecard]");
  const nos = () => live.locator("[data-no]").evaluateAll((els) => els.map((e) => Number(e.getAttribute("data-no"))));
  await dock.getByRole("button", { name: "แก้ไข 11R Sample Cup" }).click();
  // pages are turned by hand by default
  await expect(dock.getByTestId("card-auto")).toHaveAttribute("aria-checked", "false");
  await dock.getByTestId("card-pages").getByRole("button", { name: "หน้า 2" }).click();
  await expect(live).toHaveAttribute("data-page", "2");
  await expect.poll(nos).toEqual([11, 12, 13, 14, 15, 16, 17, 18]);
  // DNF is a result: on the racecard 17 stays at full opacity; only a scratched horse is faded
  const opacity = (no: number) => live.locator(`[data-no='${no}']`).evaluate((e) => Number(getComputedStyle(e).opacity));
  await expect.poll(() => opacity(17)).toBe(1);
  await dock.getByLabel("ถอนเบอร์ 16").check();
  await expect.poll(() => opacity(16)).toBeCloseTo(0.5);
  await dock.getByLabel("ถอนเบอร์ 16").uncheck();
  // more horses: a third page
  for (let i = 0; i < 4; i++) await dock.getByRole("button", { name: "+ เพิ่มม้า" }).click();
  await expect(dock.getByTestId("card-pages").getByRole("button")).toHaveCount(3);
  // highlighting a horse turns to its page
  await dock.locator("[data-h='4']").click();
  await expect(live).toHaveAttribute("data-page", "1");
  await expect(live.locator("[data-no][data-hl=on]")).toHaveAttribute("data-no", "4");
  // the quick page buttons under the Active race in the races tab
  await dock.getByRole("tab", { name: "ภาพรวม" }).click();
  await dock.getByTestId("quick-card-pages").getByRole("button", { name: "หน้ารายชื่อ 3" }).click();
  await expect(live).toHaveAttribute("data-page", "3");
  await expect.poll(nos).toEqual([21, 22]);
  // auto: every second
  await dock.getByRole("button", { name: "แก้ไข 11R Sample Cup" }).click();
  await dock.getByLabel("เปลี่ยนหน้าทุกกี่วินาที").fill("1");
  await dock.getByTestId("card-auto").click();
  await expect(live).toHaveAttribute("data-page", "1", { timeout: 4000 });
  await expect(live).toHaveAttribute("data-page", "2", { timeout: 4000 });
});

test("result page: 10 rows a page, locked horses stay on top with the yellow bar", async ({ context }) => {
  const { dock, overlay } = await open(context);
  await dock.getByLabel("ตั้งผล 11R Sample Cup เป็น Active").click();
  await expect(dock.getByTestId("active-tag")).toHaveText("Active: 11R ผล");
  const live = overlay.locator("[data-layer][data-active] [data-testid=result]");
  await dock.getByRole("button", { name: "แก้ไข 11R Sample Cup" }).click();
  await dock.getByRole("tab", { name: "ผล" }).click();
  // pages are stepped by hand by default
  await dock.locator("[data-page='1']").click();
  const rows = live.locator("[data-no]");
  await expect(rows).toHaveCount(10);
  await expect(live.locator("[data-testid=pos]")).toHaveText(["1st", "2nd", "3rd", "4th", "5th", "6th", "7th", "8th", "9th", "10th"]);
  await expect(live.locator("[data-no='9'] [data-testid=time]")).toHaveText("2:24.1");
  await expect(live.locator("[data-no='3'] [data-testid=margin]")).toHaveText("1¼");

  for (const no of [9, 3, 12]) await dock.getByLabel(`ล็อคเบอร์ ${no}`).click();
  await expect(live.locator("[data-locked] [data-testid=highlight-bar]")).toHaveCount(6); // two bars per locked row
  await dock.locator("[data-page='2']").click();
  await expect(live.locator("[data-testid=pos]")).toHaveText(["1st", "2nd", "3rd", "11th", "12th", "13th", "14th", "15th", "16th", "DNF"]);
  await expect(live.locator("[data-locked]")).toHaveCount(3);
  await expect(live.locator("[data-no='17'] [data-testid=time]")).toHaveText("");
  // DNF / DQ / SCR rows are at half opacity
  for (const no of [17]) await expect.poll(() => live.locator(`[data-no='${no}']`).evaluate((e) => Number(getComputedStyle(e).opacity))).toBeCloseTo(0.5);
  expect(await live.locator("[data-no='9']").evaluate((e) => Number(getComputedStyle(e).opacity))).toBe(1);

  // a new position from the dock reaches the screen; unlocking puts the horse back in the paged rows
  await dock.getByLabel("ล็อคเบอร์ 12").click();
  await expect(live.locator("[data-testid=pos]")).toHaveText(["1st", "2nd", "11th", "12th", "13th", "14th", "15th", "16th", "DNF", "SCR"]);
  await expect.poll(() => live.locator("[data-no='6']").evaluate((e) => Number(getComputedStyle(e).opacity))).toBeCloseTo(0.5);
  // a disqualified horse leaves the finishers and goes after DNF
  await dock.getByLabel("สถานะเบอร์ 11").selectOption("dq");
  await expect(live.locator("[data-testid=pos]")).toHaveText(["1st", "2nd", "12th", "13th", "14th", "15th", "16th", "DNF", "DQ", "SCR"]);
  await dock.getByLabel("เวลาเบอร์ 9").fill("2:23.9");
  await expect(live.locator("[data-no='9'] [data-testid=time]")).toHaveText("2:23.9");
  // fraction buttons type into the margin field in use, at the caret
  await expect(dock.getByRole("button", { name: "ใส่ ½" })).toBeDisabled();
  const margin = dock.getByLabel("ระยะห่างเบอร์ 9", { exact: true });
  await margin.fill("2");
  await dock.getByRole("button", { name: "ใส่ ½" }).click();
  await expect(margin).toHaveValue("2½");
  await expect(margin).toBeFocused();
  await margin.press("Home");
  await dock.getByRole("button", { name: "ใส่ ¾" }).click();
  await expect(margin).toHaveValue("¾2½");
  await expect(live.locator("[data-no='9'] [data-testid=margin]")).toHaveText("¾2½");
});

test("result pages take turns by themselves every x seconds", async ({ context }) => {
  const { dock, overlay } = await open(context);
  await dock.getByLabel("ตั้งผล 11R Sample Cup เป็น Active").click();
  const first = overlay.locator("[data-layer][data-active] [data-testid=result] [data-testid=pos]").first();
  await dock.getByRole("button", { name: "แก้ไข 11R Sample Cup" }).click();
  await dock.getByRole("tab", { name: "ผล" }).click();
  // off by default; turned on, every second
  await expect(dock.getByTestId("result-auto")).toHaveAttribute("aria-checked", "false");
  await dock.getByLabel("เปลี่ยนหน้าทุกกี่วินาที").fill("1");
  await dock.getByTestId("result-auto").click();
  await expect(first).toHaveText("11th", { timeout: 4000 });
  await expect(dock.locator("[data-page='2']")).toHaveAttribute("aria-pressed", "true");
  await expect(first).toHaveText("1st", { timeout: 4000 });
  await expect(first).toHaveText("11th", { timeout: 4000 });
  // off: stays on the page on screen
  await dock.getByTestId("result-auto").click();
  await overlay.waitForTimeout(1200); // let the rows finish sliding
  const now = await first.textContent();
  await overlay.waitForTimeout(2500);
  await expect(first).toHaveText(now!);
});

test("the blank page takes everything off the screen, with or without a transition", async ({ context }) => {
  const { dock, overlay } = await open(context);
  for (const t of ["wipe", "slide", "fade", "none"]) {
    await dock.getByLabel("ทรานซิชัน").selectOption(t);
    await dock.getByRole("button", { name: "ตั้งหน้าเปล่าเป็น Active" }).click();
    await expect(dock.getByTestId("active-tag")).toHaveText("Active: หน้าเปล่า");
    await expect(overlay.locator("[data-layer]")).toHaveCount(1, { timeout: 3000 });
    await expect(overlay.locator("[data-layer][data-active=blank] [data-testid=blank]")).toHaveCount(1);
    await dock.getByRole("button", { name: "ตั้งหน้าแรกเป็น Active" }).click();
    await expect(overlay.locator("[data-layer]")).toHaveCount(1, { timeout: 3000 });
    await expect(overlay.locator("[data-layer][data-active] [data-testid=race-list]")).toBeVisible();
  }
});

const PNG = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFBQIAX8jx0gAAAABJRU5ErkJggg==", "base64");
const png = (name: string) => ({ name, mimeType: "image/png", buffer: PNG });

test("pictures: separate sets for the racecard and the result page, step by hand or change automatically", async ({ context }) => {
  const { dock, overlay } = await open(context);
  const shownKey = () => overlay.locator("[data-layer][data-active] [data-testid=photo]").last().getAttribute("data-key");
  await dock.getByRole("button", { name: "แก้ไข 11R Sample Cup" }).click();
  await dock.getByTestId("add-photos-card").setInputFiles([png("a.png"), png("b.png")]);
  await expect(dock.getByTestId("thumbs-card").locator("[data-thumb]")).toHaveCount(2);
  // pictures are changed by hand by default
  await expect(dock.getByTestId("auto-card")).toHaveAttribute("aria-checked", "false");
  await dock.getByRole("button", { name: "แสดงรูปที่ 1" }).click();
  await expect(dock.getByTestId("photo-pos-card")).toHaveText("1 / 2");
  await expect.poll(shownKey).toBeTruthy();
  // wait for an earlier picture still fading out
  await expect(overlay.locator("[data-layer][data-active] [data-testid=photo]")).toHaveCount(1);
  const first = await shownKey();
  await dock.getByRole("button", { name: "รูปถัดไป" }).click();
  await expect(dock.getByTestId("photo-pos-card")).toHaveText("2 / 2");
  await expect.poll(shownKey).not.toBe(first);
  const second = await shownKey();
  // automatic every 1 second
  await dock.getByLabel("ทุกกี่วินาที", { exact: true }).fill("1");
  await dock.getByTestId("auto-card").click();
  await expect.poll(shownKey, { timeout: 4000 }).toBe(first);
  await expect.poll(shownKey, { timeout: 4000 }).toBe(second);

  // the result page has its own pictures
  await dock.getByRole("tab", { name: "ผล" }).click();
  await dock.getByTestId("add-photos-result").setInputFiles([png("c.png")]);
  await dock.getByRole("button", { name: "ตั้งหน้าผลเป็น Active" }).click();
  await expect(overlay.locator("[data-layer][data-active] [data-testid=result]")).toBeVisible();
  await expect.poll(shownKey).not.toBe(first);
  expect([first, second]).not.toContain(await shownKey());
  // removing it leaves the result page without a picture
  await dock.getByRole("button", { name: "ลบรูปที่ 1" }).click();
  await expect(overlay.locator("[data-layer][data-active] [data-testid=photo]")).toHaveCount(0);
});

test("the home page shows 8 races a page; the dock turns the page", async ({ context }) => {
  const { dock, overlay } = await open(context);
  const races = Array.from({ length: 10 }, (_, i) => ({ date: "2026-12-06", course: "Kyoto", round: `${i + 1}R`, name: `Race ${i + 1}`, runners: [{ number: 1 }, { number: 2 }] }));
  await dock.getByTestId("import-file").setInputFiles({ name: "day.json", mimeType: "application/json", buffer: Buffer.from(JSON.stringify({ races })) });
  await dock.getByRole("button", { name: "เพิ่มต่อ" }).click();
  await dock.getByRole("button", { name: "ตั้งหน้าแรกเป็น Active" }).click();
  const rows = overlay.locator("[data-layer][data-active] [data-testid=race-list-row]");
  await expect(rows).toHaveCount(8);
  await dock.getByTestId("quick-home-pages").getByRole("button", { name: /2$/ }).click();
  await expect(rows).toHaveCount(5); // 13 races: 8 + 5
  await expect(rows.first()).toHaveAttribute("data-race", /.+/);
  // highlighting a race on page 1 turns back to page 1
  await dock.locator("[data-lh='sample-11']").click();
  await expect(rows).toHaveCount(8);
  await expect(overlay.locator("[data-layer][data-active] [data-testid=race-list-row][data-hl=on]")).toHaveAttribute("data-race", "sample-11");
});

test("horse tab: put a horse on screen, profile then past races newest first, currency choice", async ({ context }) => {
  const { dock, overlay } = await open(context);
  await dock.getByRole("tab", { name: "ม้า" }).click();
  await expect(dock.getByTestId("horse-preview")).toBeVisible();
  await dock.getByRole("button", { name: "ตั้งเป็น Active" }).click();
  await expect(dock.getByTestId("active-tag")).toHaveText("Active: Sample Star");
  const scene = overlay.locator("[data-layer][data-active] [data-testid=horse]");
  await expect(scene.getByTestId("horse-name")).toHaveText("Sample Star");
  await expect(scene.getByTestId("pedigree")).toHaveText(/Example Sire – Paper Princess.*\(by Old Champion\)/i);
  await expect(scene.getByTestId("fact-record")).toContainText("10 (5-2-1-2)");
  await expect(scene.getByTestId("fact-earnings")).toContainText("¥812,345,000");
  await expect(scene.getByTestId("fact-born")).toContainText("Japan");
  // the owner's silks drawn as SVG; turned off in the dock they leave the screen
  await expect(scene.getByTestId("silks-svg")).toBeVisible();
  // silks: upload / pattern / none
  await dock.getByTestId("silks-mode-none").click();
  await expect(scene.getByTestId("silks")).toHaveCount(0);
  await dock.getByTestId("silks-mode-upload").click();
  await dock.getByTestId("silks-file").setInputFiles(png("silks.png"));
  await expect(scene.locator("[data-testid=silks] img")).toBeVisible();
  await dock.getByTestId("silks-mode-pattern").click();
  await expect(scene.getByTestId("silks-svg")).toBeVisible();
  // no picture: the text takes the whole screen
  await expect(scene).toHaveAttribute("data-full", "");
  // several horse pictures take turns
  await dock.getByTestId("add-photos-horse").setInputFiles([png("a.png"), png("b.png")]);
  await dock.getByRole("button", { name: "แสดงรูปที่ 1" }).click();
  await expect(dock.getByTestId("photo-pos-horse")).toHaveText("1 / 2");
  await dock.getByRole("button", { name: "รูปม้าถัดไป" }).click();
  await expect(dock.getByTestId("photo-pos-horse")).toHaveText("2 / 2");
  await expect(scene.getByTestId("horse-photo")).toHaveAttribute("data-has", "");
  await expect(scene).not.toHaveAttribute("data-full", "");
  await expect(scene.getByTestId("horse-page-title").filter({ hasText: "PROFILE" })).toHaveCount(1);
  // a very long owner stays on one line (squeezed) and never reaches the PROFILE heading; the trainer stays on one line too
  await dock.locator("#h-owner").fill("OGMA Investments LLC, Al Otaibi, Saleh, TCC Stables LLC, YNG Stables LLC, High Step Racing and JR Ranch");
  await dock.locator("#h-trainer").fill("Gustavo Delgado");
  await expect(scene.getByTestId("owner").locator("[data-fit]")).toHaveCount(1);
  const box = async (id: string) => (await scene.getByTestId(id).first().boundingBox())!;
  const [owner, trainer, title] = [await box("owner"), await box("trainer"), await box("horse-page-title")];
  expect(owner.height).toBeLessThan(60);
  expect(trainer.height).toBeLessThan(60);
  expect(owner.y + owner.height).toBeLessThan(title.y);
  expect(owner.x + owner.width).toBeLessThanOrEqual(trainer.x);
  // the dock picks the prize money currency for every horse
  await dock.getByTestId("horse-currency").selectOption("USD");
  await expect(scene.getByTestId("fact-earnings")).toContainText("≈ $5,361,477");
  // the sex after the name and between foaled and colour
  await expect(scene.getByTestId("horse-sex")).toHaveText("COLT");
  await expect(scene.getByTestId("fact-sex")).toContainText("COLT");
  // page 2: the pedigree, three generations, male side light blue, female side light red
  await dock.getByRole("button", { name: "หน้า 2" }).click();
  await expect(scene).toHaveAttribute("data-page", "2");
  await expect(scene.getByTestId("horse-page-title").filter({ hasText: "PEDIGREE" })).toHaveCount(1);
  await expect(scene.getByTestId("ped-sire")).toContainText("Example Sire");
  await expect(scene.getByTestId("ped-sire")).toHaveAttribute("data-sex", "M");
  await expect(scene.getByTestId("ped-damDam")).toContainText("Paper Queen");
  await expect(scene.getByTestId("ped-damDam")).toHaveAttribute("data-sex", "F");
  await expect(scene.getByTestId("ped-damSire")).toContainText("Old Champion");
  // page 3: the newest 7 races; a win shows the runner-up in brackets, 1st/2nd/3rd in gold/silver/bronze
  await dock.getByRole("button", { name: "หน้า 3" }).click();
  await expect(scene.getByTestId("career-row")).toHaveCount(7);
  await expect(scene.getByTestId("horse-page-title").filter({ hasText: "RACE RECORD 1/2" })).toHaveCount(1);
  await expect(scene.getByTestId("career-pos").first()).toHaveText("1/18");
  await expect(scene.getByTestId("career-pos").first()).toHaveAttribute("data-medal", "1");
  await expect(scene.getByTestId("career-pos").nth(2)).toHaveAttribute("data-medal", "2");
  await expect(scene.getByTestId("career-pos").nth(3)).toHaveAttribute("data-medal", "3");
  await expect(scene.getByTestId("career-winner").first()).toHaveText("(Morning Gallop)");
  await dock.getByRole("button", { name: "หน้า 4" }).click();
  await expect(scene.getByTestId("career-row")).toHaveCount(3);
  // a past race's grade is picked from a list, jump grades included
  await dock.getByTestId("career-list").getByRole("button").first().click();
  await expect(dock.getByTestId("career-edit").getByLabel("เกรด").locator("option")).toHaveText(["–", "G1", "G2", "G3", "L", "JG-1", "JG-2", "JG-3"]);
  await dock.getByTestId("career-edit").getByLabel("เกรด").selectOption("JG-1");
  await dock.getByRole("button", { name: "หน้า 3" }).click();
  await expect(scene.getByTestId("career-grade").first()).toHaveText("JG-1");
  // a new horse; deleting the Active horse puts the home page back
  await dock.getByRole("button", { name: "+ เพิ่มม้า" }).click();
  await dock.locator("#h-name").fill("Brand New");
  await expect(dock.getByRole("tab", { name: "Brand New" })).toBeVisible();
  await dock.getByRole("tab", { name: "Sample Star" }).click();
  await dock.getByRole("button", { name: "ลบ", exact: true }).click();
  await dock.getByRole("button", { name: "ลบเลย" }).click();
  await expect(overlay.locator("[data-layer][data-active] [data-testid=race-list]")).toBeVisible();
});

test("pictures are named image/<date-time>.<ext>, the JSON carries the names, a missing one is reported and taken out", async ({ context }) => {
  context.addInitScript(() => { (window as unknown as { obsstudio: object }).obsstudio = {}; });
  const { dock } = await open(context);
  const stored = () => dock.evaluate(() => new Promise<string[]>((res) => {
    const req = indexedDB.open("otamasing-broadcast-compact", 1);
    req.onsuccess = () => { const all = req.result.transaction("images").objectStore("images").getAllKeys(); all.onsuccess = () => res(all.result as string[]); };
  }));
  await dock.getByRole("button", { name: "แก้ไข 11R Sample Cup" }).click();
  await dock.getByTestId("add-photos-card").setInputFiles([png("a.png"), png("b.png")]);
  await expect(dock.getByTestId("thumbs-card").locator("[data-thumb]")).toHaveCount(2);
  await expect.poll(stored).toHaveLength(2);
  const names = await stored();
  for (const n of names) expect(n).toMatch(/^image\/\d{17}\.png$/);
  // the export names the pictures
  await dock.getByRole("button", { name: "ส่งออกรายการนี้" }).click();
  const file = JSON.parse(await dock.getByTestId("export-text").inputValue());
  expect([...file.races[0].photos.card.keys].sort()).toEqual([...names].sort());
  await dock.getByTestId("export-panel").getByRole("button", { name: "ปิด" }).click();
  // removing a picture in the dock deletes it from the browser too
  await dock.getByRole("button", { name: "ลบรูปที่ 2" }).click();
  await expect.poll(stored).toHaveLength(1);
  // importing the earlier JSON: the deleted picture and a made-up one are reported and taken out
  const kept = (await stored())[0];
  file.races[0].photos.card.keys.push("image/20990101000000000.jpg");
  await dock.getByRole("tab", { name: "ภาพรวม" }).click();
  await dock.getByRole("button", { name: "วาง JSON" }).click();
  await dock.getByTestId("paste-text").fill(JSON.stringify(file));
  await dock.getByRole("button", { name: "นำเข้าข้อความนี้" }).click();
  await dock.getByRole("button", { name: "เพิ่มต่อ" }).click();
  const alert = dock.getByRole("alert");
  await expect(alert).toContainText("ไม่พบรูปในเครื่องนี้หรือไฟล์รูปเสีย 2 รูป");
  await expect(alert).toContainText("image/20990101000000000.jpg");
  expect(await alert.textContent()).not.toContain(kept);
  await dock.getByRole("button", { name: "แก้ไข 11R Sample Cup" }).click();
  await expect(dock.getByTestId("thumbs-card").locator("[data-thumb]")).toHaveCount(1);
  // the danger button clears every stored picture, after a warning
  await dock.getByRole("tab", { name: "ภาพรวม" }).click();
  await expect(dock.getByTestId("stored-count")).toHaveText("1 รูป");
  await dock.getByRole("button", { name: "ลบรูปทั้งหมดในเครื่อง…" }).click();
  await expect(dock.getByRole("alertdialog")).toContainText("รูปทุกรูปที่เก็บไว้ในเครื่องนี้จะหายไปหมด");
  await dock.getByRole("button", { name: "ลบรูปทั้งหมดเลย" }).click();
  await expect.poll(stored).toHaveLength(0);
  await expect(dock.getByTestId("stored-count")).toHaveText("0 รูป");
  await dock.getByRole("button", { name: "แก้ไข 11R Sample Cup" }).click();
  await expect(dock.getByTestId("thumbs-card")).toHaveCount(0);
});

test("a .zip with the JSON and its pictures moves pictures to another browser (e.g. into OBS)", async ({ browser, baseURL }) => {
  // Chrome: no "Save as" dialog here, so the .zip is downloaded
  const chrome = await browser.newContext({ baseURL });
  await chrome.addInitScript(() => { delete (window as unknown as { showSaveFilePicker?: unknown }).showSaveFilePicker; });
  const { dock } = await open(chrome);
  await dock.getByRole("button", { name: "แก้ไข 11R Sample Cup" }).click();
  await dock.getByTestId("add-photos-card").setInputFiles([png("a.png")]);
  await expect(dock.getByTestId("thumbs-card").locator("[data-thumb]")).toHaveCount(1);
  await dock.getByRole("tab", { name: "ภาพรวม" }).click();
  await dock.getByRole("button", { name: "ส่งออก", exact: true }).click();
  const [download] = await Promise.all([dock.waitForEvent("download"), dock.getByRole("button", { name: "บันทึก .zip พร้อมรูป…" }).click()]);
  expect(download.suggestedFilename()).toMatch(/\.zip$/);
  await expect(dock.getByTestId("export-panel").getByRole("status")).toContainText("พร้อมรูป 1 รูป");
  const zipPath = test.info().outputPath("bundle.zip");
  await download.saveAs(zipPath);
  await chrome.close();

  // OBS: its own storage, no pictures until the .zip comes in
  const obs = await browser.newContext({ baseURL });
  const o = await open(obs);
  await o.dock.getByTestId("import-file").setInputFiles(zipPath);
  await expect(o.dock.getByText(/รูป 1 รูป/)).toBeVisible();
  await o.dock.getByRole("button", { name: "แทนที่ทั้งหมด" }).click();
  await expect(o.dock.getByRole("status")).toContainText("นำเข้า 3 รายการ");
  await expect(o.dock.getByRole("alert")).toHaveCount(0);
  await o.dock.getByRole("button", { name: "แก้ไข 11R Sample Cup" }).click();
  await expect(o.dock.getByTestId("thumbs-card").locator("[data-thumb]")).toHaveCount(1);
  // after an import the home page is on screen, so look at the race's preview in the dock
  await expect(o.dock.getByTestId("preview").locator("[data-testid=photo]")).toHaveCount(1);
  await obs.close();
});
