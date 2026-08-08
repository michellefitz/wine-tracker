/** Stands in for a bottle photo, drawn rather than emoji so it stays quiet. */
export default function BottlePlaceholder() {
  return (
    <div className="flex h-full w-full items-center justify-center bg-tint">
      <svg
        viewBox="0 0 24 48"
        aria-hidden
        className="h-1/2 w-auto text-rule"
        fill="none"
        stroke="currentColor"
        strokeWidth="1"
        strokeLinejoin="round"
      >
        <path d="M9.5 1h5v11.5c0 1.6 4 4.4 4 8.5v25a1 1 0 0 1-1 1H6.5a1 1 0 0 1-1-1V21c0-4.1 4-6.9 4-8.5V1Z" />
        <path d="M5.5 27h13" />
      </svg>
    </div>
  );
}
