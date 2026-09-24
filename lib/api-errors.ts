/**
 * Error detail that is safe to put in a response body.
 *
 * Locally the underlying message is exactly what you want in the network tab.
 * In production it leaks internals: Prisma names columns and constraints in its
 * messages, and Spotify's error bodies were being passed through verbatim. The
 * detail is dropped there — the `console.error` at each call site still keeps
 * the full thing in the server logs, which is where it belongs.
 *
 * Spread it into the JSON body:
 *
 *   return NextResponse.json(
 *     { error: "Failed to refresh metadata", ...debugDetails(error) },
 *     { status: 500 },
 *   );
 *
 * Note this is for *internal* faults. Validation feedback about the caller's
 * own request (a zod issue list, say) isn't sensitive and should be returned
 * unconditionally — the caller needs it to fix their request.
 */
export function debugDetails(detail: unknown): { details?: unknown } {
  if (process.env.NODE_ENV === "production") return {};

  return { details: detail instanceof Error ? detail.message : detail };
}
