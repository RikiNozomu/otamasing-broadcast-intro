/** The การแข่งขัน tab's "สนาม" part: the course scene's venue, what shows on the 3D course, the boxes, records, weather. */
import { useState } from "react";
import { introOf, type Race } from "../../lib/model";
import { FOCUS, GOINGS, WEATHERS, type Focus, type RaceRecord, type Weather } from "../../lib/introSchema";
import { courseFacts, courseOf, VENUES } from "../../lib/venues";
import { fetchForecast } from "../../lib/intro";
import { update, useData } from "../../lib/store";
import { Button } from "../../components/Button";
import { Field, inputClass } from "../../components/Field";
import { Section, hintClass } from "../../components/Section";
import { Switch } from "../../components/Switch";
import { setIntro } from "./shared";

const FOCUS_LABEL: Record<Focus, string> = {
  none: "ไม่ไฮไลต์", straights: "ทางตรงทั้งหมด", corners: "ทางโค้งทั้งหมด", home: "ทางตรงหน้าอัฒจันทร์ (Home)", back: "ทางตรงฝั่งตรงข้าม (Back)",
  c1: "โค้ง 1", c2: "โค้ง 2", c3: "โค้ง 3", c4: "โค้ง 4",
};

function RecordEditor({ race, which, title }: { race: Race; which: "course" | "race"; title: string }) {
  const r = race.intro.records[which];
  const set = (p: Partial<RaceRecord>) => setIntro(race.id, (x) => ({ ...x, records: { ...x.records, [which]: { ...x.records[which], ...p } } }));
  const id = `rec-${which}`;
  return (
    <div className="grid gap-1.5" data-testid={id}>
      <span className="text-[13px] font-medium">{title}</span>
      <div className="grid grid-cols-[90px_minmax(0,1fr)] gap-1.5">
        <input className={inputClass} aria-label={`${title} เวลา`} placeholder="2:09.7" value={r.time} onChange={(e) => set({ time: e.target.value })} />
        <input className={inputClass} aria-label={`${title} ม้า`} placeholder="ชื่อม้า" value={r.horse} onChange={(e) => set({ horse: e.target.value })} />
        <input className={inputClass} type="date" aria-label={`${title} วันที่`} value={r.date} onChange={(e) => set({ date: e.target.value })} />
        <input className={inputClass} aria-label={`${title} จ็อกกี้`} placeholder="จ็อกกี้" value={r.jockey} onChange={(e) => set({ jockey: e.target.value })} />
      </div>
    </div>
  );
}

