"use client";

import { useEffect, useState } from "react";

const FEATURES = [
  {
    title: "Auto-Sync",
    description: "Fresh tracks on your schedule — daily, weekly, or monthly.",
    path: "M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z",
  },
  {
    title: "Smart Discovery",
    description: "New music from the artists and playlists you love.",
    path: "M12.395 2.553a1 1 0 00-1.45-.385c-.345.23-.614.558-.822.88-.214.33-.403.713-.57 1.116-.334.804-.614 1.768-.84 2.734a31.365 31.365 0 00-.613 3.58 2.64 2.64 0 01-.945-1.067c-.328-.68-.398-1.534-.398-2.654A1 1 0 005.05 6.05 6.981 6.981 0 003 11a7 7 0 1011.95-4.95c-.592-.591-.98-.985-1.348-1.467-.363-.476-.724-1.063-1.207-2.03zM12.12 15.12A3 3 0 017 13s.879.5 2.5.5c0-1 .5-4 1.25-4.5.5 1 .786 1.293 1.371 1.879A2.99 2.99 0 0113 13a2.99 2.99 0 01-.879 2.121z",
  },
  {
    title: "One Place",
    description: "Every subscription, both services, one dashboard.",
    path: "M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z",
  },
];

const ROW_HEIGHT = 68; // px — must match each row's height and the translate step
const INTERVAL = 2600; // ms a feature stays before rolling
const DURATION = 600; // ms the roll animation takes

/**
 * An auto-rotating "reel" of features — one shows, rolls up to the next, loops.
 *
 * Smoothness comes from three rules: only `transform` animates (no height/reflow),
 * every row is a fixed height, and the list has the first item duplicated at the
 * end so the wrap-around rolls *forward* to that copy, then snaps back to index 0
 * with animation off — no visible rewind.
 */
export const RotatingFeatures = () => {
  const rows = [...FEATURES, FEATURES[0]];
  const [index, setIndex] = useState(0);
  const [animate, setAnimate] = useState(true);

  // Advance on a timer.
  useEffect(() => {
    const id = setInterval(() => setIndex((i) => i + 1), INTERVAL);
    return () => clearInterval(id);
  }, []);

  // Landed on the duplicated first row → after the roll finishes, jump back to
  // the real first row with the animation disabled so the reset is invisible.
  useEffect(() => {
    if (index !== FEATURES.length) return;
    const t = setTimeout(() => {
      setAnimate(false);
      setIndex(0);
    }, DURATION);
    return () => clearTimeout(t);
  }, [index]);

  // Re-enable the animation a frame after the silent snap.
  useEffect(() => {
    if (animate) return;
    const raf = requestAnimationFrame(() =>
      requestAnimationFrame(() => setAnimate(true)),
    );
    return () => cancelAnimationFrame(raf);
  }, [animate]);

  return (
    <div
      className="relative overflow-hidden rounded-2xl bg-white/70 ring-1 ring-black/5 backdrop-blur shadow-sm"
      style={{ height: ROW_HEIGHT }}
    >
      <div
        className="will-change-transform"
        style={{
          transform: `translateY(-${index * ROW_HEIGHT}px)`,
          transition: animate
            ? `transform ${DURATION}ms cubic-bezier(0.22, 1, 0.36, 1)`
            : "none",
        }}
      >
        {rows.map((feature, i) => (
          <div
            key={i}
            className="flex items-center gap-3 px-4 text-left"
            style={{ height: ROW_HEIGHT }}
          >
            <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-[#CC5500] to-[#A0522D] shadow-sm">
              <svg
                className="h-5 w-5 text-white"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path fillRule="evenodd" d={feature.path} clipRule="evenodd" />
              </svg>
            </div>
            <div>
              <h3 className="text-sm font-semibold leading-tight text-gray-900">
                {feature.title}
              </h3>
              <p className="mt-0.5 text-xs leading-snug text-gray-500">
                {feature.description}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
