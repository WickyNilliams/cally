import { endOfMonth, clamp, toDate } from "./date.js";

type Duration = { months: number } | { years: number } | { days: number };

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
    let { year, month } = this;
    if ("months" in duration) {
      month = this.month + duration.months;
      date.setUTCMonth(month - 1);
    } else {
      year = this.year + duration.years;
      date.setUTCFullYear(year);
    }
    const min = PlainDate.from(toDate({ year, month, day: 1 }));
    return clamp(PlainDate.from(date), min, endOfMonth(min));
  }

  toString(): string {
    return toDate(this).toISOString().slice(0, 10);
  }

  toPlainYearMonth() {
    return new PlainYearMonth(this.year, this.month);
  }

  static from(value: string | Date): PlainDate {
    if (typeof value === "string") {
      if (!/^\d{4}-\d\d-\d\d$/.test(value)) throw new TypeError(value);
      const [y, m, d] = value.split("-");
      return new PlainDate(+y!, +m!, +d!);
    }
    return new PlainDate(value.getUTCFullYear(), value.getUTCMonth() + 1, value.getUTCDate());
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

}
