/** Landing page (#/): what the two URLs are for, with a live preview. */
import { Section, hintClass } from "./components/Section";
import { LiveScene } from "./overlay/LiveScene";
import { Stage } from "./overlay/Stage";

export function Landing() {
  const base = `${location.origin}${location.pathname}`;
  const links = [
    ["Dock", "OBS → Docks → Custom Browser Docks", "#/dock"],
    ["Browser Source (1920×1080)", "OBS → Sources → Browser", "#/overlay"],
  ] as const;
  return (
    <main className="mx-auto grid max-w-[1100px] gap-5 px-4 pt-8 pb-14">
      <header>
        <h1 className="m-0 mb-2 font-display text-[44px] leading-none font-extrabold uppercase">โอตะม้าซิ่ง Broadcast Intro</h1>
        <p className="m-0 max-w-[70ch] text-ink-muted">แผงควบคุมใน OBS (Custom Browser Dock) กับหน้าจอออกอากาศ (Browser Source) สำหรับฉาก Intro ก่อนการแข่งขันแบบ F1: สนาม 3D และประวัติรายการ, แนะนำม้าทีละตัว และ STARTING GATE (การ์ดรายชื่อม้า ผล และหน้าแรกอยู่ใน broadcast compact ไฟล์ JSON ใช้ร่วมกันได้) ข้อมูลเก็บในเบราว์เซอร์ของเครื่องนี้เท่านั้น</p>
      </header>
      <div className="grid grid-cols-[repeat(auto-fit,minmax(280px,1fr))] gap-3">
        {links.map(([title, where, hash]) => (
          <Section key={hash} title={title}>
            <span className={hintClass}>{where}</span>
            <a href={hash}><code className="text-[13px] break-all">{base}{hash}</code></a>
          </Section>
        ))}
      </div>
      <div className="relative aspect-video w-full overflow-hidden border border-line bg-black"><Stage><LiveScene /></Stage></div>
      <p className={hintClass}>ข้อมูลใน OBS แยกจาก Chrome ปกติ ถ้าเตรียมข้อมูลใน Chrome ให้กดส่งออก JSON แล้วนำเข้าใน dock ของ OBS · ส่งออกจาก dock ใน OBS ใช้ "คัดลอก JSON" (OBS บันทึกไฟล์ไม่ได้) แล้ววางในโปรแกรมแก้ข้อความ หรือในช่อง "วาง JSON" · ใน OBS ติ๊ก "Control audio via OBS" ที่ Browser Source ให้เสียงวิดีโอไฮไลต์เข้ามิกเซอร์ และเปิด Browser Source Hardware Acceleration สำหรับ 3D · รูปแบบไฟล์ JSON ดูได้ที่ <a href="https://github.com/RikiNozomu/otamasing-broadcast-intro/blob/main/docs/race-json.md">docs/race-json.md</a></p>
    </main>
  );
}
