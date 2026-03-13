type TableSkeletonProps = {
  rows?: number;
  columns?: number;
};

export default function TableSkeleton({ rows = 5, columns = 4 }: TableSkeletonProps) {
  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="animate-pulse p-4">
        {Array.from({ length: rows }).map((_, rowIndex) => (
          <div key={`row-${rowIndex}`} className="mb-3 grid grid-cols-1 gap-3 md:grid-cols-4">
            {Array.from({ length: columns }).map((_, colIndex) => (
              <div key={`col-${rowIndex}-${colIndex}`} className="h-4 rounded bg-slate-200" />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
