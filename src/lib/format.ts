const TIME_ZONE = "Asia/Ho_Chi_Minh";
const LOCALE = "vi-VN";

const dateTimeFormatter = new Intl.DateTimeFormat(LOCALE, {
  timeZone: TIME_ZONE,
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

const dateFormatter = new Intl.DateTimeFormat(LOCALE, {
  timeZone: TIME_ZONE,
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

const relativeFormatter = new Intl.RelativeTimeFormat(LOCALE, {
  numeric: "auto",
});

export function formatDateTime(iso: string): string {
  return dateTimeFormatter.format(new Date(iso));
}

export function formatDate(iso: string): string {
  return dateFormatter.format(new Date(iso));
}

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

/** "3 ngày trước", "trong 2 giờ nữa". Server-rendered only. */
export function formatRelative(iso: string, now: number = Date.now()): string {
  const delta = new Date(iso).getTime() - now;
  const abs = Math.abs(delta);

  if (abs < HOUR) {
    return relativeFormatter.format(Math.round(delta / MINUTE), "minute");
  }
  if (abs < DAY) {
    return relativeFormatter.format(Math.round(delta / HOUR), "hour");
  }
  return relativeFormatter.format(Math.round(delta / DAY), "day");
}

export function isOverdue(iso: string, now: number = Date.now()): boolean {
  return new Date(iso).getTime() < now;
}

/** 8.5 -> "8.5", 9 -> "9", null -> "—" */
export function formatScore(score: number | null | undefined): string {
  if (score === null || score === undefined) return "—";
  return String(Number(score));
}

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 0) return "?";
  const last = parts[parts.length - 1] ?? "";
  const first = parts.length > 1 ? (parts[parts.length - 2] ?? "") : "";
  return `${first.charAt(0)}${last.charAt(0)}`.toUpperCase() || "?";
}

/**
 * `<input type="datetime-local">` yields a naive "2026-08-30T15:00". The whole
 * app reads and writes school time, so that is what we anchor it to — Vietnam
 * has no DST, which makes the fixed offset exact rather than approximate.
 */
export const VN_UTC_OFFSET = "+07:00";

export function localInputToIso(value: string): string | null {
  const match = /^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2})(:\d{2})?$/.exec(value.trim());
  if (!match) return null;

  const date = new Date(`${match[1]}T${match[2]}${match[3] ?? ":00"}${VN_UTC_OFFSET}`);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

const inputFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

/** Inverse of the above, for pre-filling a datetime-local input. */
export function isoToLocalInput(iso: string): string {
  const parts = inputFormatter.formatToParts(new Date(iso));
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")}T${get("hour")}:${get("minute")}`;
}