export function CoursePanel({ race }: { race: Race }) {
  const d = useData();
  const c = race.intro.course, w = race.intro.weather;
  const found = courseOf(race);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ text: string; bad?: boolean } | null>(null);
  const setCourse = (p: Partial<typeof c>) => setIntro(race.id, (x) => ({ ...x, course: { ...x.course, ...p } }));
  const setPanels = (k: keyof typeof c.panels) => setIntro(race.id, (x) => ({ ...x, course: { ...x.course, panels: { ...x.course.panels, [k]: !x.course.panels[k] } } }));
  const setWeather = (p: Partial<typeof w>) => setIntro(race.id, (x) => ({ ...x, weather: { ...x.weather, ...p, source: p.source ?? "manual" } }));
  const active = d.active === introOf("course", race.id);
  const facts = found ? courseFacts(found.track, race.distanceM) : null;
  const goings = found?.track.surface === "Dirt" ? GOINGS.Dirt : GOINGS.Turf;

  const forecast = async () => {
    if (!found) return;
    setBusy(true); setMsg(null);
    try {
      const f = await fetchForecast(found.venue.lat, found.venue.lon, race.date, race.postTime);
      setIntro(race.id, (x) => ({ ...x, weather: { ...f, source: "forecast" } }));
      setMsg({ text: `ได้พยากรณ์แล้ว: ${WEATHERS[f.condition]} ${f.tempC}°C ลม ${f.windMs} m/s (แก้ต่อได้)` });
    } catch (e) {
      setMsg({ text: `ดึงพยากรณ์ไม่ได้: ${(e as Error).message || "เชื่อมต่อไม่ได้"} (พยากรณ์มีถึงประมาณ 15 วันข้างหน้า)`, bad: true });
    } finally { setBusy(false); }
  };

  return (
    <div className="grid gap-3" role="tabpanel" aria-labelledby="sub-course">
      <div className="flex flex-wrap items-center gap-1.5">
        <Button variant={active ? "default" : "primary"} disabled={active} onClick={() => update((x) => ({ ...x, active: introOf("course", race.id) }))}>{active ? "ฉากสนามขึ้นจออยู่" : "ตั้งฉากสนามเป็น Active"}</Button>
        <Button onClick={() => setCourse({ since: Date.now() })}>เล่นใหม่ (เริ่มจากโลก)</Button>
      </div>
      <Section title="สนามและลู่">
        <Field id="c-venue" label="สนาม">
          <select id="c-venue" className={inputClass} value={c.venue ?? ""} onChange={(e) => setCourse({ venue: e.target.value || null, track: null })}>
            <option value="">อัตโนมัติจากชื่อสนาม ({race.course || "ว่าง"})</option>
            {VENUES.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
          </select>
        </Field>
        {found && (
          <Field id="c-track" label="ลู่">
            <select id="c-track" className={inputClass} value={c.track ?? ""} onChange={(e) => setCourse({ track: e.target.value || null })}>
              <option value="">อัตโนมัติจากพื้น ({race.surface})</option>
              {found.venue.tracks.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
            </select>
          </Field>
        )}
        {found ? (
          <span className={hintClass} data-testid="course-found">{found.venue.name} · {found.track.label} · รอบละ {found.track.length} ม. · ระยะ {race.distanceM ?? "–"} ม. ผ่าน {facts?.corners} โค้ง</span>
        ) : (
          <span className="text-xs text-danger-ink" data-testid="course-missing">ยังไม่มีข้อมูลสนาม "{race.course}" ตอนนี้มี: {VENUES.map((v) => v.name).join(", ")}</span>
        )}
        <Switch on={c.globe} label="เริ่มจากโลก 3D หมุนเข้ามาแล้วซูมลงสนาม" testId="course-globe" onToggle={() => setCourse({ globe: !c.globe })} />
      </Section>
      <Section title="บนสนาม 3D (เปลี่ยนได้ระหว่างกล้องหมุน)">
        <Switch on={c.path} label="ไฮไลต์ลู่ตามระยะการแข่งขัน (สีเหลือง)" testId="course-path" onToggle={() => setCourse({ path: !c.path })} />
        <Switch on={c.elevation} label="แสดงความชันเป็น 3D" testId="course-elevation" onToggle={() => setCourse({ elevation: !c.elevation })} />
        {c.elevation && (
          <Field id="c-elev" label={`ขยายความสูง ×${c.elevationScale}`}>
            <div className="grid gap-0.5">
              <input id="c-elev" type="range" min={1} max={30} step={1} value={c.elevationScale} onChange={(e) => setCourse({ elevationScale: +e.target.value })} />
              <span className={hintClass}>×1 = สูงจริง (มองแทบไม่เห็น) ค่าเริ่มต้น ×5</span>
            </div>
          </Field>
        )}
        <Switch on={c.startFinish} label="จุดปล่อยตัว (START) และเส้นชัย (FINISH)" testId="course-startfinish" onToggle={() => setCourse({ startFinish: !c.startFinish })} />
        <Switch on={c.chevrons} label="ลูกศร chevron วิ่งตามทิศทางการแข่ง" testId="course-chevrons" onToggle={() => setCourse({ chevrons: !c.chevrons })} />
        <Field id="c-focus" label="ไฮไลต์ทางตรง/โค้ง">
          <select id="c-focus" className={inputClass} value={c.focus} onChange={(e) => setCourse({ focus: e.target.value as Focus })}>
            {FOCUS.map((f) => <option key={f} value={f}>{FOCUS_LABEL[f]}</option>)}
          </select>
        </Field>
      </Section>
      <Section title="กล่องข้อมูลด้านล่าง">
        <Switch on={c.panels.venue} label="ชื่อสนาม ที่ตั้ง ประเทศ + ธง" testId="show-panel-venue" onToggle={() => setPanels("venue")} />
        <Switch on={c.panels.distance} label="ระยะทาง โค้ง ความชัน Back/Home stretch" testId="show-panel-distance" onToggle={() => setPanels("distance")} />
        <Switch on={c.panels.records} label="สถิติสนามและสถิติรายการ" testId="show-panel-records" onToggle={() => setPanels("records")} />
        <Switch on={c.panels.weather} label="สภาพอากาศและสภาพสนาม" testId="show-panel-weather" onToggle={() => setPanels("weather")} />
        <span className={hintClass}>กล่องสถิติจะขึ้นเมื่อกรอกเวลาไว้ กล่องอากาศขึ้นเมื่อเลือกสภาพอากาศหรือสภาพสนาม</span>
      </Section>
      <Section title="สถิติ">
        <RecordEditor race={race} which="course" title="สถิติสนาม (Course record)" />
        <RecordEditor race={race} which="race" title="สถิติรายการ (Race record)" />
      </Section>
      <Section title="สภาพอากาศและสนาม">
        <div className="flex flex-wrap items-center gap-1.5">
          <Button variant="primary" disabled={!found || busy} onClick={forecast} data-testid="forecast">{busy ? "กำลังดึง…" : "ดึงพยากรณ์ ณ เวลาออกตัว"}</Button>
          {w.source === "forecast" && <span className="text-xs text-ok">จากพยากรณ์ Open-Meteo</span>}
        </div>
        {msg && <span role={msg.bad ? "alert" : "status"} className={msg.bad ? "text-xs text-danger-ink" : "text-xs text-ok"}>{msg.text}</span>}
        <Field id="w-cond" label="สภาพอากาศ">
          <select id="w-cond" className={inputClass} value={w.condition ?? ""} onChange={(e) => setWeather({ condition: (e.target.value || null) as Weather | null })}>
            <option value="">ไม่แสดง</option>
            {(Object.keys(WEATHERS) as Weather[]).map((k) => <option key={k} value={k}>{WEATHERS[k]}</option>)}
          </select>
        </Field>
        <Field id="w-temp" label="อุณหภูมิ (°C)">
          <input id="w-temp" className={inputClass} type="number" min={-50} max={60} value={w.tempC ?? ""} onChange={(e) => setWeather({ tempC: e.target.value === "" ? null : Math.round(+e.target.value) })} />
        </Field>
        <Field id="w-wind" label="ลม (m/s)">
          <input id="w-wind" className={inputClass} type="number" min={0} max={100} step={0.1} value={w.windMs ?? ""} onChange={(e) => setWeather({ windMs: e.target.value === "" ? null : Math.round(+e.target.value * 10) / 10 })} />
        </Field>
        <Field id="w-going" label="สภาพสนาม">
          <select id="w-going" className={inputClass} value={race.intro.going} onChange={(e) => setIntro(race.id, (x) => ({ ...x, going: e.target.value }))}>
            <option value="">ไม่แสดง</option>
            {goings.map((g) => <option key={g} value={g}>{g}</option>)}
            {race.intro.going && !(goings as readonly string[]).includes(race.intro.going) && <option value={race.intro.going}>{race.intro.going}</option>}
          </select>
        </Field>
        <span className={hintClass}>เวลาออกตัวในไฟล์ถือเป็นเวลาไทย (JRA = เวลาญี่ปุ่น − 2 ชม.) · พยากรณ์จาก Open-Meteo ได้ประมาณ 15 วันล่วงหน้า</span>
      </Section>
    </div>
  );
}
