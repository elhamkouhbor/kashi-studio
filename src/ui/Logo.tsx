// Kashi Studio identity (original artwork, sister of the Fold, Dieline and Color Lab marks).
// Mark: the Elham "E" whose arms are glazed tile pieces, beside a small eight-pointed star.
import { BRAND } from "../app/brand";

export function LogoMark({ size = 32 }: { size?: number }) {
  return (
    <svg className="logo-mark" width={size} height={size} viewBox="0 0 32 32" aria-hidden="true">
      <rect width="32" height="32" rx="8" fill="var(--brand, #4f46e5)" />
      <rect x="7" y="7" width="4.4" height="18" rx=".6" fill="#fff" />
      <rect x="11.4" y="7" width="10" height="4" rx=".6" fill="#fff" />
      <rect x="11.4" y="14" width="7" height="4" rx=".6" fill="#7fd3dc" />
      <rect x="11.4" y="21" width="10" height="4" rx=".6" fill="#f2c45a" />
      <path d="M25 12.2l1.1 2.7 2.7 1.1-2.7 1.1-1.1 2.7-1.1-2.7-2.7-1.1 2.7-1.1z" fill="#fff" />
    </svg>
  );
}

/** "Elham" wordmark as monoline paths, shared by the Elham tools. */
export function Wordmark({ height = 20 }: { height?: number }) {
  return (
    <svg className="wordmark" height={height} viewBox="-1.5 -1.5 70 23" aria-hidden="true">
      <g fill="none" stroke="currentColor" strokeWidth="2.7" strokeLinecap="round" strokeLinejoin="round">
        <path d="M8 0H0V20H8M0 10H7" />
        <path d="M13 0V20" />
        <path d="M18 0V20M18 13.5a5 5 0 0 1 10 0V20" />
        <circle cx="38" cy="14.5" r="5.5" /><path d="M43.5 9V20" />
        <path d="M49 9V20M49 13.5a4.5 4.5 0 0 1 9 0V20M58 13.5a4.5 4.5 0 0 1 9 0V20" />
      </g>
    </svg>
  );
}

export function LogoFull({ compact = false }: { compact?: boolean }) {
  return (
    <span className="logo-full" aria-label={BRAND.name} role="img">
      <LogoMark size={30} />
      {!compact && <><Wordmark height={17} /><span className="logo-product">Kashi Studio <span className="fa" lang="fa">کاشی</span></span></>}
    </span>
  );
}
