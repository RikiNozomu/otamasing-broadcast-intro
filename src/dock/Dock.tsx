/** The OBS Custom Browser Dock: three tabs, ภาพรวม (overview), การแข่งขัน (one race) and ม้า (horse profiles). */
import { AnimatePresence, motion } from "motion/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { parseActive } from "../lib/model";
import { useData } from "../lib/store";
import { renameOldImages } from "../lib/imageStore";
import { cx } from "../lib/cx";
import { EditTab } from "./EditTab";
import { RacesTab } from "./RacesTab";
import { HorsesTab } from "./HorsesTab";

export type Toast = (msg: string, bad?: boolean) => void;

export function Dock() {
  const d = useData();
  const [tab, setTab] = useState<"races" | "edit" | "horses">("races");
  const [editing, setEditing] = useState<string | null>(parseActive(d.active).raceId ?? d.races[0]?.id ?? null);
  const [toastMsg, setToast] = useState<{ msg: string; bad: boolean } | null>(null);
  const timer = useRef<number | undefined>(undefined);
  const toast = useCallback<Toast>((msg, bad = false) => {
    setToast({ msg, bad });
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setToast(null), bad ? 6000 : 2500);
  }, []);
  useEffect(() => { document.body.classList.add("bg-panel"); document.title = "โอตะม้าซิ่ง Broadcast Compact · Dock"; }, []);
  // pictures saved before they were named image/<date-time>.<ext> get such a name
  useEffect(() => { renameOldImages().catch(() => {}); }, []);
  const a = parseActive(d.active);
  const race = d.races.find((r) => r.id === a.raceId);
  const horse = a.view === "horse" ? d.horses.find((h) => h.id === a.horseId) : undefined;
  const activeLabel = a.view === "blank" ? "หน้าเปล่า" : horse ? horse.name : !race ? "หน้าแรก" : `${race.round || race.name}${a.view === "result" ? " ผล" : ""}`;
  const tabs = [["races", "ภาพรวม"], ["edit", "การแข่งขัน"], ["horses", "ม้า"]] as const;
  return (
    <div className="grid min-h-screen grid-rows-[auto_auto_1fr] bg-panel">
      <div className="flex items-center justify-between bg-navy px-3.5 py-2.5 font-display text-[15px] font-bold tracking-[.06em] uppercase">
        <span>โอตะม้าซิ่ง Broadcast Compact</span>
        <span data-testid="active-tag">Active: {activeLabel}</span>
      </div>
      <div className="grid grid-cols-3 border-b border-line" role="tablist">
        {tabs.map(([k, label]) => (
          <button key={k} type="button" role="tab" id={`tab-${k}`} aria-selected={tab === k} aria-controls={`p-${k}`} onClick={() => setTab(k)}
            className={cx("relative px-1 py-2.5 text-sm font-medium", tab === k ? "text-ink" : "text-ink-muted")}>
            {label}
            {tab === k && <motion.span layoutId="dock-tab" className="absolute inset-x-0 -bottom-px h-[3px] bg-yellow" transition={{ type: "spring", stiffness: 500, damping: 40 }} />}
          </button>
        ))}
      </div>
      {tab === "races"
        ? <RacesTab toast={toast} onEdit={(id) => { setEditing(id); setTab("edit"); }} />
        : tab === "edit" ? <EditTab editing={editing} setEditing={setEditing} />
        : <HorsesTab />}
      <AnimatePresence>
        {toastMsg && (
          <motion.div key="toast" role={toastMsg.bad ? "alert" : "status"}
            className={cx("fixed inset-x-3 bottom-3 z-60 border px-3 py-2.5 text-[13px] shadow-[0_8px_24px_rgb(0_0_0/.5)]", toastMsg.bad ? "border-danger-ink bg-danger-bg" : "border-ok bg-ok-bg")}
            initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 16 }} transition={{ duration: 0.2 }}>
            {toastMsg.msg}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
