import { PlainYearMonth } from "../utils/temporal.js";

export type Pagination = "single" | "months";

export interface CalendarFocusOptions extends FocusOptions {
  target?: "day" | "next" | "previous";
}

export function diffInMonths(a: { year: number; month: number }, b: { year: number; month: number }): number {
  return (b.year - a.year) * 12 + b.month - a.month;
}

export function createPage(
  start: PlainYearMonth,
  months: number,
  pageBy: Pagination = "months"
) {
  if (months === 12 && pageBy !== "single") {
    start = new PlainYearMonth(start.year, 1);
  }
  return {
    start,
    end: start.add({ months: months - 1 }),
  };
}
