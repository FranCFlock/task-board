import { describe, expect, it } from "vitest";
import { addDays, daysBetween, formatDate, todayISO } from "./dates";

describe("todayISO", () => {
  it("uses the Argentina calendar day, not the UTC one", () => {
    // Argentina is UTC-3 all year (no daylight saving).
    expect(todayISO(new Date("2026-10-10T02:59:00Z"))).toBe("2026-10-09");
    expect(todayISO(new Date("2026-10-10T03:00:00Z"))).toBe("2026-10-10");
  });

  it("rolls the year back around midnight UTC on New Year's Eve", () => {
    expect(todayISO(new Date("2027-01-01T02:00:00Z"))).toBe("2026-12-31");
    expect(todayISO(new Date("2027-01-01T03:00:00Z"))).toBe("2027-01-01");
  });

  it("returns YYYY-MM-DD", () => {
    expect(todayISO(new Date("2026-03-05T15:00:00Z"))).toBe("2026-03-05");
  });
});

describe("daysBetween", () => {
  it("is 0 for the same day", () => {
    expect(daysBetween("2026-10-09", "2026-10-09")).toBe(0);
  });

  it("counts forward and backward", () => {
    expect(daysBetween("2026-10-09", "2026-10-16")).toBe(7);
    expect(daysBetween("2026-10-16", "2026-10-09")).toBe(-7);
  });

  it("crosses month and year boundaries", () => {
    expect(daysBetween("2026-10-30", "2026-11-02")).toBe(3);
    expect(daysBetween("2026-12-30", "2027-01-02")).toBe(3);
  });

  it("handles leap days", () => {
    expect(daysBetween("2028-02-28", "2028-03-01")).toBe(2);
    expect(daysBetween("2027-02-28", "2027-03-01")).toBe(1);
  });
});

describe("addDays", () => {
  it("adds and subtracts days", () => {
    expect(addDays("2026-10-09", 7)).toBe("2026-10-16");
    expect(addDays("2026-10-09", -14)).toBe("2026-09-25");
    expect(addDays("2026-10-09", 0)).toBe("2026-10-09");
  });

  it("crosses month and year boundaries", () => {
    expect(addDays("2026-10-30", 3)).toBe("2026-11-02");
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
    expect(addDays("2027-01-01", -1)).toBe("2026-12-31");
  });

  it("is the inverse of daysBetween", () => {
    for (const n of [-400, -31, -1, 0, 1, 28, 365]) {
      expect(daysBetween("2026-10-09", addDays("2026-10-09", n))).toBe(n);
    }
  });
});

describe("formatDate", () => {
  it("formats in Spanish without dots", () => {
    expect(formatDate("2026-10-16")).toBe("16 de oct de 2026");
    expect(formatDate("2026-09-04")).not.toContain(".");
  });

  it("does not shift the day with the time zone", () => {
    expect(formatDate("2026-01-01")).toBe("1 de ene de 2026");
    expect(formatDate("2026-12-31")).toBe("31 de dic de 2026");
  });
});
