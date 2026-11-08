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
const gateOn = (dock: Page, race = "11R Sample Cup") => dock.getByRole("button", { name: `ตั้งGate ${race} เป็น Active` }).click();

test("first open seeds the sample; the dock has only the intro's screens", async ({ context }) => {
  const { dock, overlay } = await open(context);
  await expect(dock.getByTestId("active-tag")).toHaveText("Active: 11R แนะนำ");
  await expect(dock.getByRole("tab")).toHaveText(["ภาพรวม", "การแข่งขัน", "ม้า", "จ็อกกี้"]);
  await expect(live(overlay).getByTestId("runner-scene")).toBeVisible();
  // the race list, racecard, result page and horse profile are broadcast compact's
  await expect(dock.getByRole("button", { name: "ตั้งหน้าแรกเป็น Active" })).toHaveCount(0);
  await expect(dock.getByRole("button", { name: "ตั้งหน้าเปล่าเป็น Active" })).toHaveCount(1);
  await expect(dock.getByTestId("intro-buttons").first().getByRole("button")).toHaveText(["สนาม", "แนะนำ", "Gate"]);
  await dock.getByRole("tab", { name: "การแข่งขัน" }).click();
  await expect(dock.getByRole("tablist", { name: "ส่วนที่แก้ไข" }).getByRole("tab")).toHaveText(["ข้อมูล", "สไตล์", "สนาม", "ประวัติ", "แนะนำตัว", "Starting Gate"]);
  await dock.getByRole("tab", { name: "ม้า", exact: true }).click();
  await expect(dock.getByText("Pedigree", { exact: true })).toBeVisible();
  await expect(dock.getByText(/ผลงาน \d+ รายการ/)).toHaveCount(0);
});

test("a scene button switches the overlay with a transition; the row itself opens the course scene", async ({ context }) => {
  const { dock, overlay } = await open(context);
  await dock.getByLabel("ทรานซิชัน").selectOption("fade");
  await gateOn(dock, "12R Sample Juvenile");
  await expect(live(overlay).getByTestId("grid-scene")).toHaveAttribute("data-race", "sample-12");
  await expect(overlay.locator("[data-layer]")).toHaveCount(1, { timeout: 3000 });
  await expect(dock.getByTestId("active-tag")).toHaveText("Active: 12R Gate");
  // the row's scene buttons sit over its middle, so click near its left edge
  await dock.getByRole("button", { name: "ตั้ง 10R Shimotsuki Stakes เป็น Active" }).click({ position: { x: 60, y: 20 } });
  await expect(dock.getByTestId("active-tag")).toHaveText("Active: 10R สนาม");
  await expect(overlay.locator("[data-layer][data-active='course:sample-10']")).toHaveCount(1);
});

test("edits in the dock reach the STARTING GATE: horse name, flags, toggles", async ({ context }) => {
  const { dock, overlay } = await open(context);
  await gateOn(dock);
  await dock.getByRole("button", { name: "แก้ไข 11R Sample Cup" }).click();
  const row = live(overlay).locator("[data-testid=grid-scene] [data-no='1']");
  await dock.getByLabel("ชื่อม้าเบอร์ 1", { exact: true }).fill("Edited Star");
  await expect(row.getByTestId("horse")).toHaveText("EDITED STAR");
  await dock.getByRole("button", { name: "ธงม้าเบอร์ 1: ญี่ปุ่น" }).click();
  await dock.getByLabel("ค้นหาประเทศ").fill("nzl");
  await dock.getByRole("option", { name: /นิวซีแลนด์/ }).click();
  await expect(row.locator("[data-testid=horse] img")).toHaveAttribute("alt", "NZ");
  await dock.getByRole("tab", { name: "สไตล์" }).click();
  await dock.getByTestId("show-horseFlag").click();
  await expect(row.locator("[data-testid=horse] img")).toHaveCount(0);
});

