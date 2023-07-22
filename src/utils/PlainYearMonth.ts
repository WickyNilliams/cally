import { PlainDate } from "./PlainDate.js";
import { compare } from "./utils.js";

type Duration = { months?: number; years?: number };
type CompareResult = -1 | 0 | 1;

function durationToMonths(duration: Duration): number {
  return (duration.months ?? 0) + (duration.years ?? 0) * 12;
}

function addMonths(yearMonth: PlainYearMonth, months: number) {
  const date = yearMonth.toDate();
  date.setUTCMonth(date.getUTCMonth() + months);
  return new PlainYearMonth(date.getUTCFullYear(), date.getUTCMonth() + 1);
}

export class PlainYearMonth {
  constructor(
    public readonly year: number,
    public readonly month: number
  ) {}

  add(duration: Duration) {
    return addMonths(this, durationToMonths(duration));
  }

  subtract(duration: Duration) {
    return addMonths(this, -durationToMonths(duration));
  }

  toDate() {
    return new Date(Date.UTC(this.year, this.month - 1, 1));
  }

  equals(date: { year: number; month: number }) {
    return this.year === date.year && this.month === date.month;
  }

  toPlainDate() {
    return new PlainDate(this.year, this.month, 1);
  }

  static compare(
    one: PlainYearMonth | PlainDate,
    two: PlainYearMonth | PlainDate
  ): CompareResult {
    const oneYearMonth =
      one instanceof PlainDate ? one.toPlainYearMonth() : one;
    const twoYearMonth =
      two instanceof PlainDate ? two.toPlainYearMonth() : two;
    return compare(oneYearMonth.toDate(), twoYearMonth.toDate());
  }
}
