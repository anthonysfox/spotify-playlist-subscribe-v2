export function PlaylistSkeleton() {
  return (
    <div className="flex flex-col gap-4 pb-4 mt-3 pr-2">
      {[...Array(4)].map((_, i) => (
        <div
          key={i}
          className="bg-white rounded-lg overflow-hidden shadow-md border border-gray-200 animate-pulse flex flex-col sm:flex-row"
        >
          <div className="w-full h-32 sm:w-20 sm:h-20 bg-gray-200 object-cover" />
          <div className="flex flex-col sm:flex-row grow">
            <div className="p-3 sm:p-4 grow min-w-0">
              <div className="h-4 bg-gray-200 rounded w-3/4 mb-2" />
              <div className="h-3 bg-gray-200 rounded w-1/2 mb-2" />
              <div className="h-3 bg-gray-200 rounded w-1/3" />
            </div>
            <div className="p-3 sm:p-4 self-center shrink-0 flex flex-col gap-2 w-full sm:w-auto">
              <div className="h-8 bg-gray-200 rounded-full w-full sm:w-24" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
