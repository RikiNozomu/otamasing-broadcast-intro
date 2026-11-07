/**
 * The การแข่งขัน tab's "แนะนำตัว" part: step through the runners in gate order, and see what each one will show
 * (pedigree from the horse tab, the jockey's photo from the jockey tab).
 */
import { introOf, type Race } from "../../lib/model";
import { horseFor, introRunners, jockeyFor, pedigreeLines, setRunnerAuto, showRunner, stallOf, useIntroRunner } from "../../lib/intro";
import { update, updateRace, useData } from "../../lib/store";
import { cx } from "../../lib/cx";
import { Button } from "../../components/Button";
import { Field, inputClass } from "../../components/Field";
import { Section, hintClass } from "../../components/Section";
import { RunnerStepper } from "./QuickIntro";

export function RunnerPanel({ race }: { race: Race }) {
  const d = useData();
  const runners = introRunners(race);
  const { index } = useIntroRunner(race);
  const active = d.active === introOf("runner", race.id);
  const go = (i: number) => updateRace(race.id, (r) => ({ ...r, intro: { ...r.intro, runner: showRunner(r, i) } }));
  return (
    <div className="grid gap-3" role="tabpanel" aria-labelledby="sub-runner">
      <Button variant={active ? "default" : "primary"} className="justify-self-start" disabled={active} onClick={() => update((x) => ({ ...x, active: introOf("runner", race.id) }))}>
        {active ? "ฉากแนะนำตัวขึ้นจออยู่" : "ตั้งฉากแนะนำตัวเป็น Active"}
      </Button>
      <Section title="ตัวที่แสดง">
        <RunnerStepper race={race} />
        <Field id="r-sec" label="ทุกกี่วินาที">
          <input id="r-sec" className={cx(inputClass, "w-20")} type="number" min={2} max={600} value={race.intro.runner.seconds}
            onChange={(e) => updateRace(race.id, (r) => ({ ...r, intro: { ...r.intro, runner: setRunnerAuto(r, { seconds: Math.max(2, Math.round(+e.target.value || 8)) }) } }))} />
        </Field>
      </Section>
      <Section title={`ม้า ${runners.length} ตัว ตามลำดับซอง (ไม่รวมม้าถอน)`}>
        <div className="grid gap-1" data-testid="runner-list">
          {runners.map((h, i) => {
            const horse = horseFor(d, h.name), j = jockeyFor(d, h.jockey);
            const ped = pedigreeLines(horse);
            const photo = !!(j?.photo && d.images[j.photo]);
            return (
              <button key={h.number} type="button" aria-pressed={i === index} onClick={() => go(i)} data-no={h.number}
                className={cx("grid grid-cols-[34px_minmax(0,1fr)] items-center gap-2 border px-2 py-1 text-left", i === index ? "border-yellow bg-raised" : "border-line bg-studio")}>
                <span className="bg-navy py-0.5 text-center font-display text-[15px] font-bold" title="ซอง">{stallOf(race, h)}</span>
                <span className="min-w-0">
                  <b className="block truncate text-[13px]">{h.number}. {h.name}</b>
                  <small className="block truncate text-[11px] text-ink-muted">
                    {h.jockey || "ไม่มีจ็อกกี้"}{photo ? " · มีรูป" : " · ไม่มีรูปจ็อกกี้"} · {ped.cross ? `${ped.cross}${ped.bms ? ` (${ped.bms})` : ""}` : "ไม่มีพ่อแม่ (เพิ่มในแท็บม้า)"}
                  </small>
                </span>
              </button>
            );
          })}
        </div>
        <span className={hintClass}>พ่อ × แม่ (by พ่อของแม่) และสีเสื้อมาจากแท็บม้าที่ชื่อตรงกัน · รูปจ็อกกี้มาจากแท็บจ็อกกี้ที่ชื่อตรงกัน · น้ำหนักม้าและน้ำหนักจ็อกกี้มาจากตารางม้าในส่วนข้อมูล</span>
      </Section>
    </div>
  );
}
