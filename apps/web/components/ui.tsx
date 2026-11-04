import Link from "next/link";
import { type ComponentProps, type ReactNode, useId } from "react";
import { cx } from "@/lib/format";

type ButtonProps = {
  variant?: "primary" | "secondary" | "ghost";
  size?: "md" | "lg";
  className?: string;
  children: ReactNode;
};

const buttonClass = ({ variant = "primary", size = "md", className }: Omit<ButtonProps, "children">) =>
  cx(
    "group relative inline-flex items-center justify-center gap-2 overflow-hidden rounded-full font-medium transition-all duration-200 disabled:pointer-events-none disabled:opacity-40",
    size === "lg" ? "h-12 px-6 text-[15px]" : "h-10 px-4 text-sm",
    variant === "primary" &&
      "bg-gradient-to-b from-punch to-deep text-white shadow-[0_8px_30px_-8px_rgb(255_76_152/0.7),inset_0_1px_0_rgb(255_255_255/0.25)] hover:brightness-110 active:scale-[0.98]",
    variant === "secondary" &&
      "border border-line bg-white/[0.03] text-ink hover:border-punch/50 hover:bg-white/[0.06]",
    variant === "ghost" && "text-ink-2 hover:bg-white/[0.05] hover:text-ink",
    className,
  );

/** The primary pill gets a moving sheen. */
const Sheen = () => (
  <span
    aria-hidden
    className="pointer-events-none absolute inset-y-0 left-0 w-1/3 animate-shine bg-gradient-to-r from-transparent via-white/25 to-transparent"
  />
);

export function Button({ variant, size, className, children, ...rest }: ButtonProps & ComponentProps<"button">) {
  return (
    <button type="button" className={buttonClass({ variant, size, className })} {...rest}>
      {variant === undefined || variant === "primary" ? <Sheen /> : null}
      <span className="relative inline-flex items-center gap-2">{children}</span>
    </button>
  );
}

export function ButtonLink({ variant, size, className, children, href }: ButtonProps & { href: string }) {
  return (
    <Link href={href} className={buttonClass({ variant, size, className })}>
      {variant === undefined || variant === "primary" ? <Sheen /> : null}
      <span className="relative inline-flex items-center gap-2">{children}</span>
    </Link>
  );
}

export function Badge({
  tone = "neutral",
  children,
  className,
}: {
  tone?: "neutral" | "punch" | "gain" | "loss" | "warn" | "info";
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cx(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 font-mono text-[11px] uppercase tracking-wider",
        tone === "neutral" && "border-line bg-white/[0.03] text-muted",
        tone === "punch" && "border-punch/30 bg-punch/10 text-kicker",
        tone === "gain" && "border-gain/30 bg-gain/10 text-gain",
        tone === "loss" && "border-loss/30 bg-loss/10 text-loss",
        tone === "warn" && "border-warn/30 bg-warn/10 text-warn",
        tone === "info" && "border-info/30 bg-info/10 text-info",
        className,
      )}
    >
      {children}
    </span>
  );
}

export const LiveDot = ({ className }: { className?: string }) => (
  <span aria-hidden className={cx("inline-block size-2 rounded-full bg-gain animate-pulse-dot", className)} />
);

export function SectionHeading({
  kicker,
  title,
  body,
  align = "left",
}: {
  kicker: string;
  title: ReactNode;
  body?: ReactNode;
  align?: "left" | "center";
}) {
  return (
    <div className={cx("max-w-2xl", align === "center" && "mx-auto text-center")}>
      <p className="kicker">{kicker}</p>
      <h2 className="mt-3 text-balance text-3xl font-semibold tracking-[-0.03em] text-ink sm:text-[2.6rem] sm:leading-[1.08]">
        {title}
      </h2>
      {body ? <p className="mt-4 text-pretty text-[17px] leading-relaxed text-muted">{body}</p> : null}
    </div>
  );
}

export function Stat({
  label,
  value,
  sub,
  tone,
}: {
  label: string;
  value: ReactNode;
  sub?: ReactNode;
  tone?: "gain" | "loss";
}) {
  return (
    <div>
      <p className="text-xs text-muted">{label}</p>
      <p
        className={cx(
          "num mt-1 text-2xl font-medium",
          tone === "gain" ? "text-gain" : tone === "loss" ? "text-loss" : "text-ink",
        )}
      >
        {value}
      </p>
      {sub ? <p className="num mt-0.5 text-xs text-muted">{sub}</p> : null}
    </div>
  );
}

/**
 * Segmented control built on native radio inputs: arrow keys, focus and screen readers work
 * without extra code. The input is visually hidden; the label is the visible segment.
 */
export function Segmented<T extends string>({
  label,
  options,
  value,
  onChange,
  size = "md",
}: {
  label: string;
  options: Array<{ value: T; label: ReactNode; hint?: ReactNode }>;
  value: T;
  onChange: (v: T) => void;
  size?: "sm" | "md";
}) {
  const name = useId();
  return (
    <fieldset className="flex flex-wrap gap-1 rounded-2xl border border-line-soft bg-black/20 p-1">
      <legend className="sr-only">{label}</legend>
      {options.map((o) => (
        <label
          key={o.value}
          className={cx(
            "flex-1 cursor-pointer rounded-xl text-left text-muted transition-all duration-200 hover:bg-white/[0.04] hover:text-ink-2",
            "has-[:checked]:bg-surface-3 has-[:checked]:text-ink has-[:checked]:shadow-[inset_0_0_0_1px_rgb(255_76_152/0.45)]",
            "has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-punch",
            size === "sm" ? "px-3 py-1.5 text-xs" : "px-3.5 py-2.5 text-sm",
          )}
        >
          <input
            type="radio"
            name={name}
            value={o.value}
            checked={o.value === value}
            onChange={() => onChange(o.value)}
            className="sr-only"
          />
          <span className="block font-medium">{o.label}</span>
          {o.hint ? <span className="mt-0.5 block font-mono text-[11px] text-faint">{o.hint}</span> : null}
        </label>
      ))}
    </fieldset>
  );
}

export function Container({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cx("mx-auto w-full max-w-6xl px-4 sm:px-6", className)}>{children}</div>;
}
