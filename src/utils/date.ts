import { PlainDate, type PlainYearMonth } from "./temporal.js";

export type DaysOfWeek = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export function today() {
  return PlainDate.from(new Date());
}

const DAY_MS = 86400000;

// slightly modified from https://weeknumber.co.uk/how-to/javascript
export function getWeekNumber(plainDate: PlainDate) {
  const date = toDate(plainDate);
  // Thursday in current week decides the year.
  date.setDate(date.getUTCDate() + 3 - ((date.getUTCDay() + 6) % 7));
  // January 4 is always in week 1.
  const week1 = new Date(date.getUTCFullYear(), 0, 4);

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
  const d = toDate(date);
  const day = d.getUTCDay();
  const diff = (day < firstDayOfWeek ? 7 : 0) + day - firstDayOfWeek;

  d.setUTCDate(d.getUTCDate() - diff);
  return PlainDate.from(d);
}

export function endOfWeek(
  date: PlainDate,
  firstDayOfWeek: DaysOfWeek = 0
): PlainDate {
  return startOfWeek(date, firstDayOfWeek).add({ days: 6 });
}

export function endOfMonth(date: { year: number; month: number }): PlainDate {
  return PlainDate.from(new Date(Date.UTC(date.year, date.month, 0)));
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
  let start = startOfWeek(yearMonth.toPlainDate(), firstDayOfWeek);
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
