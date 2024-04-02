import { type PlainDate, PlainYearMonth } from "./temporal.js";

export class DateWindow {
  public readonly end: PlainYearMonth;

  constructor(
    public readonly start: PlainYearMonth,
    public readonly duration: { months: number },
    public readonly focusedDate: PlainDate
  ) {
    // TODO: center around focusedDate?
    this.end = start.add({ months: duration.months - 1 });
  }

  contains(date: PlainYearMonth | PlainDate) {
    return (
      PlainYearMonth.compare(date, this.start) >= 0 &&
      PlainYearMonth.compare(date, this.end) <= 0
    );
  }

  adjust(date: PlainDate): DateWindow {
    const { start, duration } = this;

    const inPast = PlainYearMonth.compare(start, date) > 0;
    let win = new DateWindow(start, duration, date);

    // TODO: bit of a naive approach, can we make this more efficient?
    while (!win.contains(date)) {
      win = new DateWindow(
        inPast ? win.start.subtract(duration) : win.start.add(duration),
        duration,
        date
      );
    }

    return win;
  }

  next() {
    return new DateWindow(
      this.start.add(this.duration),
      this.duration,
      this.focusedDate.add(this.duration)
    );
  }

  prev() {
    return new DateWindow(
      this.start.subtract(this.duration),
      this.duration,
      this.focusedDate.subtract(this.duration)
    );
  }
}
