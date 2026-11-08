/** Line icons for the weather words (drawn in white, sized by className). */
import type { Weather } from "../../lib/introSchema";

const SUN = <><circle cx="24" cy="24" r="8" /><path d="M24 6v6M24 36v6M6 24h6M36 24h6M11.3 11.3l4.2 4.2M32.5 32.5l4.2 4.2M11.3 36.7l4.2-4.2M32.5 15.5l4.2-4.2" /></>;
const CLOUD = <path d="M15 36h20a8 8 0 0 0 0-16 11 11 0 0 0-21-2 9 9 0 0 0 1 18z" />;
const SMALL_SUN = <><circle cx="17" cy="16" r="6" /><path d="M17 4v3M5 16h3M8.5 7.5l2 2M25.5 7.5l-2 2" /></>;

export function WeatherIcon({ kind, className }: { kind: Weather; className?: string }) {
  const drops = (n: number, long = true) => Array.from({ length: n }, (_, i) => <path key={i} d={`M${17 + i * 8} 40l-2 ${long ? 6 : 3}`} />);
  return (
    <svg viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" className={className} aria-label={kind}>
      {kind === "sunny" && SUN}
      {kind === "partly" && <>{SMALL_SUN}<path d="M19 40h17a7 7 0 0 0 0-14 9.5 9.5 0 0 0-18-1.5 7.8 7.8 0 0 0 1 15.5z" /></>}
      {kind === "cloudy" && CLOUD}
      {kind === "fog" && <path d="M8 18h32M5 25h38M8 32h32M12 39h24" />}
      {kind === "drizzle" && <><path d="M15 32h20a8 8 0 0 0 0-16 11 11 0 0 0-21-2 9 9 0 0 0 1 18z" />{drops(3, false)}</>}
      {kind === "rain" && <><path d="M15 32h20a8 8 0 0 0 0-16 11 11 0 0 0-21-2 9 9 0 0 0 1 18z" />{drops(3)}</>}
      {kind === "snow" && <><path d="M15 32h20a8 8 0 0 0 0-16 11 11 0 0 0-21-2 9 9 0 0 0 1 18z" /><path d="M18 40h.01M26 42h.01M34 40h.01" strokeWidth={4} /></>}
      {kind === "storm" && <><path d="M15 30h20a8 8 0 0 0 0-16 11 11 0 0 0-21-2 9 9 0 0 0 1 18z" /><path d="M25 30l-5 8h7l-4 8" /></>}
    </svg>
  );
}
