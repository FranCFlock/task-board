import type { ISODate } from "./types";

const DAY_MS = 24 * 60 * 60 * 1000;

/** "Today" is the project's calendar day, not the server's (Vercel runs in UTC). */
export const APP_TIME_ZONE = "America/Argentina/Buenos_Aires";

// en-CA formats dates as YYYY-MM-DD.
const isoInAppZone = new Intl.DateTimeFormat("en-CA", {
  timeZone: APP_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/** Calendar date in APP_TIME_ZONE as YYYY-MM-DD. */
export function todayISO(now: Date = new Date()): ISODate {
  return isoInAppZone.format(now);
}

function isoToUTC(iso: ISODate): number {
  const [y, m, d] = iso.split("-").map(Number);
  return Date.UTC(y, m - 1, d);
}

export function daysBetween(from: ISODate, to: ISODate): number {
  return Math.round((isoToUTC(to) - isoToUTC(from)) / DAY_MS);
}

const dateFormat = new Intl.DateTimeFormat("es-AR", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "UTC",
});

/** e.g. "16 oct 2026" */
export function formatDate(iso: ISODate): string {
  return dateFormat.format(isoToUTC(iso)).replace(/\./g, "");
}

export function addDays(iso: ISODate, days: number): ISODate {
  return new Date(isoToUTC(iso) + days * DAY_MS).toISOString().slice(0, 10);
}