test("import JSON (append / replace), reject a bad file, delete with confirm", async ({ context }) => {
  const { dock, overlay } = await open(context);
  const file = { name: "races.json", mimeType: "application/json", buffer: Buffer.from(JSON.stringify({ races: [{ date: "2026-12-06", course: "Kyoto", round: "11R", name: "Imported Stakes", runners: [{ number: 1, name: "A" }, { number: 2, name: "B" }] }] })) };
  await dock.getByTestId("import-file").setInputFiles(file);
  await dock.getByRole("button", { name: "เพิ่มต่อ" }).click();
  await expect(dock.getByRole("status")).toContainText("นำเข้า 1 รายการแล้ว");
  await expect(dock.getByTestId("race-row")).toHaveCount(4);
  // after an import the screen is blank
  await expect(dock.getByTestId("active-tag")).toHaveText("Active: หน้าเปล่า");

  await dock.getByTestId("import-file").setInputFiles({ name: "bad.json", mimeType: "application/json", buffer: Buffer.from("{ nope") });
  await expect(dock.getByRole("alert")).toContainText("นำเข้าไม่ได้");

  await gateOn(dock);
  await expect(live(overlay).getByTestId("grid-scene")).toBeVisible();
  await dock.getByRole("button", { name: /ลบ 11R Sample Cup/ }).click();
  await dock.getByRole("button", { name: "ลบ", exact: true }).click();
  await expect(dock.getByTestId("race-row")).toHaveCount(3);
  // the deleted race was Active, so the overlay goes blank
  await expect(dock.getByTestId("active-tag")).toHaveText("Active: หน้าเปล่า");
  await expect(overlay.locator("[data-layer][data-active=blank] [data-testid=blank]")).toHaveCount(1);

  await dock.getByTestId("import-file").setInputFiles(file);
  // a file of races replaces the races only: the horses stay
  await dock.getByRole("button", { name: "แทนที่รายการแข่งทั้งหมด" }).click();
  await expect(dock.getByTestId("race-row")).toHaveCount(1);
  await dock.getByRole("tab", { name: "ม้า", exact: true }).click();
  await expect(dock.getByRole("tab", { name: "Morning Gallop" })).toBeVisible();
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
  expect(download.suggestedFilename()).toMatch(/^otamasing-broadcast-intro-.*\.json$/);
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
  await gateOn(dock);
  await dock.getByRole("button", { name: "แก้ไข 11R Sample Cup" }).click();
  // 17 rows on one page make the text small, so it takes a long name to overflow
  const name = "Onesmoothoperator Extraordinaire Of The Northern Lantern Valley And The Southern Silver Paddock Beyond The Long Stretch Of Kyoto";
  await dock.getByLabel("ชื่อม้าเบอร์ 1", { exact: true }).fill(name);
  const cell = live(overlay).locator("[data-testid=grid-scene] [data-no='1'] [data-testid=horse]");
  const text = cell.locator("[data-fit]");
  await expect(text).toHaveText(name.toUpperCase());
  const k = Number(await text.getAttribute("data-fit"));
  expect(k).toBeGreaterThan(0.2);
  expect(k).toBeLessThan(1);
  // the whole name is inside the cell
  const [c, t] = await Promise.all([cell.boundingBox(), text.boundingBox()]);
  expect(t!.x + t!.width).toBeLessThanOrEqual(c!.x + c!.width + 1);
  // a short name is left as it is
  await dock.getByLabel("ชื่อม้าเบอร์ 1", { exact: true }).fill("Short");
  await expect(cell.locator("[data-fit]")).toHaveCount(0);
});

test("the blank page takes everything off the screen, with every transition", async ({ context }) => {
  const { dock, overlay } = await open(context);
  for (const t of ["stripes", "wipe", "slide", "fade", "none"]) {
    await dock.getByLabel("ทรานซิชัน").selectOption(t);
    await dock.getByRole("button", { name: "ตั้งหน้าเปล่าเป็น Active" }).click();
    await expect(dock.getByTestId("active-tag")).toHaveText("Active: หน้าเปล่า");
    await expect(overlay.locator("[data-layer]")).toHaveCount(1, { timeout: 5000 });
    await expect(overlay.locator("[data-layer][data-active=blank] [data-testid=blank]")).toHaveCount(1);
    await gateOn(dock);
    await expect(overlay.locator("[data-layer]")).toHaveCount(1, { timeout: 5000 });
    await expect(live(overlay).getByTestId("grid-scene")).toBeVisible();
  }
});

