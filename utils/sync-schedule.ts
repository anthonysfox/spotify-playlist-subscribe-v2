import { addDays, addMonths, addWeeks } from "date-fns";

type SyncScheduleOptions = {
  timeZone?: string | null;
  customDays?: string[] | string | null;
  customTime?: string | null;
};

type ZonedParts = {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
};

function normalizeTimeZone(timeZone?: string | null) {
  return timeZone && timeZone.trim() ? timeZone : "UTC";
}

function getZonedDateParts(date: Date, timeZone: string): ZonedParts {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
  const parts = formatter.formatToParts(date);
  const get = (type: string) =>
    Number(parts.find((part) => part.type === type)?.value || 0);

  return {
    year: get("year"),
    month: get("month"),
    day: get("day"),
    hour: get("hour"),
    minute: get("minute"),
    second: get("second"),
  };
}

function getTimeZoneOffset(date: Date, timeZone: string) {
  const parts = getZonedDateParts(date, timeZone);
  const asUtc = Date.UTC(
    parts.year,
    parts.month - 1,
    parts.day,
    parts.hour,
    parts.minute,
    parts.second
  );
  return asUtc - date.getTime();
}

function zonedTimeToUtcDate(parts: ZonedParts, timeZone: string) {
  const utcGuess = Date.UTC(
    parts.year,
    parts.month - 1,
    parts.day,
    parts.hour,
    parts.minute,
    parts.second
  );
  const offset = getTimeZoneOffset(new Date(utcGuess), timeZone);
  return new Date(utcGuess - offset);
}

function getLocalMidnightBase(now: Date, timeZone: string) {
  const parts = getZonedDateParts(now, timeZone);
  return new Date(Date.UTC(parts.year, parts.month - 1, parts.day, 0, 0, 0));
}

function normalizeCustomDays(days?: string[] | string | null) {
  if (!days) return null;
  if (Array.isArray(days)) return days;
  if (typeof days === "string") {
    const trimmed = days.trim();
    if (!trimmed) return null;
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) return parsed;
    } catch {
      return trimmed.split(",").map((day) => day.trim()).filter(Boolean);
    }
    return null;
  }
  return null;
}

export function calculateNextCustomRun(
  days: string[] | string | null | undefined,
  time: string | null | undefined,
  timeZone?: string | null
) {
  const normalizedDays = normalizeCustomDays(days);
  if (!normalizedDays?.length) return null;

  const zone = normalizeTimeZone(timeZone);
  const [hours, minutes] = (time || "00:00").split(":").map(Number);
  const now = new Date();

  const dayMap: { [key: string]: number } = {
    sunday: 0,
    monday: 1,
    tuesday: 2,
    wednesday: 3,
    thursday: 4,
    friday: 5,
    saturday: 6,
  };

  const targetDays = normalizedDays
    .map((day) => dayMap[day.toLowerCase()])
    .filter((day) => day !== undefined);

  if (!targetDays.length) return null;

  const localMidnight = getLocalMidnightBase(now, zone);

  for (let i = 0; i <= 7; i += 1) {
    const candidateLocalDate = addDays(localMidnight, i);
    const dayOfWeek = candidateLocalDate.getUTCDay();

    if (!targetDays.includes(dayOfWeek)) continue;

    const candidateUtc = zonedTimeToUtcDate(
      {
        year: candidateLocalDate.getUTCFullYear(),
        month: candidateLocalDate.getUTCMonth() + 1,
        day: candidateLocalDate.getUTCDate(),
        hour: Number.isFinite(hours) ? hours : 0,
        minute: Number.isFinite(minutes) ? minutes : 0,
        second: 0,
      },
      zone
    );

    if (candidateUtc <= now) continue;

    return candidateUtc;
  }

  return null;
}

export function calculateNextSyncTime(
  syncFrequency: string,
  options: SyncScheduleOptions = {}
) {
  const zone = normalizeTimeZone(options.timeZone);

  if (syncFrequency === "CUSTOM") {
    return calculateNextCustomRun(
      options.customDays,
      options.customTime,
      zone
    );
  }

  const now = new Date();
  const localMidnight = getLocalMidnightBase(now, zone);
  let nextLocal: Date;

  switch (syncFrequency) {
    case "DAILY":
      nextLocal = addDays(localMidnight, 1);
      break;
    case "WEEKLY":
      nextLocal = addWeeks(localMidnight, 1);
      break;
    case "MONTHLY":
      nextLocal = addMonths(localMidnight, 1);
      break;
    default:
      nextLocal = addWeeks(localMidnight, 1);
  }

  return zonedTimeToUtcDate(
    {
      year: nextLocal.getUTCFullYear(),
      month: nextLocal.getUTCMonth() + 1,
      day: nextLocal.getUTCDate(),
      hour: 0,
      minute: 0,
      second: 0,
    },
    zone
  );
}
