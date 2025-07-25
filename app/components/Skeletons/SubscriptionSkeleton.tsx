export function SubscriptionSkeleton() {
  return (
    <div className="flex flex-col gap-4 pb-4 mt-3 pr-2">
      {[...Array(1)].map((_, i) => (
        <div
          key={i}
          className="bg-white rounded-lg overflow-hidden shadow-md border border-gray-200 mb-6"
        >
          <div className="p-4 border-b border-gray-200 bg-gray-50">
            <div className="flex items-start">
              <div className="w-16 h-16 bg-gray-200 rounded-sm" />
              <div className="ml-4 grow">
                <h3 className="font-semibold text-gray-800 text-lg h-6 bg-gray-200 rounded w-3/4 mb-2" />
                <p className="text-gray-600 mt-1 h-4 bg-gray-200 rounded w-1/2" />
              </div>
            </div>
          </div>
          <div className="divide-y divide-gray-100">
            {[...Array(3)].map((_, j) => (
              <div className="p-4 hover:bg-gray-50">
                <div className="flex items-start">
                  <div className="w-12 h-12 bg-gray-200 rounded-sm" />
                  <div className="ml-3 grow">
                    <div className="flex justify-between items-start">
                      <div className="h-4 bg-gray-200 rounded w-1/2 mb-1" />
                      <div className="h-4 bg-gray-200 rounded w-1/4" />
                    </div>
                    <p className="text-gray-600 mt-1 h-3 bg-gray-200 rounded w-1/4" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