const PNG = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFBQIAX8jx0gAAAABJRU5ErkJggg==", "base64");
const png = (name: string) => ({ name, mimeType: "image/png", buffer: PNG });
/** The STARTING GATE part of a race in the edit tab. */
async function gateEdit(dock: Page) {
  await dock.getByRole("button", { name: "แก้ไข 11R Sample Cup" }).click();
  await dock.locator("#sub-grid").click();
}

test("pictures behind the STARTING GATE: step by hand or change automatically", async ({ context }) => {
  const { dock, overlay } = await open(context);
  const shownKey = () => live(overlay).getByTestId("photo").last().getAttribute("data-key");
  await gateOn(dock);
  await gateEdit(dock);
  await dock.getByTestId("add-photos-card").setInputFiles([png("a.png"), png("b.png")]);
  await expect(dock.getByTestId("thumbs-card").locator("[data-thumb]")).toHaveCount(2);
  // pictures are changed by hand by default
  await expect(dock.getByTestId("auto-card")).toHaveAttribute("aria-checked", "false");
  await dock.getByRole("button", { name: "แสดงรูปที่ 1" }).click();
  await expect(dock.getByTestId("photo-pos-card")).toHaveText("1 / 2");
  await expect.poll(shownKey).toBeTruthy();
  // wait for an earlier picture still fading out
  await expect(live(overlay).getByTestId("photo")).toHaveCount(1);
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
  // removing both leaves the gate without a picture
  await dock.getByRole("button", { name: "ลบรูปที่ 2" }).click();
  await dock.getByRole("button", { name: "ลบรูปที่ 1" }).click();
  await expect(live(overlay).getByTestId("photo")).toHaveCount(0);
});

test("pictures are named image/<date-time>.<ext>, the JSON carries the names, a missing one is reported and taken out", async ({ context }) => {
  context.addInitScript(() => { (window as unknown as { obsstudio: object }).obsstudio = {}; });
  const { dock } = await open(context);
  const stored = () => dock.evaluate(() => new Promise<string[]>((res) => {
    const req = indexedDB.open("otamasing-broadcast-intro", 1);
    req.onsuccess = () => { const all = req.result.transaction("images").objectStore("images").getAllKeys(); all.onsuccess = () => res(all.result as string[]); };
  }));
  await gateEdit(dock);
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
  await gateEdit(dock);
  await expect(dock.getByTestId("thumbs-card").locator("[data-thumb]")).toHaveCount(1);
  // the danger button clears every stored picture, after a warning
  await dock.getByRole("tab", { name: "ภาพรวม" }).click();
  await expect(dock.getByTestId("stored-count")).toHaveText("1 รูป");
  await dock.getByRole("button", { name: "ลบรูปทั้งหมดในเครื่อง…" }).click();
  await expect(dock.getByRole("alertdialog")).toContainText("รูปทุกรูปที่เก็บไว้ในเครื่องนี้จะหายไปหมด");
  await dock.getByRole("button", { name: "ลบรูปทั้งหมดเลย" }).click();
  await expect.poll(stored).toHaveLength(0);
  await expect(dock.getByTestId("stored-count")).toHaveText("0 รูป");
  await gateEdit(dock);
  await expect(dock.getByTestId("add-photos-card")).toHaveCount(1);
  await expect(dock.getByTestId("thumbs-card")).toHaveCount(0);
});

test("a .zip with the JSON and its pictures moves pictures to another browser (e.g. into OBS)", async ({ browser, baseURL }) => {
  // Chrome: no "Save as" dialog here, so the .zip is downloaded
  const chrome = await browser.newContext({ baseURL });
  await chrome.addInitScript(() => { delete (window as unknown as { showSaveFilePicker?: unknown }).showSaveFilePicker; });
  const { dock } = await open(chrome);
  await gateEdit(dock);
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
  await gateEdit(o.dock);
  await expect(o.dock.getByTestId("thumbs-card").locator("[data-thumb]")).toHaveCount(1);
  // the picture is behind the STARTING GATE on the OBS screen
  await o.dock.getByRole("tab", { name: "ภาพรวม" }).click();
  await gateOn(o.dock);
  await expect(live(o.overlay).getByTestId("photo")).toHaveCount(1);
  await obs.close();
});
