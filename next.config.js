/**
 * Headers that apply to every response.
 *
 * Deliberately does NOT include Content-Security-Policy — see the note in
 * README/TODO. CSP needs an allowlist derived from what the app actually loads
 * (Clerk, MusicKit JS, Spotify's CDN, the embed iframes), and a wrong one fails
 * closed by breaking the page rather than failing open. It's worth deriving
 * from real report-only data rather than guessing.
 */
const securityHeaders = [
  // Nothing here is meant to be framed. Blocks clickjacking outright.
  { key: "X-Frame-Options", value: "DENY" },
  // Stop browsers from MIME-sniffing a response into something executable.
  { key: "X-Content-Type-Options", value: "nosniff" },
  // Send the origin to other sites, the full URL only to ourselves — playlist
  // and user ids live in our paths and don't belong in third-party Referers.
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // Features this app never uses. Revoked so an injected script can't reach
  // for them either.
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), interest-cohort=()",
  },
];

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Type errors now fail the build. They were suppressed, which is how a dead
  // preview feature calling undefined functions, a crash on closing the settings
  // modal, and two unread sync settings all survived unnoticed.
  allowedDevOrigins: [
    "localhost:3000",
    "local-origin.dev",
    "*.local-origin.dev",
  ],
  images: {
    formats: ["image/avif", "image/webp"],
    // Cover art hosts, so <Image> can be used for the grids later without a
    // config change.
    remotePatterns: [
      { protocol: "https", hostname: "**.scdn.co" },
      { protocol: "https", hostname: "**.spotifycdn.com" },
      { protocol: "https", hostname: "**.mzstatic.com" },
    ],
  },
  headers: async () => [{ source: "/:path*", headers: securityHeaders }],
  webpack: (config) => {
    config.resolve.extensionAlias = {
      ".js": [".ts", ".tsx", ".js", ".jsx"],
      ".jsx": [".tsx", ".jsx"],
    };
    return config;
  },
};

export default nextConfig;
