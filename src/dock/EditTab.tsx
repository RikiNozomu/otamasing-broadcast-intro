/**
 * Tab "การแข่งขัน": pick any race, edit its data (ข้อมูล), its own style (สไตล์), and its intro scenes
 * (สนาม, ประวัติ, แนะนำตัว, Starting Gate).
 */
import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import { exportFile, parseActive, GRADES, MAX_RUNNERS, MIN_RUNNERS, SURFACES, type Grade, type Race, type Runner, type Scheme, type Style } from "../lib/model";
import { customPair, US } from "../lib/colors";
import { ExportPanel } from "./ExportPanel";
import { cx } from "../lib/cx";
import { updateRace, useData } from "../lib/store";
import { PhotoSetEditor } from "./PhotoSetEditor";
import { Button } from "../components/Button";
import { Field, inputClass } from "../components/Field";
import { Section, hintClass } from "../components/Section";
import { Switch } from "../components/Switch";
import { FlagPicker } from "./FlagPicker";
import { CoursePanel } from "./intro/CoursePanel";
import { HistoryPanel } from "./intro/HistoryPanel";
import { RunnerPanel } from "./intro/RunnerPanel";
import { GatePanel } from "./intro/GatePanel";

type Sub = "data" | "style" | "course" | "history" | "runner" | "grid";
const INTRO_SUBS: Sub[] = ["course", "history", "runner", "grid"];

const SCHEME_LABEL: Record<Scheme, string> = { jra: "JRA 8 สีตามซอง", us: "อเมริกา (Saddle towel)", plain: "ไม่มีสี (กรอบขาว)", custom: "Custom" };
const NO_SCHEME_LABEL: Record<Scheme, string> = { ...SCHEME_LABEL, jra: "JRA ตามซองของม้า" };

