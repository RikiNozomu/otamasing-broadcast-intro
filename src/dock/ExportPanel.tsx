/**
 * Shown after pressing an export button: save the JSON as a file (a "Save as" dialog where the browser
 * has one), save a .zip with the JSON and its pictures, copy it, or select it in the box. Inside OBS saving leaves an empty file and downloads are ignored,
 * so there copying is the only way out.
 */
import { motion } from "motion/react";
import { useState } from "react";
import { copyText, inObs, saveFile, saveJson } from "../lib/download";
import { makeBundle } from "../lib/bundle";
import { cx } from "../lib/cx";
import { Button } from "../components/Button";
import { inputClass } from "../components/Field";
import { hintClass } from "../components/Section";

export type ExportJob = { name: string; text: string; count: number };

export function ExportPanel({ job, onClose }: { job: ExportJob; onClose: () => void }) {
  const [msg, setMsg] = useState<{ text: string; bad?: boolean } | null>(null);
  const obs = inObs();
  const save = async () => {
    const r = await saveJson(job.name, job.text);
    setMsg(r === "saved" ? { text: "บันทึกไฟล์แล้ว" } : r === "cancelled" ? null
      : r === "failed" ? { text: "บันทึกไฟล์ไม่สำเร็จ (ไฟล์อาจว่างเปล่า) ให้กด \"คัดลอก JSON\" แทน", bad: true }
      : { text: `ดาวน์โหลด ${job.name} แล้ว` });
  };
  const saveZip = async () => {
    const name = job.name.replace(/\.json$/i, "") + ".zip";
    const z = await makeBundle(job.text);
    const r = await saveFile(name, z.blob, { description: "ZIP (JSON + รูป)", mime: "application/zip", ext: ".zip" });
    const lost = z.missing.length ? ` (ไม่พบรูปในเครื่องนี้ ${z.missing.length} รูป: ${z.missing.join(", ")})` : "";
    setMsg(r === "saved" ? { text: `บันทึก .zip พร้อมรูป ${z.images} รูปแล้ว${lost}`, bad: !!lost } : r === "cancelled" ? null
      : r === "failed" ? { text: "บันทึกไฟล์ไม่สำเร็จ (ไฟล์อาจว่างเปล่า)", bad: true }
      : { text: `ดาวน์โหลด ${name} พร้อมรูป ${z.images} รูปแล้ว${lost}`, bad: !!lost });
  };
  const copy = async () => {
    const ok = await copyText(job.text);
    setMsg(ok ? { text: "คัดลอกแล้ว วางในโปรแกรมแก้ข้อความแล้วบันทึกเป็น .json หรือวางในช่อง \"วาง JSON\" ของอีกเครื่องได้เลย" }
      : { text: "คัดลอกอัตโนมัติไม่ได้ ให้คลิกในกล่องด้านล่าง กด Ctrl+A แล้ว Ctrl+C", bad: true });
  };
  return (
    <motion.div role="dialog" aria-label="ส่งออก JSON" data-testid="export-panel"
      className="grid gap-2 overflow-hidden border border-yellow px-2.5 py-2 text-[13px]"
      initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}>
      <span className="flex flex-wrap items-center justify-between gap-1.5">
        <span className="min-w-0 truncate">{job.name} · {job.count} รายการ</span>
        <span className="flex flex-wrap gap-1.5">
          {/* OBS's browser can't write files: its save dialog leaves an empty file, and downloads do nothing */}
          {!obs && <Button variant="primary" onClick={save}>บันทึกไฟล์…</Button>}
          {!obs && <Button onClick={saveZip}>บันทึก .zip พร้อมรูป…</Button>}
          <Button variant={obs ? "primary" : "default"} onClick={copy}>คัดลอก JSON</Button>
          <Button onClick={onClose}>ปิด</Button>
        </span>
      </span>
      <textarea readOnly aria-label="ข้อความ JSON" data-testid="export-text" value={job.text} rows={5}
        className={cx(inputClass, "resize-y font-mono text-[11px] leading-snug")} onFocus={(e) => e.currentTarget.select()} />
      {msg && <span role={msg.bad ? "alert" : "status"} className={cx("text-xs", msg.bad ? "text-danger-ink" : "text-ok")}>{msg.text}</span>}
      {obs && !msg && <span className={hintClass}>dock ใน OBS บันทึกไฟล์ไม่ได้ (ได้ไฟล์ว่าง) ใช้ "คัดลอก JSON" แล้วไปวางในโปรแกรมแก้ข้อความ หรือในช่อง "วาง JSON" ของ dock อีกเครื่อง (รูปไม่ไปด้วย ถ้าต้องการรูปให้ส่งออก .zip จาก Chrome)</span>}
      {!obs && !msg && <span className={hintClass}>JSON มีแค่ชื่อรูป ถ้าจะย้ายไปเครื่องอื่นหรือเข้า OBS พร้อมรูป ให้ใช้ "บันทึก .zip พร้อมรูป" แล้วนำเข้า .zip นั้น</span>}
    </motion.div>
  );
}
