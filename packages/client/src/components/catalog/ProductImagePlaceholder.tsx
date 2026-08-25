export function ProductImagePlaceholder() {
  return (
    <div className="flex h-full w-full items-center justify-center bg-muted">
      <svg viewBox="0 0 24 24" fill="none" className="h-10 w-10 text-muted-foreground" aria-hidden="true">
        <path
          d="M12 21s-7-4.5-7-11a7 7 0 0 1 14 0c0 6.5-7 11-7 11Z"
          stroke="currentColor"
          strokeWidth="1.4"
          strokeLinejoin="round"
        />
        <path d="M12 17V8" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
        <path d="M12 12c0 0 3.2-1 3.2-4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      </svg>
    </div>
  );
}
