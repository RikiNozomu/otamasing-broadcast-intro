/**
 * The weather logo from Figma ("Weather": Sunny, Cloudy, Rain, Snow), drawn in colour. Every weather word maps to
 * one of the four: partly cloudy and fog show the cloud, drizzle and thunderstorm the rain. Size comes from className.
 */
import sunny from "../assets/weather/sunny.svg";
import cloudy from "../assets/weather/cloudy.svg";
import rain from "../assets/weather/rain.svg";
import snow from "../assets/weather/snow.svg";
import { cx } from "../lib/cx";

export const WEATHER_LOGO: Record<string, string> = {
  sunny, partly: cloudy, cloudy, fog: cloudy, drizzle: rain, rain, snow, storm: rain,
};

export function WeatherLogo({ kind, className, testId }: { kind: string; className?: string; testId?: string }) {
  const src = WEATHER_LOGO[kind];
  return src ? <img src={src} alt={kind} data-weather={kind} data-testid={testId} draggable={false} className={cx("block flex-none object-contain", className)} /> : null;
}
