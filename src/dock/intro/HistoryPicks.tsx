/** The overview's history controls while the modal is on screen: pick a card out, play or stop its video. */
import type { Race } from "../../lib/model";
import { playingItem } from "../../lib/intro";
import { readVideoStatus, videoStatusText } from "../../lib/videoStatus";
import { cx } from "../../lib/cx";
import { Button } from "../../components/Button";
import { pickHistory, playHistory, stopHistory, useTick } from "./shared";

export function HistoryPicks({ race }: { race: Race }) {
  const h = race.intro.history;
  const playing = playingItem(race);
  useTick(!!h.play);
  const screen = playing ? videoStatusText(readVideoStatus(), h.play) : null;
  if (!h.items.length) return <span className="text-xs text-ink-muted" data-testid="quick-history">ยังไม่มีเหตุการณ์ (เพิ่มได้ที่แท็บการแข่งขัน › ประวัติ)</span>;
  return (
    <div className="grid gap-1" data-testid="quick-history" role="group" aria-label="การ์ดประวัติ">
      {h.items.map((x) => {
        const sel = h.selected === x.id, isPlaying = playing?.id === x.id;
        return (
          <div key={x.id} className="flex items-stretch gap-1" data-testid="quick-history-row">
            <Button className="min-w-0 flex-1 justify-start gap-2" variant={sel ? "primary" : "default"} aria-pressed={sel} aria-label={`จิ้มการ์ด ${x.title}`} onClick={() => pickHistory(race.id, x.id)}>
              <b className="font-display">{x.year ?? "–"}</b>
              <span className="min-w-0 truncate">{x.title || "(ไม่มีหัวข้อ)"}</span>
            </Button>
            {x.video && (isPlaying
              ? <Button variant="danger" aria-label={`หยุดวิดีโอ ${x.title}`} onClick={() => stopHistory(race.id)}>■ หยุด</Button>
              : <Button aria-label={`เล่นวิดีโอ ${x.title}`} onClick={() => playHistory(race.id, x.id)}>▶ เล่น</Button>)}
          </div>
        );
      })}
      {screen && <span className={cx("text-xs", screen.bad ? "text-danger-ink" : "text-ink-muted")} data-testid="quick-history-screen">{screen.text}</span>}
    </div>
  );
}
