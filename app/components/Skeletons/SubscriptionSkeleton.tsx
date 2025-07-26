export function SubscriptionSkeleton() {
  return (
    <div className="grow overflow-auto p-6">
      <div className="h-8 bg-gray-200 rounded w-48 mb-6 animate-pulse" />
      <div className="grid gap-6">
        {[...Array(1)].map((_, i) => (
          <div
            key={i}
            className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden animate-pulse"
          >
            <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-slate-50 to-gray-50">
              <div className="flex items-center mb-4">
                <div className="relative">
                  <div className="w-16 h-16 bg-gray-200 rounded-xl" />
                  <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-gray-200 rounded-full" />
                </div>
                <div className="ml-4 flex-1">
                  <div className="h-6 bg-gray-200 rounded w-3/4 mb-2" />
                  <div className="h-4 bg-gray-200 rounded w-1/2" />
                </div>
              </div>

              <div className="flex flex-wrap gap-3">
                <div className="flex items-center gap-2 px-3 py-2 bg-white rounded-lg shadow-sm border border-gray-200">
                  <div className="w-2 h-2 bg-gray-200 rounded-full" />
                  <div className="h-4 bg-gray-200 rounded w-16" />
                </div>
                <div className="flex items-center gap-2 px-3 py-2 bg-white rounded-lg shadow-sm border border-gray-200">
                  <div className="w-2 h-2 bg-gray-200 rounded-full" />
                  <div className="h-4 bg-gray-200 rounded w-12" />
                </div>
                <div className="flex items-center gap-2 px-3 py-2 bg-white rounded-lg shadow-sm border border-gray-200">
                  <div className="w-2 h-2 bg-gray-200 rounded-full" />
                  <div className="h-4 bg-gray-200 rounded w-20" />
                </div>
              </div>
            </div>

            <div className="p-6">
              <div className="h-4 bg-gray-200 rounded w-32 mb-4" />
              <div className="space-y-3">
                {[...Array(2)].map((_, j) => (
                  <div
                    key={j}
                    className="flex items-center justify-between p-4 bg-gradient-to-r from-gray-50 to-slate-50 rounded-xl border border-gray-100"
                  >
                    <div className="flex items-center flex-1">
                      <div className="w-12 h-12 bg-gray-200 rounded-lg" />
                      <div className="ml-4 flex-1">
                        <div className="h-5 bg-gray-200 rounded w-3/4 mb-1" />
                        <div className="h-4 bg-gray-200 rounded w-2/3" />
                      </div>
                    </div>
                    <div className="ml-4 px-4 py-2 bg-gray-200 rounded-lg h-8 w-20" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
