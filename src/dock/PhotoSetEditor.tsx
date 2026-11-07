/**
 * The left-hand pictures of one scene of a race (racecard or result): add several, remove, pick the one
 * on screen (or step with ◀ ▶), and the automatic slideshow (on/off, every x seconds).
 */
import { type PhotoSet, type PhotoView, type Race } from "../lib/model";
import { useImage } from "../lib/images";
import { dropUnused, storeImage } from "../lib/imageStore";
import { setAuto, showPhoto, shownIndex, useShownIndex } from "../lib/photos";
import { update, updateRace, useData } from "../lib/store";
import { cx } from "../lib/cx";
import { Button, buttonClass } from "../components/Button";
import { inputClass } from "../components/Field";
import { Section, hintClass } from "../components/Section";
import { Switch } from "../components/Switch";

const VIEW_LABEL: Record<PhotoView, string> = { card: "หน้าการ์ดรายชื่อ", result: "หน้าผล" };

export function Thumb({ k, rev, on, n, onShow, onRemove }: { k: string; rev: number | undefined; on: boolean; n: number; onShow: () => void; onRemove: () => void }) {
  const url = useImage(k, rev);
  return (
    <div className={cx("relative aspect-video border-2 bg-studio bg-cover bg-center", on ? "border-yellow" : "border-line")} style={{ backgroundImage: url ? `url("${url}")` : undefined }} data-thumb={n}>
      <button type="button" className="absolute inset-0" aria-pressed={on} aria-label={`แสดงรูปที่ ${n}`} onClick={onShow} />
      <span className={cx("pointer-events-none absolute top-0 left-0 px-1 font-display text-[13px] font-bold", on ? "bg-yellow text-navy" : "bg-navy text-white")}>{n}</span>
      <button type="button" aria-label={`ลบรูปที่ ${n}`} onClick={onRemove}
        className="absolute top-0 right-0 bg-danger px-1.5 text-[11px] leading-[18px] text-white">✕</button>
    </div>
  );
}

export function PhotoSetEditor({ race, view }: { race: Race; view: PhotoView }) {
  const d = useData();
  const set = race.photos[view];
  const shown = useShownIndex(set);
  const n = set.keys.length;
  const id = `pics-${view}`;
  const save = (fn: (s: PhotoSet) => PhotoSet) => updateRace(race.id, (r) => ({ ...r, photos: { ...r.photos, [view]: fn(r.photos[view]) } }));

  const add = async (files: FileList | null) => {
    if (!files?.length) return;
    const keys: string[] = [];
    for (const f of Array.from(files)) keys.push(await storeImage(f));
    const now = Date.now();
    update((x) => ({
      ...x,
      images: { ...x.images, ...Object.fromEntries(keys.map((k) => [k, now])) },
      races: x.races.map((r) => (r.id === race.id ? { ...r, photos: { ...r.photos, [view]: { ...r.photos[view], keys: [...r.photos[view].keys, ...keys] } } } : r)),
    }));
  };
  const remove = async (k: string) => {
    update((x) => {
      return {
        ...x,
        races: x.races.map((r) => {
          if (r.id !== race.id) return r;
          const s = r.photos[view], at = s.keys.indexOf(k), cur = Math.max(0, shownIndex(s));
          const keys = s.keys.filter((x) => x !== k);
          return { ...r, photos: { ...r.photos, [view]: showPhoto({ ...s, keys }, cur > at ? cur - 1 : cur) } };
        }),
      };
    });
    // the same picture may be used elsewhere too (an imported copy of the race)
    await dropUnused([k]);
  };

  return (
    <Section title={`รูปฉากหลัง (${VIEW_LABEL[view]})`}>
      {n > 0 && (
        <div className="grid grid-cols-4 gap-1" data-testid={`thumbs-${view}`}>
          {set.keys.map((k, i) => <Thumb key={k} k={k} rev={d.images[k]} n={i + 1} on={i === shown} onShow={() => save((s) => showPhoto(s, i))} onRemove={() => remove(k)} />)}
        </div>
      )}
      <div className="flex flex-wrap items-center gap-1.5">
        <label className={buttonClass("primary")} htmlFor={id}>เพิ่มรูป…</label>
        <input type="file" id={id} data-testid={`add-photos-${view}`} accept="image/*" multiple hidden onChange={(e) => { const f = e.target.files; add(f).finally(() => { e.target.value = ""; }); }} />
        {n > 1 && (
          <>
            <Button aria-label="รูปก่อนหน้า" onClick={() => save((s) => showPhoto(s, shownIndex(s) - 1))}>◀</Button>
            <span className="text-xs text-ink-muted" data-testid={`photo-pos-${view}`}>{shown + 1} / {n}</span>
            <Button aria-label="รูปถัดไป" onClick={() => save((s) => showPhoto(s, shownIndex(s) + 1))}>▶</Button>
          </>
        )}
      </div>
      {n > 1 && (
        <>
          <Switch on={set.auto} label="เปลี่ยนรูปอัตโนมัติ" testId={`auto-${view}`} onToggle={() => save((s) => setAuto(s, { auto: !s.auto }))} />
          <label className="flex items-center justify-between gap-3 text-[13px]" htmlFor={`${id}-sec`}>
            <span className="whitespace-nowrap">ทุกกี่วินาที</span>
            <input id={`${id}-sec`} className={cx(inputClass, "w-20 text-center")} type="number" min={1} max={600} step={1} value={set.seconds}
              onChange={(e) => { const v = Math.round(+e.target.value); if (v >= 1 && v <= 600) save((s) => setAuto(s, { seconds: v })); }} />
          </label>
        </>
      )}
      <span className={hintClass}>เลือกได้หลายรูปพร้อมกัน · กดรูปเล็กเพื่อขึ้นจอรูปนั้น · รูปเก็บในเครื่องนี้ ไม่อยู่ในไฟล์ JSON</span>
    </Section>
  );
}
