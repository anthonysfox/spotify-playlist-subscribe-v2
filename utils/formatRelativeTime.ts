/**
 * Formats a date relative to now ("in 3 days", "2 hours ago"), in the
 * viewer's own local timezone — falls back to a localized date+time once the
 * gap is large enough that relative phrasing stops being useful.
 */
export function formatRelativeTime(
  value: string | Date | null | undefined,
  { fallbackAfterDays = 30 }: { fallbackAfterDays?: number } = {},
): string | null {
  if (!value) return null;

  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return null;

  const diffMs = date.getTime() - Date.now();
  const diffDays = diffMs / (1000 * 60 * 60 * 24);

  if (Math.abs(diffDays) > fallbackAfterDays) {
    return date.toLocaleString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  }

  const rtf = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
  const diffHours = diffMs / (1000 * 60 * 60);

  if (Math.abs(diffHours) < 1) {
    return rtf.format(Math.round(diffMs / (1000 * 60)), "minute");
  }
  if (Math.abs(diffHours) < 24) {
    return rtf.format(Math.round(diffHours), "hour");
  }
  return rtf.format(Math.round(diffDays), "day");
}
