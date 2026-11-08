/**
 * Tab "จ็อกกี้": the jockeys the runner intro knows, matched to the runners by name. Each has a country (flag) and a
 * cut-out photo (a PNG with a see-through background) that stands on the right of the runner intro.
 */
import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import { jockeyKey, newId } from "../lib/model";
import type { Jockey } from "../lib/introSchema";
import { update, useData } from "../lib/store";
import { useImage } from "../lib/images";
import { dropUnused, storeImage } from "../lib/imageStore";
import { cx } from "../lib/cx";
import { Button, buttonClass } from "../components/Button";
import { Field, inputClass } from "../components/Field";
import { Section, hintClass } from "../components/Section";
import { Flag } from "../components/Flag";
import { FlagPicker } from "./FlagPicker";

const updateJockey = (id: string, fn: (j: Jockey) => Jockey) => update((d) => ({ ...d, jockeys: d.jockeys.map((j) => (j.id === id ? fn(j) : j)) }));

function Photo({ j, className }: { j: Jockey; className?: string }) {
  const d = useData();
  const url = useImage(j.photo ?? "", j.photo ? d.images[j.photo] : undefined);
  return (
    <span className={cx("grid place-items-end justify-items-center overflow-hidden bg-[linear-gradient(180deg,#1a2c9c,#020a48)]", className)} data-testid="jockey-thumb" data-has={url ? "" : undefined}>
      {url ? <img src={url} alt="" className="h-full w-full object-contain object-bottom" /> : <span className="self-center text-[10px] text-ink-muted">ไม่มีรูป</span>}
    </span>
  );
}

function JockeyEditor({ j }: { j: Jockey }) {
  const d = useData();
  const [busy, setBusy] = useState(false);
  const rides = d.races.flatMap((r) => r.runners.filter((h) => h.jockey && jockeyKey(h.jockey) === jockeyKey(j.name)).map((h) => `${r.round || r.name} · ${h.name}`));
  const put = async (f: File | undefined) => {
    if (!f) return;
    setBusy(true);
    const old = j.photo;
    const name = await storeImage(f);
    update((x) => ({ ...x, images: { ...x.images, [name]: Date.now() }, jockeys: x.jockeys.map((y) => (y.id === j.id ? { ...y, photo: name } : y)) }));
    setBusy(false);
    await dropUnused([old]);
  };
  const removePhoto = async () => {
    const old = j.photo;
    updateJockey(j.id, (x) => ({ ...x, photo: null }));
    await dropUnused([old]);
  };
  return (
    <motion.div className="grid grid-cols-[110px_minmax(0,1fr)] gap-2.5 overflow-hidden border border-line bg-panel p-2.5" data-testid="jockey-edit"
      initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}>
      <Photo j={j} className="h-[140px] border border-line" />
      <div className="grid content-start gap-2">
        <Field id={`jk-${j.id}-name`} label="ชื่อ (ตรงกับชื่อในตารางม้า)">
          <input id={`jk-${j.id}-name`} className={inputClass} value={j.name} onChange={(e) => updateJockey(j.id, (x) => ({ ...x, name: e.target.value }))} />
        </Field>
        <div className="grid grid-cols-[minmax(0,1fr)_64px] items-center gap-2 text-[13px]">
          <span>ประเทศ</span>
          <FlagPicker label="ประเทศจ็อกกี้" value={j.country} onChange={(c) => updateJockey(j.id, (x) => ({ ...x, country: c }))} />
        </div>
        <div className="flex flex-wrap gap-1.5">
          <label className={buttonClass("primary")} htmlFor={`jk-${j.id}-photo`}>{busy ? "กำลังเก็บรูป…" : j.photo ? "เปลี่ยนรูป…" : "เลือกรูปจ็อกกี้…"}</label>
          <input id={`jk-${j.id}-photo`} type="file" accept="image/png,image/webp,image/*" hidden data-testid="jockey-photo-file"
            onChange={(e) => { put(e.target.files?.[0]).finally(() => { e.target.value = ""; }); }} />
          {j.photo && <Button onClick={removePhoto}>ลบรูป</Button>}
        </div>
      </div>
      <span className={cx(hintClass, "col-span-2")}>
        {rides.length ? `ขี่: ${rides.join(", ")}` : "ยังไม่มีม้าในรายการไหนที่ชื่อจ็อกกี้ตรงกับชื่อนี้"}
      </span>
    </motion.div>
  );
}

