import { endOfMonth, clamp, toDate } from "./date.js";

type Duration = { months: number } | { years: number } | { days: number };
type CompareResult = -1 | 0 | 1;

const ISO_DATE = /^(\d{4})-(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[0-1])$/;

const padZero = (value: number, length: number) =>
  value.toString().padStart(length, "0");

export class PlainDate {
  constructor(
    public readonly year: number,
    public readonly month: number,
    public readonly day: number
  ) {}

  // this is an incomplete implementation that only handles arithmetic on a single unit at a time.
  // i didn't want to get into more complex arithmetic since it get tricky fast
  // this is enough to serve my needs and will still be a drop-in replacement when actual Temporal API lands
  add(duration: Duration): PlainDate {
    const date = toDate(this);

    if ("days" in duration) {
      date.setUTCDate(this.day + duration.days);
      return PlainDate.from(date);
    }

    // let min: PlainDate;
    let { year, month } = this;

    // ensures date arithmetic is constrained
    // e.g. add 1 month to 31st March -> 30th April
    if ("months" in duration) {
      month = this.month + duration.months;
      date.setUTCMonth(month - 1);
    }
    // ensures date arithmetic is constrained
    // e.g. add 1 year to 29th Feb -> 28th Feb
    else {
      year = this.year + duration.years;
      date.setUTCFullYear(year);
    }

    const min = PlainDate.from(toDate({ year, month, day: 1 }));
    return clamp(PlainDate.from(date), min, endOfMonth(min));
  }

  toString(): string {
    return `${padZero(this.year, 4)}-${padZero(this.month, 2)}-${padZero(this.day, 2)}`;
  }

  toPlainYearMonth() {
    return new PlainYearMonth(this.year, this.month);
  }

  equals(date: PlainDate): boolean {
    return PlainDate.compare(this, date) === 0;
  }

  static compare(a: PlainDate, b: PlainDate): CompareResult {
    if (a.year < b.year) return -1;
    if (a.year > b.year) return 1;
    if (a.month < b.month) return -1;
    if (a.month > b.month) return 1;
    if (a.day < b.day) return -1;
    if (a.day > b.day) return 1;
    return 0;
  }

  static from(value: string | Date): PlainDate {
    if (typeof value === "string") {
      const match = value.match(ISO_DATE);

      if (!match) {
        throw new TypeError(value);
      }

      const [, year, month, day] = match;
      return new PlainDate(
        parseInt(year!, 10),
        parseInt(month!, 10),
        parseInt(day!, 10)
      );
    }

    return new PlainDate(
      value.getUTCFullYear(),
      value.getUTCMonth() + 1,
      value.getUTCDate()
    );
  }
}

type YearMonthDuration = { months?: number; years?: number };

export class PlainYearMonth {
  constructor(
    public readonly year: number,
    public readonly month: number
  ) {}

  add(duration: YearMonthDuration) {
    const date = toDate(this);
    const months = (duration.months ?? 0) + (duration.years ?? 0) * 12;
    date.setUTCMonth(date.getUTCMonth() + months);

    return new PlainYearMonth(date.getUTCFullYear(), date.getUTCMonth() + 1);
  }

  equals(date: PlainDate | PlainYearMonth) {
    return this.year === date.year && this.month === date.month;
  }

  toPlainDate() {
    return new PlainDate(this.year, this.month, 1);
  }
}
