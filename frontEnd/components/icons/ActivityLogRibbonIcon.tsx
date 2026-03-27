/**
 * History / activity log icon for shipment ribbon trigger (list + clock motif).
 */
export function ActivityLogRibbonIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <path
        d="M8 6h13M8 12h13M8 18h10"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
      <circle cx="4" cy="6" r="1.35" fill="currentColor" />
      <circle cx="4" cy="12" r="1.35" fill="currentColor" />
      <circle cx="4" cy="18" r="1.35" fill="currentColor" />
      <path
        d="M17 3v4l2.5 1.25"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.85"
      />
    </svg>
  );
}
