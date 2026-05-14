/**
 * Parse appointment naive timestamps consistently with the calendar UI
 * (`parseScheduledAtAsLocal` in appointment-calendar.tsx): wall-clock components,
 * no implicit UTC shift for strings without a timezone offset.
 */
export function parseAppointmentWallClock(value: unknown): Date {
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return value;
    return new Date(
      value.getFullYear(),
      value.getMonth(),
      value.getDate(),
      value.getHours(),
      value.getMinutes(),
      value.getSeconds(),
      0,
    );
  }
  if (typeof value !== "string") {
    const d = new Date(value as any);
    return Number.isNaN(d.getTime()) ? d : parseAppointmentWallClock(d);
  }

  const s = value.trim();
  if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}/.test(s)) {
    const [datePart, timePart] = s.split(" ");
    const [y, m, d] = datePart.split("-").map((n) => parseInt(n, 10));
    const [hhStr, mmStr, ssStr] = timePart.split(":");
    const hh = parseInt(hhStr || "0", 10);
    const mm = parseInt(mmStr || "0", 10);
    const ss = parseInt((ssStr || "0").split(".")[0], 10);
    if (![y, m, d, hh, mm, ss].some((n) => Number.isNaN(n))) {
      return new Date(y, (m || 1) - 1, d || 1, hh, mm, ss, 0);
    }
  }

  const isoLike = s.includes("T") && (s.endsWith("Z") || /[+-]\d{2}:\d{2}$/.test(s));
  if (isoLike) {
    const [datePart, timePartRaw] = s.split("T");
    const [y, m, d] = datePart.split("-").map((n) => parseInt(n, 10));
    const timePart = (timePartRaw || "").replace("Z", "").replace(/[+-]\d{2}:\d{2}$/, "");
    const [hhStr, mmStr, ssStr] = timePart.split(":");
    const hh = parseInt(hhStr || "0", 10);
    const mm = parseInt(mmStr || "0", 10);
    const ss = parseInt((ssStr || "0").split(".")[0], 10);
    if (![y, m, d, hh, mm, ss].some((n) => Number.isNaN(n))) {
      return new Date(y, m - 1, d, hh, mm, ss, 0);
    }
  }

  const match = s.match(/^(\d{4})-(\d{2})-(\d{2})[T\s](\d{2}):(\d{2})(?::(\d{2}))?(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})?$/i);
  if (match) {
    const y = parseInt(match[1], 10);
    const m = parseInt(match[2], 10);
    const d = parseInt(match[3], 10);
    const hh = parseInt(match[4], 10);
    const mm = parseInt(match[5], 10);
    const ss = parseInt(match[6] || "0", 10);
    if (![y, m, d, hh, mm, ss].some((n) => Number.isNaN(n))) {
      return new Date(y, m - 1, d, hh, mm, ss, 0);
    }
  }

  const parsed = new Date(s);
  if (!Number.isNaN(parsed.getTime())) {
    return new Date(
      parsed.getFullYear(),
      parsed.getMonth(),
      parsed.getDate(),
      parsed.getHours(),
      parsed.getMinutes(),
      parsed.getSeconds(),
      0,
    );
  }
  return parsed;
}

export function dayBoundsForScheduledInput(scheduledAt: string | Date): { start: Date; end: Date } | null {
  const wall = parseAppointmentWallClock(scheduledAt);
  if (Number.isNaN(wall.getTime())) return null;
  const y = wall.getFullYear();
  const mo = wall.getMonth();
  const d = wall.getDate();
  return {
    start: new Date(y, mo, d, 0, 0, 0, 0),
    end: new Date(y, mo, d, 23, 59, 59, 999),
  };
}