export function EditTab({ editing, setEditing }: { editing: string | null; setEditing: (id: string) => void }) {
  const d = useData();
  const [sub, setSub] = useState<Sub>("data");
  /** The race whose export panel is open. */
  const [exporting, setExporting] = useState<string | null>(null);
  const race = d.races.find((r) => r.id === editing) ?? d.races[0];
  if (!race) return <div className="grid content-start gap-3 p-3" role="tabpanel" id="p-edit"><p className={hintClass}>ยังไม่มีรายการแข่งขัน เพิ่มหรือนำเข้าได้ที่แท็บภาพรวม</p></div>;
  const set = (patch: Partial<Race>) => updateRace(race.id, (r) => ({ ...r, ...patch }));
  const setStyle = (fn: (s: Style) => Style) => updateRace(race.id, (r) => ({ ...r, style: fn(r.style) }));
  const setRunner = (i: number, patch: Partial<Runner>) =>
    updateRace(race.id, (r) => ({ ...r, runners: r.runners.map((h, j) => (j === i ? { ...h, ...patch } : h)) }));
  const S = race.style;
  const n = race.runners.length;
  const showCustom = S.drawScheme === "custom" || S.numberScheme === "custom";
  const text = (k: "name" | "course" | "round" | "postTime" | "date", label: string, extra: Record<string, string> = {}) => (
    <Field id={`f-${k}`} label={label}>
      <input className={inputClass} id={`f-${k}`} value={race[k]} {...extra} onChange={(e) => set({ [k]: e.target.value } as Partial<Race>)} />
    </Field>
  );
  const select = (id: string, label: string, value: string, onChange: (v: string) => void, options: [string, string][]) => (
    <Field id={id} label={label}>
      <select id={id} className={inputClass} value={value} onChange={(e) => onChange(e.target.value)}>
        {options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
      </select>
    </Field>
  );
  const runnerGrid = "grid grid-cols-[30px_minmax(0,1fr)_46px_44px_22px] items-center gap-1 text-xs";
  const subtabs = [["data", "ข้อมูล"], ["style", "สไตล์"], ["course", "สนาม"], ["history", "ประวัติ"], ["runner", "แนะนำตัว"], ["grid", "Starting Gate"]] as const;

  return (
    <div className="grid content-start gap-3 p-3" role="tabpanel" id="p-edit" aria-labelledby="tab-edit">
      <div className="flex flex-wrap gap-1" role="tablist" aria-label="เลือกรายการที่จะแก้ไข">
        {d.races.map((x) => {
          const on = x.id === race.id;
          return (
            <button key={x.id} type="button" role="tab" data-e={x.id} aria-selected={on} onClick={() => setEditing(x.id)}
              className={cx("inline-flex items-center gap-1.5 border px-2.5 py-1 font-display text-base leading-[normal] font-bold", on ? "border-yellow bg-yellow text-navy" : "border-line bg-studio text-ink-muted")}>
              {parseActive(d.active).raceId === x.id && <span className="size-[7px] rounded-full bg-ok" title="Active" />}{x.round || x.name}
            </button>
          );
        })}
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-ink-muted">
        <span>{INTRO_SUBS.includes(sub) ? "ฉาก intro ของรายการนี้ (สนาม 3D, แนะนำตัว, Starting Gate)" : "ข้อมูลที่ทุกฉากใช้ แก้แล้วขึ้นจอทันทีถ้าฉากของรายการนี้ Active อยู่"}</span>
        <span className="flex flex-wrap gap-1.5">
          <Button aria-expanded={exporting === race.id} onClick={() => setExporting((x) => (x === race.id ? null : race.id))}>ส่งออกรายการนี้</Button>
        </span>
      </div>
      <AnimatePresence>
        {exporting === race.id && (
          <ExportPanel key="export" onClose={() => setExporting(null)}
            job={{ name: `${race.date.replaceAll("-", "")}-${(race.round || race.name).replace(/\W+/g, "")}.json`, text: JSON.stringify(exportFile(d, race.id), null, 2), count: 1 }} />
        )}
      </AnimatePresence>

      <div className="grid grid-cols-3 border border-line" role="tablist" aria-label="ส่วนที่แก้ไข">
        {subtabs.map(([k, label]) => (
          <button key={k} type="button" role="tab" id={`sub-${k}`} aria-selected={sub === k} onClick={() => setSub(k)}
            className={cx("relative p-[7px] text-[13px]", sub === k ? "bg-raised text-ink" : "bg-studio text-ink-muted")}>
            {label}
            {sub === k && <motion.span layoutId="edit-subtab" className="absolute inset-x-0 bottom-0 h-[3px] bg-yellow" transition={{ type: "spring", stiffness: 500, damping: 40 }} />}
          </button>
        ))}
      </div>

      {sub === "course" ? <CoursePanel race={race} />
      : sub === "history" ? <HistoryPanel race={race} />
      : sub === "runner" ? <RunnerPanel race={race} />
      : sub === "grid" ? <><GatePanel race={race} /><PhotoSetEditor race={race} /></>
      : sub === "data" ? (
        <div className="grid gap-3" role="tabpanel" aria-labelledby="sub-data">
          <Section title="ข้อมูลรายการ">
            {text("name", "ชื่อรายการ")}
            {text("date", "วันที่", { type: "date" })}
            {text("round", "เลขรอบ", { maxLength: "12", placeholder: "เช่น 11R, R11, Main" })}
            {text("postTime", "เวลาออกตัว", { placeholder: "15:40" })}
            {text("course", "สนาม")}
            {select("f-surface", "พื้น", race.surface, (v) => set({ surface: v as Race["surface"] }), SURFACES.map((x) => [x, x]))}
            <Field id="f-dist" label="ระยะ (เมตร)">
              <input className={inputClass} id="f-dist" type="number" min={800} max={7000} step={100} value={race.distanceM ?? ""} onChange={(e) => set({ distanceM: e.target.value ? Math.round(+e.target.value) : null })} />
            </Field>
            {select("f-grade", "เกรด", race.grade ?? "", (v) => set({ grade: (v || null) as Grade | null }), [["", "ไม่มี"], ...GRADES.map((g): [string, string] => [g, g === "L" ? "Listed" : g])])}
            <Switch on={race.jump} label="Jump race (ขึ้น J- หน้าเกรด)" onToggle={() => set({ jump: !race.jump })} />
          </Section>
          <Section title={`ม้า ${n} ตัว (รองรับ ${MIN_RUNNERS}–${MAX_RUNNERS})`}>
            <div className={cx(runnerGrid, "text-[11px] text-ink-muted")} aria-hidden="true"><span>No</span><span>ชื่อม้า / จ็อกกี้</span><span>ธง</span><span /><span>ถอน</span></div>
            <div className="grid gap-1.5" data-testid="runner-rows">
              {race.runners.map((h, i) => (
                <div className={cx(runnerGrid, "border-b border-line pb-1.5")} key={h.number}>
                  <span className="bg-navy py-[3px] text-center font-display text-[15px] font-bold">{h.number}</span>
                  <input className={inputClass} aria-label={`ชื่อม้าเบอร์ ${h.number}`} value={h.name} onChange={(e) => setRunner(i, { name: e.target.value })} />
                  <FlagPicker label={`ธงม้าเบอร์ ${h.number}`} value={h.horseCountry} onChange={(c) => setRunner(i, { horseCountry: c })} />
                  <span />
                  <input type="checkbox" className="justify-self-center" aria-label={`ถอนเบอร์ ${h.number}`} checked={h.scratched} onChange={(e) => setRunner(i, { scratched: e.target.checked })} />
                  {S.autoDraw ? <span /> : <input className={cx(inputClass, "px-0.5 text-center")} type="number" min={1} max={MAX_RUNNERS} aria-label={`ซองเบอร์ ${h.number}`} title="ซอง" placeholder="ซอง" value={h.draw ?? ""} onChange={(e) => setRunner(i, { draw: e.target.value ? Math.round(+e.target.value) : null })} />}
                  <input className={inputClass} aria-label={`จ็อกกี้เบอร์ ${h.number}`} placeholder="จ็อกกี้" value={h.jockey} onChange={(e) => setRunner(i, { jockey: e.target.value })} />
                  <FlagPicker label={`ธงจ็อกกี้เบอร์ ${h.number}`} value={h.jockeyCountry} onChange={(c) => setRunner(i, { jockeyCountry: c })} />
                  <input className={cx(inputClass, "px-0.5 text-center")} type="number" min={30} max={80} step={0.5} aria-label={`น้ำหนักจ็อกกี้เบอร์ ${h.number}`} title="น้ำหนักจ็อกกี้ (กก.)" placeholder="กก." value={h.weight ?? ""} onChange={(e) => setRunner(i, { weight: e.target.value ? Math.round(+e.target.value * 2) / 2 : null })} />
                  <span />
                  <span className="text-center text-[10px] text-ink-muted">ตัวม้า</span>
                  <div className="col-span-4 flex items-center gap-1">
                    <input className={cx(inputClass, "w-20")} type="number" min={200} max={800} aria-label={`น้ำหนักตัวม้าเบอร์ ${h.number}`} title="น้ำหนักตัวม้า (กก.)" placeholder="น้ำหนักตัว กก." value={h.horseWeight ?? ""} onChange={(e) => setRunner(i, { horseWeight: e.target.value ? Math.round(+e.target.value) : null })} />
                    <input className={cx(inputClass, "w-16")} type="number" min={-99} max={99} aria-label={`น้ำหนักตัวม้าเปลี่ยนเบอร์ ${h.number}`} title="เพิ่ม/ลดจากครั้งก่อน (กก.)" placeholder="+/-" value={h.horseWeightChange ?? ""} onChange={(e) => setRunner(i, { horseWeightChange: e.target.value ? Math.round(+e.target.value) : null })} />
                  </div>
                </div>
              ))}
            </div>
            <div className="flex flex-wrap gap-1.5">
              <Button disabled={n >= MAX_RUNNERS} onClick={() => updateRace(race.id, (r) => ({ ...r, runners: [...r.runners, { number: Math.max(...r.runners.map((x) => x.number)) + 1, draw: null, name: "", jockey: "", horseCountry: "", jockeyCountry: "", fav: null, horseWeight: null, horseWeightChange: null, weight: null, scratched: false, finish: null, outcome: null, time: "", margin: "" }] }))}>+ เพิ่มม้า</Button>
              <Button disabled={n <= MIN_RUNNERS} onClick={() => updateRace(race.id, (r) => ({ ...r, runners: r.runners.slice(0, -1) }))}>− ลบตัวท้าย</Button>
            </div>
          </Section>
        </div>
      ) : (
        <div className="grid gap-3" role="tabpanel" aria-labelledby="sub-style">
          <Section title="สีช่อง DRAW (ซอง)">
            <select aria-label="สีช่อง DRAW" className={inputClass} value={S.drawScheme} onChange={(e) => setStyle((s) => ({ ...s, drawScheme: e.target.value as Scheme }))}>
              {(Object.keys(SCHEME_LABEL) as Scheme[]).map((k) => <option key={k} value={k}>{SCHEME_LABEL[k]}</option>)}
            </select>
            <Switch on={S.autoDraw} label="คำนวณเลขซองให้อัตโนมัติตามกฎ JRA" onToggle={() => setStyle((s) => ({ ...s, autoDraw: !s.autoDraw }))} />
          </Section>
          <Section title="สีช่อง NO. (เบอร์)">
            <select aria-label="สีช่อง NO." className={inputClass} value={S.numberScheme} onChange={(e) => setStyle((s) => ({ ...s, numberScheme: e.target.value as Scheme }))}>
              {(["plain", "jra", "us", "custom"] as Scheme[]).map((k) => <option key={k} value={k}>{NO_SCHEME_LABEL[k]}</option>)}
            </select>
          </Section>
          {showCustom && (
            <Section title="ชุดสี Custom (สีพื้น / สีตัวเลข)">
              <div className="grid grid-cols-6 gap-1">
                {Array.from({ length: Math.max(n, 8) }, (_, i) => i + 1).map((k) => {
                  const [bg, fg] = customPair(S, k);
                  const setPair = (p: [string, string]) => setStyle((s) => ({ ...s, customColors: { ...s.customColors, [k]: p } }));
                  const picker = "h-4 w-full cursor-pointer border-0 bg-transparent p-0";
                  return (
                    <div className="grid justify-items-center gap-0.5 text-[10px] text-ink-muted" key={k}>
                      <span className="grid h-[26px] w-full place-items-center font-display text-base font-bold" style={{ background: bg, color: fg }}>{k}</span>
                      <input type="color" className={picker} aria-label={`สีพื้นเบอร์ ${k}`} value={bg} onChange={(e) => setPair([e.target.value.toUpperCase(), fg])} />
                      <input type="color" className={picker} aria-label={`สีตัวเลขเบอร์ ${k}`} value={fg} onChange={(e) => setPair([bg, e.target.value.toUpperCase()])} />
                    </div>
                  );
                })}
              </div>
              <div className="flex flex-wrap gap-1.5">
                <Button onClick={() => setStyle((s) => ({ ...s, customColors: Object.fromEntries(Object.entries(US).map(([k, v]) => [k, [...v] as [string, string]])) }))}>เริ่มจากสีอเมริกา</Button>
              </div>
            </Section>
          )}
          <Section title="ป้ายเกรด">
            <select aria-label="รูปแบบป้ายเกรด" className={inputClass} value={S.gradeStyle} onChange={(e) => setStyle((s) => ({ ...s, gradeStyle: e.target.value as Style["gradeStyle"] }))}>
              <option value="jra">แบบญี่ปุ่น (GI / GII / GIII / LR)</option>
              <option value="intl">สากล (G1 / G2 / G3 / L)</option>
            </select>
          </Section>
          <Section title="แสดงบนจอ">
            {([["grade", "ป้ายเกรด"], ["horseFlag", "ธงชาติม้า"], ["jockeyFlag", "ธงชาติจ็อกกี้"]] as const).map(([k, label]) => (
              <Switch key={k} on={S.show[k]} label={label} testId={`show-${k}`} onToggle={() => setStyle((s) => ({ ...s, show: { ...s.show, [k]: !s.show[k] } }))} />
            ))}
          </Section>
        </div>
      )}
    </div>
  );
}
