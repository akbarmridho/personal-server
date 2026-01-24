export function ThreadListSkeleton() {
  return (
    <>
      {Array.from({ length: 5 }, (_, i) => (
        <div
          key={i}
          role="status"
          aria-label="Loading threads"
          aria-live="polite"
          className="flex items-center gap-2 rounded-md px-3 py-2"
        >
          <div className="h-[22px] grow bg-muted animate-pulse rounded" />
        </div>
      ))}
    </>
  );
}
