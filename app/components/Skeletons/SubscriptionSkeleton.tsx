export function SubscriptionSkeleton() {
  return (
    <div className="grow overflow-auto p-6">
      <div className="mb-6 h-8 w-48 animate-pulse rounded bg-gray-200" />
      <div className="grid gap-6">
        {[...Array(1)].map((_, i) => (
          <div
            key={i}
            className="animate-pulse overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-lg"
          >
            <div className="border-b border-gray-200 bg-gradient-to-r from-slate-50 to-gray-50 p-6">
              <div className="mb-4 flex items-center">
                <div className="relative">
                  <div className="h-16 w-16 rounded-xl bg-gray-200" />
                  <div className="absolute -right-1 -bottom-1 h-6 w-6 rounded-full bg-gray-200" />
                </div>
                <div className="ml-4 flex-1">
                  <div className="mb-2 h-6 w-3/4 rounded bg-gray-200" />
                  <div className="h-4 w-1/2 rounded bg-gray-200" />
                </div>
              </div>

              <div className="flex flex-wrap gap-3">
                <div className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 shadow-sm">
                  <div className="h-2 w-2 rounded-full bg-gray-200" />
                  <div className="h-4 w-16 rounded bg-gray-200" />
                </div>
                <div className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 shadow-sm">
                  <div className="h-2 w-2 rounded-full bg-gray-200" />
                  <div className="h-4 w-12 rounded bg-gray-200" />
                </div>
                <div className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 shadow-sm">
                  <div className="h-2 w-2 rounded-full bg-gray-200" />
                  <div className="h-4 w-20 rounded bg-gray-200" />
                </div>
              </div>
            </div>

            <div className="p-6">
              <div className="mb-4 h-4 w-32 rounded bg-gray-200" />
              <div className="space-y-3">
                {[...Array(2)].map((_, j) => (
                  <div
                    key={j}
                    className="flex items-center justify-between rounded-xl border border-gray-100 bg-gradient-to-r from-gray-50 to-slate-50 p-4"
                  >
                    <div className="flex flex-1 items-center">
                      <div className="h-12 w-12 rounded-lg bg-gray-200" />
                      <div className="ml-4 flex-1">
                        <div className="mb-1 h-5 w-3/4 rounded bg-gray-200" />
                        <div className="h-4 w-2/3 rounded bg-gray-200" />
                      </div>
                    </div>
                    <div className="ml-4 h-8 w-20 rounded-lg bg-gray-200 px-4 py-2" />
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
