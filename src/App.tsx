import { MotionConfig } from "motion/react";
import { useEffect, useState } from "react";
import { Dock } from "./dock/Dock";
import { Landing } from "./Landing";
import { Overlay } from "./overlay/Overlay";

/** Hash routing, so GitHub Pages serves one index.html for every page. */
const route = () => location.hash.replace(/^#\/?/, "").split("?")[0];

export function App() {
  const [r, setR] = useState(route());
  useEffect(() => {
    const on = () => setR(route());
    addEventListener("hashchange", on);
    return () => removeEventListener("hashchange", on);
  }, []);
  // "user": follow the OS "reduce motion" setting
  return (
    <MotionConfig reducedMotion="user">
      {r === "overlay" ? <Overlay /> : r === "dock" ? <Dock /> : <Landing />}
    </MotionConfig>
  );
}