export function JockeysTab() {
  const d = useData();
  const [open, setOpen] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const known = new Set(d.jockeys.map((j) => jockeyKey(j.name)));
  // jockeys riding in the races that aren't in the list yet (with the country from the runner table)
  const missing = new Map<string, { name: string; country: string }>();
  for (const r of d.races) for (const h of r.runners) {
    const k = jockeyKey(h.jockey);
    if (h.jockey.trim() && !known.has(k) && !missing.has(k)) missing.set(k, { name: h.jockey.trim(), country: h.jockeyCountry });
  }
  const addMissing = () => update((x) => ({ ...x, jockeys: [...x.jockeys, ...[...missing.values()].map((m) => ({ id: newId(), name: m.name, country: m.country, photo: null }))] }));
  const add = () => {
    const id = newId();
    update((x) => ({ ...x, jockeys: [...x.jockeys, { id, name: "New Jockey", country: "", photo: null }] }));
    setOpen(id);
  };
  const remove = async (j: Jockey) => {
    update((x) => ({ ...x, jockeys: x.jockeys.filter((y) => y.id !== j.id) }));
    await dropUnused([j.photo]);
  };
  const s = q.trim().toLowerCase();
  const list = [...d.jockeys].sort((a, b) => a.name.localeCompare(b.name)).filter((j) => !s || j.name.toLowerCase().includes(s));
  const withPhoto = d.jockeys.filter((j) => j.photo && d.images[j.photo]).length;
  return (
    <div className="grid content-start gap-3 p-3" role="tabpanel" id="p-jockeys" aria-labelledby="tab-jockeys">
      <Section title={`จ็อกกี้ ${d.jockeys.length} คน · มีรูป ${withPhoto}`}>
        {missing.size > 0 && (
          <div className="flex flex-wrap items-center gap-1.5 border border-yellow px-2.5 py-1.5 text-[13px]" data-testid="jockeys-missing">
            <span>มีจ็อกกี้ในตารางม้า {missing.size} คนที่ยังไม่อยู่ในรายชื่อ</span>
            <Button variant="primary" onClick={addMissing}>เพิ่มทั้งหมด</Button>
          </div>
        )}
        {d.jockeys.length > 6 && <input className={inputClass} type="search" placeholder="ค้นหาชื่อจ็อกกี้" aria-label="ค้นหาชื่อจ็อกกี้" value={q} onChange={(e) => setQ(e.target.value)} />}
        <div className="grid gap-1.5" data-testid="jockey-list">
          {list.map((j) => (
            <div key={j.id} className="grid gap-1.5">
              <div className={cx("grid grid-cols-[38px_minmax(0,1fr)_auto] items-center gap-2 border bg-studio px-2 py-1.5", open === j.id ? "border-yellow" : "border-line")} data-testid="jockey-row">
                <Photo j={j} className="h-[44px] w-[38px]" />
                <button type="button" className="flex min-w-0 items-center gap-2 text-left text-[13px]" aria-expanded={open === j.id} onClick={() => setOpen((o) => (o === j.id ? null : j.id))}>
                  {j.country && <Flag code={j.country} className="h-[14px] w-[21px] flex-none" />}
                  <span className="truncate">{j.name || <span className="text-ink-muted">(ไม่มีชื่อ)</span>}</span>
                </button>
                <Button className="px-1.5 py-[3px] text-xs text-danger-ink" aria-label={`ลบ ${j.name}`} onClick={() => remove(j)}>✕</Button>
              </div>
              <AnimatePresence>{open === j.id && <JockeyEditor key="edit" j={j} />}</AnimatePresence>
            </div>
          ))}
          {!d.jockeys.length && <span className="text-xs text-ink-muted">ยังไม่มีจ็อกกี้</span>}
        </div>
        <Button className="justify-self-start" onClick={add}>+ เพิ่มจ็อกกี้</Button>
        <span className={hintClass}>
          รูปจ็อกกี้ควรเป็น PNG ตัดพื้นหลังออก (ยืนตัวตรง เห็นครึ่งตัวขึ้นไป) ขึ้นด้านขวาของฉากแนะนำม้า · จับคู่กับม้าในตารางด้วยชื่อ (ไม่สนตัวพิมพ์ เว้นวรรค และจุด) · รูปเก็บในเครื่องนี้ ไฟล์ JSON มีแค่ชื่อรูป
        </span>
      </Section>
    </div>
  );
}
