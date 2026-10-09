import type { ISODate } from "./types";

const DAY_MS = 24 * 60 * 60 * 1000;

/** Local calendar date as YYYY-MM-DD. */
export function toISODate(date: Date): ISODate {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function isoToUTC(iso: ISODate): number {
  const [y, m, d] = iso.split("-").map(Number);
  return Date.UTC(y, m - 1, d);
}

export function daysBetween(from: ISODate, to: ISODate): number {
  return Math.round((isoToUTC(to) - isoToUTC(from)) / DAY_MS);
}

export function addDays(iso: ISODate, days: number): ISODate {
  return new Date(isoToUTC(iso) + days * DAY_MS).toISOString().slice(0, 10);
}
