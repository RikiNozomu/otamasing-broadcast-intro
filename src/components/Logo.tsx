/** The white โอตะม้าซิ่ง wordmark (inline SVG, so it is drawn sharp at any scale). */
import logo from "../logo-white.svg?raw";
import { cx } from "../lib/cx";

export const Logo = ({ className }: { className?: string }) => (
  <div className={cx("[&_path]:fill-white [&_svg]:block [&_svg]:h-auto [&_svg]:w-full", className)} dangerouslySetInnerHTML={{ __html: logo }} />
);
