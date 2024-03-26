import { endOfMonth, clamp, compare } from "./date.js";

type Duration = { months: number } | { years: number } | { days: number };
type CompareResult = -1 | 0 | 1;

const ISO_DATE = /^(\d{4})-(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[0-1])$/;

const YEARS = "years";
const MONTHS = "months";
const DAYS = "days";

function negate(duration: Duration): Duration {
  if (YEARS in duration) return { years: -duration.years };
  if (MONTHS in duration) return { months: -duration.months };
  if (DAYS in duration) return { days: -duration.days };

  throw new TypeError();
}

function setDay(date: PlainDate, day: number): PlainDate {
  return PlainDate.from(new Date(Date.UTC(date.year, date.month - 1, day)));
}

// ensures date arithmetic is constrained
// e.g. add 1 year to 29th Feb -> 28th Feb
function setYear(plainDate: PlainDate, year: number): PlainDate {
  const min = new PlainDate(year, plainDate.month, 1);
  const max = endOfMonth(min);

  const date = plainDate.toDate();
  date.setUTCFullYear(year);

  return clamp(PlainDate.from(date), min, max);
}

// ensures date arithmetic is constrained
// e.g. add 1 month to 31st March -> 30th April
function setMonth(plainDate: PlainDate, month: number): PlainDate {
  const min = new PlainDate(plainDate.year, month, 1);
  const max = endOfMonth(min);

  const date = plainDate.toDate();
  date.setUTCMonth(month - 1);

  return clamp(PlainDate.from(date), min, max);
}

// this is an incomplete implementation that only handles arithmetic on a single unit at a time.
// i didn't want to get into more complex arithmetic since it get tricky fast
// this is enough to serve my needs and will still be a drop-in replacement when actual Temporal API lands
function addDuration(plainDate: PlainDate, duration: Duration): PlainDate {
  if (DAYS in duration) {
    return setDay(plainDate, plainDate.day + duration.days);
  }

  if (MONTHS in duration) {
    return setMonth(plainDate, plainDate.month + duration.months);
  }

  if (YEARS in duration) {
    return setYear(plainDate, plainDate.year + duration.years);
  }

  return plainDate;
}

const padZero = (value: number, length: number) =>
  value.toString().padStart(length, "0");

export class PlainDate {
  constructor(
    public readonly year: number,
    public readonly month: number,
    public readonly day: number
  ) {}

  add(duration: Duration): PlainDate {
    return addDuration(this, duration);
  }

  subtract(duration: Duration): PlainDate {
    return addDuration(this, negate(duration));
  }

  toString(): string {
    const { month, year, day } = this;
    return `${padZero(year, 4)}-${padZero(month, 2)}-${padZero(day, 2)}`;
  }

  toDate(): Date {
    return new Date(Date.UTC(this.year, this.month - 1, this.day, 0, 0, 0));
  }

  toPlainYearMonth() {
    return new PlainYearMonth(this.year, this.month);
  }

  equals(date: { year: number; month: number; day: number }): boolean {
    return (
      this.year === date.year &&
      this.month === date.month &&
      this.day === date.day
    );
  }

  static compare(one: PlainDate, two: PlainDate): CompareResult {
    return compare(one.toDate(), two.toDate());
  }

  static from(item: string | Date): PlainDate {
    return typeof item === "string"
      ? PlainDate.fromString(item)
      : PlainDate.fromDate(item);
  }

  private static fromString(str: string): PlainDate {
    const match = str.match(ISO_DATE);

    if (!match) {
      throw new TypeError(str);
    }

    const [, year, month, day] = match;
    return new PlainDate(
      parseInt(year!, 10),
      parseInt(month!, 10),
      parseInt(day!, 10)
    );
  }

  private static fromDate(date: Date): PlainDate {
    return new PlainDate(
      date.getUTCFullYear(),
      date.getUTCMonth() + 1,
      date.getUTCDate()
    );
  }
}

type YearMonthDuration = { months?: number; years?: number };

function durationToMonths(duration: YearMonthDuration): number {
  return (duration.months ?? 0) + (duration.years ?? 0) * 12;
}

function addMonths(yearMonth: PlainYearMonth, months: number): PlainYearMonth {
  const date = yearMonth.toDate();
  date.setUTCMonth(date.getUTCMonth() + months);
  return new PlainYearMonth(date.getUTCFullYear(), date.getUTCMonth() + 1);
}

export class PlainYearMonth {
  constructor(
    public readonly year: number,
    public readonly month: number
  ) {}

  add(duration: YearMonthDuration) {
    return addMonths(this, durationToMonths(duration));
  }

  subtract(duration: YearMonthDuration) {
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
