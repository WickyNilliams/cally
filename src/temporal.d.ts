declare namespace Temporal {
  interface PlainDateLike {
    year: number;
    month: number;
    day: number;
  }

  interface PlainDateArithmetic {
    years?: number;
    months?: number;
    days?: number;
  }

  class PlainDate {
    constructor(year: number, month: number, day: number);
    static from(item: string | PlainDateLike): PlainDate;
    year: number;
    month: number;
    day: number;
    static compare(one: PlainDate, two: PlainDate): number;
    add(temporalDuration: PlainDateArithmetic): PlainDate;
    toPlainYearMonth(): PlainYearMonth;
    equals(other: PlainDate): boolean;
  }

  interface PlainYearMonthLike {
    year: number;
    month: number;
  }

  class PlainYearMonth {
    constructor(hour?: number, minute?: number, second?: number);
    year: number;
    month: number;
    daysInMonth: number;
    static from(item: string | PlainYearMonth): PlainYearMonth;
    add(temporalDuration: Omit<PlainDateArithmetic, "days">): PlainYearMonth;
    toPlainDate(date: { day: number }): PlainDate;
    equals(other: PlainDateLike): boolean;
  }
}
