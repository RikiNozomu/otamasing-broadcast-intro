# โอตะม้าซิ่ง Broadcast Intro

ชุดฉาก Intro ก่อนการแข่งขันแบบ F1 "Intro Package & Starting Grid" สำหรับถ่ายทอดสดใน OBS ต่อยอดจาก [otamasing-broadcast-compact](https://github.com/RikiNozomu/otamasing-broadcast-compact) (หน้าตาและรูปแบบไฟล์ JSON เดียวกัน) เว็บนี้มีแค่ฉาก Intro 3 ฉากกับหน้าเปล่า หน้าแรก การ์ดรายชื่อม้า หน้าผล และหน้าข้อมูลม้าใช้ใน compact ไฟล์ JSON ย้ายไปมาระหว่างสองเว็บได้ทั้งสองทาง (ช่องของ compact เก็บไว้ครบ):

1. **ฉากสนาม (THE COURSE)**: โลก 3D แบบเส้นขาวหมุนเข้ามา ซูมลงสนาม แล้วกล้องเอียงเข้าวงโคจรรอบสนาม 3D ช้าๆ ไฮไลต์ลู่ตามระยะการแข่งขันสีเหลือง, ความชันเป็น 3D, ทางตรง/โค้ง, จุดปล่อยตัวและเส้นชัย, ลูกศร chevron วิ่งตามทิศทางการแข่ง (เปิดปิดได้ระหว่างกล้องหมุน) กล่องข้อมูลด้านล่าง (สนาม, ระยะและโค้ง, สถิติ, อากาศและสภาพสนาม) และ **modal ประวัติ** ที่เลือกเหตุการณ์แล้วเล่นวิดีโอไฮไลต์ เสียงค่อยๆ ดังขึ้น จบแล้วค่อยๆ เบาลงและยุบกลับเข้าการ์ด
2. **ฉากแนะนำม้า (THE FIELD)**: ทีละตัวตามซอง ชื่อจ็อกกี้ + น้ำหนัก, เบอร์ + สีเสื้อ + ชื่อม้า, SIRE × DAM (by BMS), น้ำหนักม้า, รูปจ็อกกี้ด้านขวา และซองปล่อยตัวที่เลื่อนไปซองของม้าตัวนั้น
3. **ฉาก STARTING GATE**: ม้าทุกตัวเรียงจากบนลงล่างตามซอง แถวตรงกันทุกแถว (ซอง, เบอร์, สีเสื้อ, ชื่อม้า, น้ำหนักม้า, จ็อกกี้, น้ำหนักจ็อกกี้ เปิดปิดได้ทีละช่อง)

เปลี่ยนฉากด้วยทรานซิชัน **Stripes**: ฉากเก่าเล่นท่าออกก่อน แล้วแถบเฉียงกวาดผ่านเปิดฉากใหม่

| หน้า | URL | ใช้ใน OBS เป็น |
| --- | --- | --- |
| Dock | `https://rikinozomu.github.io/otamasing-broadcast-intro/#/dock` | Docks → Custom Browser Docks |
| หน้าจอออกอากาศ | `https://rikinozomu.github.io/otamasing-broadcast-intro/#/overlay` | Sources → Browser ขนาด 1920×1080 (ตัวเดียว) ติ๊ก **Control audio via OBS** ให้เสียงวิดีโอเข้ามิกเซอร์ |

## ใช้งาน

- หน้าจอออกอากาศแสดงสิ่งที่ **Active** อยู่ใน dock แท็บ **ภาพรวม**: หน้าเปล่า หรือฉาก Intro ของรายการ แต่ละรายการมีปุ่ม "สนาม" "แนะนำ" "Gate" (กดที่แถว = ฉากสนาม) และใต้รายการที่ Active มีปุ่มลัด (เล่นใหม่, เปิด/ปิดประวัติ, ความชัน 3D, ม้าตัวก่อน/ถัดไป, หน้าของ Gate)
- แท็บ **การแข่งขัน** มีส่วน **สนาม** (สนามและลู่, สิ่งที่แสดงบนสนาม 3D, กล่องข้อมูล, สถิติ, อากาศ: กรอกเองหรือกด "ดึงพยากรณ์ ณ เวลาออกตัว"), **ประวัติ** (เพิ่มเหตุการณ์ เลือกวิดีโอ เลือก/เล่น/หยุดบนจอ), **แนะนำตัว** และ **Starting Gate**
- แท็บ **ม้า**: ชื่อ พ่อ แม่ BMS และสีเสื้อของม้า (ฉากแนะนำม้าใช้ชื่อม้าจับคู่) แท็บ **จ็อกกี้**: รูปจ็อกกี้ (PNG ตัดพื้นหลัง) ปุ่ม "เพิ่มทั้งหมด" ดึงชื่อจ็อกกี้จากตารางม้าให้
- เวลาออกตัวในไฟล์เป็น **เวลาไทย** (JRA = เวลาญี่ปุ่น − 2 ชม.)
- ข้อมูลเก็บใน localStorage (key `otamasing-broadcast-intro/v1`) รูปและวิดีโอเก็บใน IndexedDB ของเบราว์เซอร์ ย้ายเครื่องด้วย .zip จากปุ่ม "บันทึก .zip พร้อมรูป" (ติ๊กใส่วิดีโอได้)
- รูปแบบไฟล์ JSON: [docs/race-json.md](docs/race-json.md), ตัวอย่าง [docs/example-race.json](docs/example-race.json), Mile Championship 2026 [docs/mile-cs-2026.json](docs/mile-cs-2026.json), JSON Schema [schema/race.schema.json](schema/race.schema.json)
- 3D ต้องเปิด hardware acceleration ใน OBS (Settings → Advanced → Sources → Enable Browser Source Hardware Acceleration)

## พัฒนา

```bash
npm ci
npm run dev          # http://localhost:5173/#/dock และ #/overlay
npm test             # Vitest (กฎซอง, สนาม, intro, schema, import/export)
npm run test:e2e     # Playwright เปิด dock + overlay พร้อมกัน
npm run schema       # สร้าง schema/race.schema.json ใหม่
python3 scripts/venues/build_venue.py kyoto --plot   # สร้างข้อมูลสนามจาก OpenStreetMap (pip install shapely matplotlib)
python3 scripts/globe/build_globe.py                 # สร้างเส้นโลก public/globe/world.json จาก Natural Earth
```

Stack: Vite + React + TypeScript, [Tailwind CSS v4](https://tailwindcss.com), [Motion](https://motion.dev) และ [three.js](https://threejs.org) (โลกและสนาม 3D)

| โฟลเดอร์ | มีอะไร |
| --- | --- |
| `src/overlay/intro/` | ฉาก Intro: `CourseScene` + `course3d` (three.js), `HistoryModal`, `RunnerScene`, `GridScene`, `IntroHeader`, `WeatherIcon` |
| `src/overlay/` | `LiveScene` (Active + ทรานซิชัน รวม Stripes), `RaceBackdrop` (รูปฉากหลังของ STARTING GATE) |
| `src/dock/` | Dock: `RacesTab`, `EditTab`, `HorsesTab`, `JockeysTab`, `intro/` (แผงสนาม ประวัติ แนะนำตัว Starting Gate และปุ่มลัด) |
| `src/lib/` | `model` (schema), `introSchema`, `intro` (ลำดับซอง, พยากรณ์อากาศ), `venues` (ระยะ โค้ง ความชันของสนาม), `store`, `images` |
| `src/venues/` | ข้อมูลสนาม (สร้างจาก `scripts/venues/build_venue.py`) |

ทุก PR รัน CI (typecheck, Vitest, Playwright) และ merge เข้า `main` แล้ว deploy ขึ้น GitHub Pages ให้เอง

## ที่มาของข้อมูล

- รูปสนาม: © [OpenStreetMap](https://www.openstreetmap.org/copyright) contributors (ODbL) ตัวเลขสนาม (ความยาวรอบ ทางตรง ความชัน) และสถิติ: JRA
- เส้นโลก: [Natural Earth](https://www.naturalearthdata.com) (public domain)
- ฟอนต์ Otamasing Display / Otamasing Sans (OFL) อยู่ใน `public/fonts` ธงจาก [flag-icons](https://github.com/lipis/flag-icons) (MIT)
