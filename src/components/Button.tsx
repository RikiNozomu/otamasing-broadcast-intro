/** Dock buttons. `buttonClass` also styles a <label> that opens a file input. */
import type { ButtonHTMLAttributes } from "react";
import { cx } from "../lib/cx";

export type ButtonVariant = "default" | "primary" | "danger";
const VARIANT: Record<ButtonVariant, string> = {
  default: "border-line bg-raised text-ink",
  primary: "border-yellow bg-yellow font-semibold text-navy",
  danger: "border-danger bg-danger text-white",
};

export const buttonClass = (variant: ButtonVariant = "default", className?: string) =>
  cx("inline-flex items-center justify-center border px-2.5 py-1.5 text-[13px] leading-normal disabled:opacity-40", VARIANT[variant], className);

export function Button({ variant, className, ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant }) {
  return <button type="button" className={buttonClass(variant, className)} {...props} />;
}
