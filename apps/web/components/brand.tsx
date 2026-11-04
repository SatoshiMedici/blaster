import Link from "next/link";

/** Mark: a spark inside a rounded vault outline — "an agent inside your vault". */
export function LogoMark({ className = "size-7" }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden>
      <defs>
        <linearGradient id="bm" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#FF4C98" />
          <stop offset="1" stopColor="#F12D82" />
        </linearGradient>
      </defs>
      <rect x="2.5" y="2.5" width="27" height="27" rx="8" fill="none" stroke="url(#bm)" strokeWidth="2.2" />
      <path d="M17.6 6.5 10 18h5.2l-1.6 7.5L22 14h-5.4l1-7.5Z" fill="url(#bm)" />
    </svg>
  );
}

export function Logo() {
  return (
    <Link href="/" className="flex items-center gap-2.5 text-ink" aria-label="Blast Agents home">
      <LogoMark />
      <span className="text-[15px] font-semibold tracking-[-0.02em]">
        Blast <span className="text-muted">Agents</span>
      </span>
    </Link>
  );
}
