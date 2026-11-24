import { PlainDate, type PlainYearMonth } from "./temporal.js";

/** ISO day of week, Monday is 1 and Sunday is 7 */
export type DaysOfWeek = 1 | 2 | 3 | 4 | 5 | 6 | 7;

export function getToday() {
  const d = new Date();
  return new PlainDate(d.getFullYear(), d.getMonth() + 1, d.getDate());
}

const DAY_MS = 86400000;

/**
 * The ISO week number of a date
 */
export function getWeekNumber(date: DateLike): number {
  // the year is that of the thursday in the same week
  const thursday = toDate(date);
  const day = thursday.getUTCDay() || 7;
  thursday.setUTCDate(date.day + 4 - day);
  const start = Date.UTC(thursday.getUTCFullYear(), 0, 1);

  return Math.ceil(((+thursday - start) / DAY_MS + 1) / 7);
}

export function startOfWeek(
  date: PlainDate,
  firstDayOfWeek: DaysOfWeek = 7
): PlainDate {
  const diff = (date.dayOfWeek - firstDayOfWeek + 7) % 7;

  return date.add({ days: -diff });
}

export function endOfWeek(
  date: PlainDate,
  firstDayOfWeek: DaysOfWeek = 7
): PlainDate {
  return startOfWeek(date, firstDayOfWeek).add({ days: 6 });
}

export function endOfMonth(date: { year: number; month: number }): PlainDate {
  const last = new Date(Date.UTC(date.year, date.month, 0));
  return new PlainDate(date.year, date.month, last.getUTCDate());
}

/**
 * Ensures date is within range, returns min or max if out of bounds
 */
export function clamp(
  date: PlainDate,
  min?: PlainDate,
  max?: PlainDate
): PlainDate {
  if (min && PlainDate.compare(date, min) < 0) return min;
  if (max && PlainDate.compare(date, max) > 0) return max;
  return date;
}

const oneDay = { days: 1 };

type Week = [
  PlainDate,
  PlainDate,
  PlainDate,
  PlainDate,
  PlainDate,
  PlainDate,
  PlainDate,
];

/**
 * given a date, return an array of dates from a calendar perspective
 */
export function getViewOfMonth(
  yearMonth: PlainYearMonth,
  firstDayOfWeek: DaysOfWeek = 7
): Week[] {
  let start = startOfWeek(yearMonth.toPlainDate({ day: 1 }), firstDayOfWeek);
  const end = endOfWeek(endOfMonth(yearMonth), firstDayOfWeek);

  const weeks = [];

  // get all days in range
  while (PlainDate.compare(start, end) < 0) {
    const week = [];

    // chunk into weeks
    for (let i = 0; i < 7; i++) {
      week.push(start);
      start = start.add(oneDay);
    }

    weeks.push(week as Week);
  }

  return weeks;
}

/**
 * A date, as a plain object. It can be converted with e.g.
 * `Temporal.PlainDate.from(date)`, or `new Date(year, month - 1, day)`
 */
export interface DateLike {
  year: number;
  /** from 1 for January to 12 for December */
  month: number;
  day: number;
}

/** Copies a date to a plain object, so that nothing else is exposed */
export const toDateLike = ({ year, month, day }: DateLike): DateLike => ({
  year,
  month,
  day,
});

export function toDate(date: { year: number; month: number; day?: number }): Date {
  return new Date(Date.UTC(date.year, date.month - 1, date.day ?? 1));
}

/**
 * Parses an ISO date string, returning undefined if it is not valid
 */
export function parseDate(value: string | undefined): PlainDate | undefined {
  if (value) {
    try {
      return PlainDate.from(value);
    } catch {}
  }
}

type DateFormatOptions = Pick<
  Intl.DateTimeFormatOptions,
  "year" | "month" | "day" | "weekday"
>;

export function getFormatter(options: DateFormatOptions, locale?: string) {
  return new Intl.DateTimeFormat(locale, { timeZone: "UTC", ...options });
}

/**
 * The names of the days of the week, starting from `firstDayOfWeek`
 */
export function getDayNames(
  weekday: NonNullable<Intl.DateTimeFormatOptions["weekday"]>,
  firstDayOfWeek: DaysOfWeek,
  locale?: string,
): string[] {
  const formatter = getFormatter({ weekday }, locale);
  // any week will do
  const start = startOfWeek(getToday(), firstDayOfWeek);
  const days = [];

  for (let i = 0; i < 7; i++) {
    days.push(formatter.format(toDate(start.add({ days: i }))));
  }

  return days;
}
