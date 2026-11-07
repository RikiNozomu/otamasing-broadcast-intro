# โอตะม้าซิ่ง Broadcast Compact

ต่อยอดจาก [otamasing-broadcast](https://github.com/RikiNozomu/otamasing-broadcast) โดยเปลี่ยนหน้าตา: ชื่อรายการอยู่ด้านบน (ชื่อ + ป้ายเกรด/Class หลังชื่อ แล้วบรรทัด วันที่ · รอบ · สนาม · ระยะ), ตารางรายชื่อม้าและผลการแข่งขันเต็มความกว้าง หน้าละไม่เกิน 10 แถว เปลี่ยนหน้าเองหรือให้วนอัตโนมัติ (ค่าเริ่มต้นเปลี่ยนเอง) และรูปฉากหลังเต็มจอมี gradient ทับ ข้อมูลเก็บแยกจากเว็บเดิม (คนละ localStorage key) ไฟล์ JSON ใช้ร่วมกันได้

แผงควบคุมใน OBS (Custom Browser Dock) กับหน้าจอออกอากาศ (Browser Source) สำหรับ **การ์ดรายชื่อม้า** และ **รายการแข่งขัน** ของโอตะม้าซิ่ง เป็นเว็บ static บน GitHub Pages ไม่มี server ไม่มีล็อกอิน และไม่เกี่ยวกับเกม POG

| หน้า | URL | ใช้ใน OBS เป็น |
| --- | --- | --- |
| Dock | `https://rikinozomu.github.io/otamasing-broadcast-compact/#/dock` | Docks → Custom Browser Docks |
| หน้าจอออกอากาศ | `https://rikinozomu.github.io/otamasing-broadcast-compact/#/overlay` | Sources → Browser ขนาด 1920×1080 (ตัวเดียว) |

## ใช้งาน

- หน้าจอออกอากาศแสดงสิ่งที่ **Active** อยู่ใน dock: "หน้าแรก" (รายการแข่งขันทั้งหมด) หรือการ์ดรายชื่อม้าของรายการหนึ่ง เปลี่ยน Active แล้วมีทรานซิชัน (Wipe / Slide / Fade / ไม่มี)
- แท็บ **ภาพรวม**: ตั้ง Active, นำเข้า JSON (เลือกไฟล์ หรือ "วาง JSON" เป็นข้อความ), ส่งออก (บันทึกไฟล์ หรือ "คัดลอก JSON" เพราะ dock ใน OBS บันทึกไฟล์ไม่ได้ ได้ไฟล์ว่าง), เพิ่มเอง, ลาก ⠿ เรียงลำดับ, ลบ, ตั้งค่าหน้าแรก (Title, Sub title, BG, ไฮไลต์รายการ), คัดลอก URL
- แท็บ **ม้า**: ข้อมูลม้าแต่ละตัว (รูปม้า, รูปสีเสื้อเจ้าของ, ประเทศที่ฝึก/เกิด, วันเกิด, สีขน, พ่อ/แม่/BMS, เจ้าของ, เทรนเนอร์, สถิติ, เงินรางวัล, ผลงาน) ตั้งเป็น Active ได้ หน้าบนจอวนเองได้ และเลือกสกุลเงินรางวัลที่แสดงของม้าทุกตัว (ค่าเริ่มต้นตามสกุลเงินของม้าแต่ละตัว)
- แท็บ **การแข่งขัน**: เลือกรายการไหนก็ได้ (ไม่ต้อง Active) แก้ **ข้อมูล** (รูป, ชื่อ, เลขรอบ, เวลา, สนาม, พื้น, ระยะ, เกรด, Class, หน้ารายชื่อม้าบนจอ (กดเลขหน้า / วนหน้าอัตโนมัติ), ไฮไลต์ม้า (เปิดหน้าที่มีม้าตัวนั้นให้), ตารางม้า 2–30 ตัว พร้อมธง) และ **สไตล์** ของรายการนั้น (สี DRAW/NO. แบบ JRA / อเมริกา / ไม่มีสี / Custom, ป้ายเกรด, เปิด/ปิดแต่ละส่วน)
- ข้อมูลเก็บใน localStorage ของเบราว์เซอร์ (รูปเก็บใน IndexedDB ชื่อ `image/ปีเดือนวันเวลามิลลิวินาที.นามสกุล` และไฟล์ JSON เก็บชื่อนี้ไว้; ย้ายพร้อมรูปได้ด้วยไฟล์ .zip จากปุ่ม "บันทึก .zip พร้อมรูป") ครั้งแรกจะมีข้อมูลตัวอย่างให้ dock กับหน้าจอใน OBS ใช้ที่เก็บเดียวกันจึงซิงก์กันทันที แต่ OBS แยกจาก Chrome ปกติ ถ้าเตรียมข้อมูลใน Chrome ให้ส่งออก JSON แล้วนำเข้าใน OBS
- รูปแบบไฟล์ JSON: [docs/race-json.md](docs/race-json.md), ตัวอย่าง [docs/example-race.json](docs/example-race.json), JSON Schema [schema/race.schema.json](schema/race.schema.json)

## พัฒนา

```bash
npm ci
npm run dev          # http://localhost:5173/#/dock และ #/overlay
npm test             # Vitest (กฎซอง JRA, สี, schema, import/export)
npm run test:e2e     # Playwright เปิด dock + overlay พร้อมกัน
npm run schema       # สร้าง schema/race.schema.json ใหม่จาก src/lib/model.ts
```

Stack: Vite + React + TypeScript, [Tailwind CSS v4](https://tailwindcss.com) (สีและฟอนต์จาก design system อยู่ใน `@theme` ของ `src/styles/app.css` ไม่มี palette ตั้งต้นของ Tailwind) และ [Motion](https://motion.dev) สำหรับทรานซิชันและไฮไลต์

| โฟลเดอร์ | มีอะไร |
| --- | --- |
| `src/overlay/` | หน้าจอออกอากาศ: `LiveScene` (Active + ทรานซิชัน), `RacecardScene` (การ์ดรายชื่อม้า), `ResultScene` (ผลการแข่งขัน), `RaceBackdrop` (รูป โลโก้ ชื่อรายการ ที่สองหน้านั้นใช้ร่วมกัน), `RaceListScene` (หน้าแรก), `Highlight` (แถบไฮไลต์), `Stage` (ย่อขยาย 1920×1080) |
| `src/dock/` | Dock: `RacesTab`, `EditTab`, `ResultPanel` (กรอกผล ล็อค เลือกหน้า), `FlagPicker`, `ExportPanel` (บันทึกไฟล์ / คัดลอก JSON) |
| `src/components/` | ใช้ร่วมกันทั้งสองฝั่ง: `Logo`, `Flag`, `Button`, `Switch`, `Field`, `Section` |
| `src/lib/` | ข้อมูลและกฎ: `model` (schema), `store`, `images`, `colors` (สีซอง/เบอร์), `labels` (ป้ายเกรด, Fav), `results` (แบ่งหน้าผล + ล็อค), `nations`, `flags` |

ทุก PR รัน CI (typecheck, Vitest, Playwright) และ merge เข้า `main` แล้ว deploy ขึ้น GitHub Pages ให้เอง

ฟอนต์ Otamasing Display / Otamasing Sans (OFL) อยู่ใน `public/fonts` ธงจาก [flag-icons](https://github.com/lipis/flag-icons) (MIT)
