/** The การแข่งขัน tab's "Starting Gate" part: rows a page, the backdrop, which columns show, the page on screen. */
import { introOf, type Race } from "../../lib/model";
import { courseOf } from "../../lib/venues";
import { update, useData } from "../../lib/store";
import { Button } from "../../components/Button";
import { Field, inputClass } from "../../components/Field";
import { Section, hintClass } from "../../components/Section";
import { Switch } from "../../components/Switch";
import { GatePages } from "./QuickIntro";
import { setIntro } from "./shared";

const COLS = [["draw", "ซอง (DRAW)"], ["number", "เบอร์ (NO.)"], ["silks", "สีเสื้อ"], ["horseWeight", "น้ำหนักม้า"], ["jockey", "ชื่อจ็อกกี้"], ["weight", "น้ำหนักจ็อกกี้"]] as const;

export function GatePanel({ race }: { race: Race }) {
  const d = useData();
  const g = race.intro.grid;
  const active = d.active === introOf("grid", race.id);
  const setG = (p: Partial<typeof g>) => setIntro(race.id, (x) => ({ ...x, grid: { ...x.grid, ...p } }));
  return (
    <div className="grid gap-3" role="tabpanel" aria-labelledby="sub-grid">
      <Button variant={active ? "default" : "primary"} className="justify-self-start" disabled={active} onClick={() => update((x) => ({ ...x, active: introOf("grid", race.id) }))}>
        {active ? "Starting Gate ขึ้นจออยู่" : "ตั้ง Starting Gate เป็น Active"}
      </Button>
      <Section title="Starting Gate (เรียงจากบนลงล่างตามซอง)">
        <Field id="g-per" label="แถวต่อหน้า">
          <input id="g-per" className={inputClass} type="number" min={4} max={18} value={g.perPage} onChange={(e) => setG({ perPage: Math.min(18, Math.max(4, Math.round(+e.target.value || 18))), page: 0 })} />
        </Field>
        <GatePages race={race} testId="gate-pages" />
        <Switch on={g.backdrop === "course"} label="ฉากหลังเป็นสนาม 3D หมุนวน" testId="gate-backdrop-course" onToggle={() => setG({ backdrop: g.backdrop === "course" ? "photo" : "course" })} />
        <span className={hintClass}>
          {g.backdrop === "course" && !courseOf(race)
            ? `ยังไม่มีข้อมูลสนาม "${race.course}" เลยใช้รูปฉากหลังแทน (เลือกสนามได้ที่ส่วนสนาม)`
            : g.backdrop === "course" ? "ลู่สีเหลือง ความชัน และลูกศรตามที่ตั้งในส่วนสนาม · ปิดแล้วใช้รูปฉากหลังของรายการแทน" : "ใช้รูปฉากหลังของรายการ (ถ้าไม่มีรูปเป็นพื้นสีน้ำเงิน)"}
        </span>
      </Section>
      <Section title="ช่องที่แสดง">
        {COLS.map(([k, label]) => (
          <Switch key={k} on={g.show[k]} label={label} testId={`gate-show-${k}`} onToggle={() => setG({ show: { ...g.show, [k]: !g.show[k] } })} />
        ))}
        <span className={hintClass}>สีช่องซอง/เบอร์และธงตามแท็บสไตล์ของรายการนี้ · ม้าถอนไม่ขึ้น</span>
      </Section>
    </div>
  );
}
