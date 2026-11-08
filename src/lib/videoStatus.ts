/**
 * What the overlay's history player is doing with the video the dock asked it to play, so the dock can say
 * "playing 0:12" or why it can't play. It lives under its own localStorage key, outside the app data (never
 * exported): the overlay writes it, the dock reads it.
 */
export const VIDEO_STATUS_KEY = "otamasing-broadcast-intro/video-status";

export type VideoState = "loading" | "playing" | "muted" | "hidden" | "missing" | "unsupported" | "failed" | "ended";

export interface VideoStatus {
  /** The play it is about: the history moment's id and when the dock pressed ▶ (`history.play`). */
  id: string;
  at: number;
  state: VideoState;
  /** Where the video is, in seconds. */
  t: number;
  /** The browser's own words for a failure. */
  detail?: string;
}

export function writeVideoStatus(s: VideoStatus) {
  try { localStorage.setItem(VIDEO_STATUS_KEY, JSON.stringify(s)); } catch { /* private mode: the dock just won't know */ }
}

export function readVideoStatus(): VideoStatus | null {
  try {
    const s = JSON.parse(localStorage.getItem(VIDEO_STATUS_KEY) ?? "null") as VideoStatus | null;
    return s && typeof s.id === "string" && typeof s.at === "number" && typeof s.state === "string" ? s : null;
  } catch {
    return null;
  }
}

/** A failed play() or <video> error, sorted into "this browser can't open the file" and anything else. */
export function failureOf(e: { name?: string; code?: number; message?: string } | null | undefined): { state: VideoState; detail: string } {
  const detail = [e?.name, e?.code != null ? `code ${e.code}` : "", e?.message].filter(Boolean).join(" · ");
  // MEDIA_ERR_SRC_NOT_SUPPORTED, or play() refusing for the same reason
  if (e?.code === 4 || e?.name === "NotSupportedError") return { state: "unsupported", detail };
  return { state: "failed", detail };
}

const mmss = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;

/**
 * The line under "กำลังเล่น" in the dock: what the overlay reported for this play, or that it hasn't answered.
 * `bad` lines are problems the user has to fix.
 */
export function videoStatusText(s: VideoStatus | null, play: { id: string; at: number } | null, now = Date.now()): { text: string; bad: boolean } | null {
  if (!play) return null;
  if (!s || s.id !== play.id || s.at !== play.at) {
    return now - play.at > 4000
      ? { text: "จอยังไม่ตอบ: เปิดหน้า overlay ไว้หรือยัง และฉากสนามของรายการนี้เป็น Active ไหม (dock กับจอต้องอยู่เบราว์เซอร์เดียวกัน เช่นทั้งคู่ใน OBS)", bad: true }
      : { text: "จอ: กำลังเปิดวิดีโอ…", bad: false };
  }
  switch (s.state) {
    case "loading": return { text: "จอ: กำลังโหลดวิดีโอ…", bad: false };
    case "playing": return { text: `จอ: เล่นอยู่ ${mmss(s.t)}`, bad: false };
    case "muted": return { text: `จอ: เล่นอยู่ ${mmss(s.t)} แต่ไม่มีเสียง เพราะเบราว์เซอร์ไม่ให้เล่นเสียงจนกว่าจะมีคนคลิกที่หน้า overlay คลิกหน้านั้นหนึ่งครั้งแล้วเสียงจะค่อยๆ ดังขึ้น (ใน OBS ไม่เป็น)`, bad: true };
    case "hidden": return { text: "จอ: หน้า overlay ถูกซ่อนอยู่ (แท็บหรือหน้าต่างไม่ได้เปิดดู) วิดีโอจะเริ่มเมื่อเปิดดูหน้านั้น", bad: true };
    case "missing": return { text: "จอ: ไม่พบไฟล์วิดีโอในเบราว์เซอร์ของจอ เลือกวิดีโอใหม่จาก dock ที่อยู่เบราว์เซอร์เดียวกับจอ (เช่น dock ใน OBS) หรือนำเข้าไฟล์ .zip ที่มีวิดีโอ", bad: true };
    case "unsupported": return { text: `จอ: เปิดไฟล์วิดีโอนี้ไม่ได้ (ชนิดไฟล์หรือ codec ไม่รองรับ เช่น HEVC/H.265 จาก iPhone) แปลงเป็น MP4 (H.264) หรือ WebM แล้วเลือกใหม่${s.detail ? ` · ${s.detail}` : ""}`, bad: true };
    case "failed": return { text: `จอ: เล่นวิดีโอไม่ได้${s.detail ? ` (${s.detail})` : ""}`, bad: true };
    case "ended": return { text: "จอ: เล่นจบแล้ว", bad: false };
  }
}
