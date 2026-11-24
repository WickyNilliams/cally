import { PlainDate, type PlainYearMonth } from "./temporal.js";

/**
 * ISO day of week, Monday is 1 and Sunday is 7.
 * `0` for Sunday is deprecated and will be removed in v1.
 */
export type DaysOfWeek = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7;

let warned = false;

/**
 * Maps ISO day of week to JS day of week. Warns once if legacy `0` is used.
 */
export function normalizeFirstDayOfWeek(day: DaysOfWeek): DaysOfWeek {
  if (day === 0 && !warned) {
    warned = true;
    console.warn(
      "[cally] Using 0 for Sunday in firstDayOfWeek is deprecated and will be removed in v1. Use 7 instead."
    );
  }
  return day === 7 ? 0 : day;
}

export function getToday() {
  const d = new Date();
  return new PlainDate(d.getFullYear(), d.getMonth() + 1, d.getDate());
}

const DAY_MS = 86400000;

// slightly modified from https://weeknumber.co.uk/how-to/javascript
export function getWeekNumber(plainDate: PlainDate) {
  const date = toDate(plainDate);
  // Thursday in current week decides the year.
  date.setUTCDate(date.getUTCDate() + 3 - ((date.getUTCDay() + 6) % 7));
  // January 4 is always in week 1.
  const week1 = new Date(Date.UTC(date.getUTCFullYear(), 0, 4));

  // Adjust to Thursday in week 1 and count number of weeks from date to week1.
  return (
    1 +
    Math.round(
      ((date.getTime() - week1.getTime()) / DAY_MS -
        3 +
        ((week1.getUTCDay() + 6) % 7)) /
        7
    )
  );
}

export function startOfWeek(
  date: PlainDate,
  firstDayOfWeek: DaysOfWeek = 0
): PlainDate {
  const day = toDate(date).getUTCDay();
  const diff = (day < firstDayOfWeek ? 7 : 0) + day - firstDayOfWeek;

  return date.add({ days: -diff });
}

export function endOfWeek(
  date: PlainDate,
  firstDayOfWeek: DaysOfWeek = 0
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
  firstDayOfWeek: DaysOfWeek = 0
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

interface DateLike {
  year: number;
  month: number;
  day?: number;
}

export function toDate(date: DateLike): Date {
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
  const days = [];
  const day = new Date();

  for (let i = 0; i < 7; i++) {
    const index = (day.getUTCDay() - firstDayOfWeek + 7) % 7;
    days[index] = formatter.format(day);
    day.setUTCDate(day.getUTCDate() + 1);
  }

  return days;
}
