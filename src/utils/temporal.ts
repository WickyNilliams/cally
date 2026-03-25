import { endOfMonth, clamp, toDate } from "./date.js";

export class PlainDate {
  constructor(
    public readonly year: number,
    public readonly month: number,
    public readonly day: number
  ) {}

  // this is an incomplete implementation that only handles arithmetic on a single unit at a time.
  // i didn't want to get into more complex arithmetic since it get tricky fast
  // this is enough to serve my needs and will still be a drop-in replacement when actual Temporal API lands
  add(key: string, n: number): PlainDate {
    const date = toDate(this);
    if (key === "d") {
      date.setUTCDate(this.day + n);
      return PlainDate.from(date);
    }
    let { year, month } = this;
    if (key === "m") {
      month = this.month + n;
      date.setUTCMonth(month - 1);
    } else {
      year = this.year + n;
      date.setUTCFullYear(year);
    }
    const min = PlainDate.from(toDate({ year, month, day: 1 }));
    return clamp(PlainDate.from(date), min, endOfMonth(min));
  }

  toString(): string {
    return toDate(this).toISOString().slice(0, 10);
  }

  tym() {
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

export class PlainYearMonth {
  constructor(
    public readonly year: number,
    public readonly month: number
  ) {}

  add(n: number) {
    const date = toDate(this);
    date.setUTCMonth(date.getUTCMonth() + n);
    return new PlainYearMonth(date.getUTCFullYear(), date.getUTCMonth() + 1);
  }

}
