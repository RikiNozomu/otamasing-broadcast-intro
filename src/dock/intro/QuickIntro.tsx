/** Quick controls under the Active race in the overview, for its intro scene on screen. */
import type { IntroView, Race } from "../../lib/model";
import { gridPage, introRunners, setRunnerAuto, showRunner, useIntroRunner } from "../../lib/intro";
import { PageButtons } from "../../components/PageButtons";
import { Button } from "../../components/Button";
import { Switch } from "../../components/Switch";
import { INTRO_LABEL, setIntro } from "./shared";
import { updateRace } from "../../lib/store";

export { INTRO_LABEL };

/** Previous / next runner, and where we are; shared by the overview and the runner panel. */
export function RunnerStepper({ race }: { race: Race }) {
  const { runners, index } = useIntroRunner(race);
  const h = runners[index];
  const go = (i: number) => updateRace(race.id, (r) => ({ ...r, intro: { ...r.intro, runner: showRunner(r, i) } }));
  return (
    <div className="grid gap-1.5" data-testid="runner-stepper">
      <div className="flex items-center gap-1.5">
        <Button aria-label="ม้าตัวก่อนหน้า" disabled={!runners.length} onClick={() => go(index - 1)}>◀</Button>
        <span className="min-w-0 flex-1 truncate text-center text-[13px]" data-testid="runner-now">
          {h ? <><b className="font-display text-base">{index + 1}/{runners.length}</b> · เบอร์ {h.number} {h.name}</> : "ไม่มีม้า"}
        </span>
        <Button aria-label="ม้าตัวถัดไป" disabled={!runners.length} onClick={() => go(index + 1)}>▶</Button>
      </div>
      <Switch on={race.intro.runner.auto} label={`เปลี่ยนตัวอัตโนมัติทุก ${race.intro.runner.seconds} วินาที`} testId="runner-auto"
        onToggle={() => updateRace(race.id, (r) => ({ ...r, intro: { ...r.intro, runner: setRunnerAuto(r, { auto: !r.intro.runner.auto }) } }))} />
    </div>
  );
}

export function GatePages({ race, testId }: { race: Race; testId?: string }) {
  const g = gridPage(race);
  return <PageButtons label="หน้า" count={g.pageCount} page={g.page} testId={testId} onPick={(i) => setIntro(race.id, (x) => ({ ...x, grid: { ...x.grid, page: i } }))} />;
}

export function QuickIntro({ race, view }: { race: Race; view: IntroView }) {
  const c = race.intro.course, h = race.intro.history;
  return (
    <div className="mt-1 ml-[26px] grid gap-1.5 border-l-2 border-yellow pl-2.5" data-testid={`quick-${view}`} aria-label={`ควบคุม${INTRO_LABEL[view]}`}>
      {view === "course" && (
        <div className="flex flex-wrap gap-1.5">
          <Button onClick={() => setIntro(race.id, (x) => ({ ...x, course: { ...x.course, since: Date.now() } }))}>เล่นใหม่ (เริ่มจากโลก)</Button>
          <Button variant={h.open ? "primary" : "default"} aria-pressed={h.open} onClick={() => setIntro(race.id, (x) => ({ ...x, history: { ...x.history, open: !x.history.open, play: x.history.open ? null : x.history.play } }))}>
            {h.open ? "ปิดประวัติ" : "เปิดประวัติ"}
          </Button>
          <Button variant={c.elevation ? "primary" : "default"} aria-pressed={c.elevation} onClick={() => setIntro(race.id, (x) => ({ ...x, course: { ...x.course, elevation: !x.course.elevation } }))}>ความชัน 3D</Button>
        </div>
      )}
      {view === "runner" && (introRunners(race).length ? <RunnerStepper race={race} /> : <span className="text-xs text-ink-muted">ไม่มีม้า</span>)}
      {view === "grid" && <GatePages race={race} testId="quick-gate-pages" />}
    </div>
  );
}
