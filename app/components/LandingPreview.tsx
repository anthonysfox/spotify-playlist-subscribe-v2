import { Bell, Music, Clock, Calendar } from "lucide-react";

const SOURCES = [
  { name: "Lo-Fi Beats to Study To", color: "from-indigo-400 to-purple-400" },
  { name: "Indie Folk Mornings", color: "from-amber-400 to-orange-400" },
  { name: "Deep Focus", color: "from-teal-400 to-cyan-400" },
];

/**
 * An illustrative preview of the dashboard for the landing page — not a
 * literal screenshot (there's no demo account to capture one from). Built
 * from the same card styling as the real Subscriptions tab, with example
 * data instead of a live account, so it's an honest representation of the
 * actual product rather than a generic mockup.
 */
export function LandingPreview() {
  return (
    <div className="w-full max-w-md overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
      <div className="border-b border-gray-200 bg-gray-50 p-5">
        <div className="flex items-center gap-3">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#CC5500] to-[#A0522D]">
            <Music className="h-6 w-6 text-white" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h3 className="truncate font-bold text-gray-900">
                Rainy Day Focus
              </h3>
              <span className="shrink-0 rounded-full border border-green-200 bg-green-50 px-2 py-0.5 text-[10px] font-medium text-green-700">
                Spotify
              </span>
            </div>
            <p className="text-sm text-gray-600">
              Auto-collecting from 3 sources
            </p>
          </div>
        </div>
        <div className="mt-3 flex flex-wrap gap-2 text-xs">
          <span className="flex items-center gap-1 rounded-lg border border-gray-200 bg-white px-2.5 py-1 font-medium text-gray-700">
            <Clock className="h-3 w-3 text-gray-400" /> Weekly
          </span>
          <span className="flex items-center gap-1 rounded-lg border border-gray-200 bg-white px-2.5 py-1 font-medium text-gray-700">
            <Calendar className="h-3 w-3 text-gray-400" /> Next: in 3 days
          </span>
          <span className="flex items-center gap-1 rounded-lg border border-gray-200 bg-white px-2.5 py-1 font-medium text-gray-700">
            <Bell className="h-3 w-3 text-gray-400" /> Synced 2 hours ago
          </span>
        </div>
      </div>
      <div className="space-y-2 p-5">
        {SOURCES.map((source) => (
          <div
            key={source.name}
            className="flex items-center gap-3 rounded-lg border border-gray-100 bg-gray-50 p-2.5"
          >
            <div
              className={`h-9 w-9 shrink-0 rounded-md bg-gradient-to-br ${source.color}`}
            />
            <span className="truncate text-sm font-medium text-gray-800">
              {source.name}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
