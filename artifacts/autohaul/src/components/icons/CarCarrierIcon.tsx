interface CarCarrierIconProps {
  className?: string;
}

export function CarCarrierIcon({ className }: CarCarrierIconProps) {
  return (
    <svg
      viewBox="0 0 28 22"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-label="Auto transport carrier"
    >
      {/* ── Upper deck rail ── */}
      <line x1="2" y1="8" x2="17" y2="8" />
      {/* ── Lower deck rail ── */}
      <line x1="2" y1="12.5" x2="17" y2="12.5" />
      {/* ── Trailer bottom frame ── */}
      <line x1="2" y1="16.5" x2="16" y2="16.5" />

      {/* ── Vertical struts ── */}
      <line x1="2"  y1="8" x2="2"  y2="16.5" />
      <line x1="9"  y1="8" x2="9"  y2="16.5" />
      <line x1="16" y1="8" x2="16" y2="16.5" />

      {/* ── Car on upper deck (left bay) ── */}
      <path d="M3 8 C3 8 3.6 6.2 4.3 6.2 H7.2 C7.9 6.2 8.5 8 8.5 8" />

      {/* ── Car on lower deck (right bay, slightly offset) ── */}
      <path d="M10 12.5 C10 12.5 10.6 10.7 11.3 10.7 H14.2 C14.9 10.7 15.5 12.5 15.5 12.5" />

      {/* ── Semi-truck cab ── */}
      {/* Main cab body */}
      <path d="M16 8.5 L18 7 L24 7 L26 9.5 L26 16.5 L16 16.5 Z" />
      {/* Windshield / A-pillar split */}
      <path d="M18 7 L19 9.5 L26 9.5" />
      {/* Cab door divider */}
      <line x1="20.5" y1="9.5" x2="20.5" y2="16.5" />

      {/* ── Wheels ── */}
      <circle cx="5.5"  cy="18" r="1.6" />
      <circle cx="12.5" cy="18" r="1.6" />
      {/* Dual rear wheels on cab (steer axle) */}
      <circle cx="22.5" cy="18" r="1.6" />
    </svg>
  );
}
