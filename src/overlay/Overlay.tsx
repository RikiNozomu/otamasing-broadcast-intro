/** The one OBS Browser Source (1920x1080): shows whatever is Active in the dock, on a transparent page. */
import { useEffect } from "react";
import { LiveScene, loadCourseScene } from "./LiveScene";
import { Stage } from "./Stage";

export function Overlay() {
  useEffect(() => {
    document.body.classList.add("overflow-hidden", "bg-transparent");
    document.title = "โอตะม้าซิ่ง Broadcast Intro · Overlay";
    // have the 3D course ready before the dock asks for it
    loadCourseScene().catch(() => {});
  }, []);
  return (
    <div className="fixed inset-0 overflow-hidden">
      <Stage><LiveScene /></Stage>
    </div>
  );
}
