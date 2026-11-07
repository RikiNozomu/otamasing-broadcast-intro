/** Section "หน้ารายชื่อม้า" in the edit tab: pick the racecard page on screen, and turn the auto page turning on or off. */
import { CARD_ROWS, setCardAuto, showCardPage, useCardPage } from "../lib/cardPages";
import type { Race } from "../lib/model";
import { updateRace } from "../lib/store";
import { cx } from "../lib/cx";
import { PageButtons } from "../components/PageButtons";
import { inputClass } from "../components/Field";
import { Section, hintClass } from "../components/Section";
import { Switch } from "../components/Switch";

/** Page buttons for the racecard; the page on screen follows auto page turning. */
export function CardPageButtons({ race, label = "หน้ารายชื่อ", className, testId }: { race: Race; label?: string; className?: string; testId?: string }) {
  const p = useCardPage(race);
  return (
    <PageButtons label={label} count={p.pageCount} page={p.page} className={className} testId={testId}
      onPick={(i) => updateRace(race.id, (r) => ({ ...r, card: showCardPage(r, i) }))} />
  );
}

export function CardPagesSection({ race }: { race: Race }) {
  const p = useCardPage(race);
  const set = (patch: Parameters<typeof setCardAuto>[1]) => updateRace(race.id, (r) => ({ ...r, card: setCardAuto(r, patch) }));
  return (
    <Section title="หน้ารายชื่อม้าบนจอ">
      {p.pageCount > 1 ? (
        <>
          <CardPageButtons race={race} label="หน้า" testId="card-pages" />
          <Switch on={race.card.auto} label="วนหน้าอัตโนมัติ" testId="card-auto" onToggle={() => set({ auto: !race.card.auto })} />
          <label className="flex items-center justify-between gap-3 text-[13px]" htmlFor="card-sec">
            <span className="whitespace-nowrap">เปลี่ยนหน้าทุกกี่วินาที</span>
            <input id="card-sec" className={cx(inputClass, "w-20 text-center")} type="number" min={1} max={600} step={1} value={race.card.seconds}
              onChange={(e) => { const v = Math.round(+e.target.value); if (v >= 1 && v <= 600) set({ seconds: v }); }} />
          </label>
          <span className={hintClass}>
            หน้าละ {CARD_ROWS} ตัว เรียงตามเบอร์ · {race.card.auto ? `วนหน้าทุก ${race.card.seconds} วินาที กดเลขหน้าเพื่อข้ามไปแล้ววนต่อจากตรงนั้น` : "กดเลขหน้าเพื่อเปลี่ยนหน้า"} · ไฮไลต์ม้าแล้วจะเปิดหน้าที่มีม้าตัวนั้น
          </span>
        </>
      ) : (
        <span className={hintClass}>ม้าไม่เกิน {CARD_ROWS} ตัว แสดงหน้าเดียว</span>
      )}
    </Section>
  );
}
