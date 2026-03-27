/**
 * Info-in-circle icon for duty/formula tooltips (thin circle + "i" with dot).
 */
export function DutyFormulaInfoIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width="18"
      height="18"
      viewBox="0 0 18 18"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <circle cx="9" cy="9" r="7" stroke="currentColor" strokeWidth="1.15" />
      <circle cx="9" cy="5.35" r="0.85" fill="currentColor" />
      <path
        d="M9 7.5v5.25"
        stroke="currentColor"
        strokeWidth="1.15"
        strokeLinecap="round"
      />
    </svg>
  );
}
