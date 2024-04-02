import { PlainDate, type PlainYearMonth } from "./temporal.js";

export type DaysOfWeek = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export function today() {
  const d = new Date(Date.now());
  return new PlainDate(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate());
}

export function startOfWeek(
  date: PlainDate,
  firstDayOfWeek: DaysOfWeek = 0
): PlainDate {
  const d = date.toDate();
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

interface ToDate {
  toDate(): Date;
}

export function compare(a: ToDate, b: ToDate) {
  const aDate = a.toDate();
  const bDate = b.toDate();

  if (aDate < bDate) return -1;
  if (aDate > bDate) return 1;
  return 0;
}

/**
 * Ensures date is within range, returns min or max if out of bounds
 */
export function clamp(
  date: PlainDate,
  min?: PlainDate,
  max?: PlainDate
): PlainDate {
  if (min && PlainDate.compare(date, min) < 0) {
    return min;
  }

  if (max && PlainDate.compare(date, max) > 0) {
    return max;
  }

  return date;
}

/**
 * Check if date is within a min and max
 */
export function inRange(
  date: PlainDate,
  minDate?: PlainDate,
  maxDate?: PlainDate
): boolean {
  return clamp(date, minDate, maxDate) === date;
}

/**
 * given start and end date, return an (inclusive) array of all dates in between
 * @param start
 * @param end
 */
function getDaysInRange(start: PlainDate, end: PlainDate): PlainDate[] {
  const duration = { days: 1 };
  const days: PlainDate[] = [start];

  while (!start.equals(end)) {
    start = start.add(duration);
    days.push(start);
  }

  return days;
}

function chunk<T>(array: T[], chunkSize: number): T[][] {
  const result = [];

  for (let i = 0; i < array.length; i += chunkSize) {
    result.push(array.slice(i, i + chunkSize));
  }

  return result;
}

/**
 * given a date, return an array of dates from a calendar perspective
 */
export function getViewOfMonth(
  yearMonth: PlainYearMonth,
  firstDayOfWeek: DaysOfWeek = 0
): PlainDate[][] {
  const start = startOfWeek(yearMonth.toPlainDate(), firstDayOfWeek);
  const end = endOfWeek(endOfMonth(yearMonth), firstDayOfWeek);

  return chunk(getDaysInRange(start, end), 7);
}

export type WeekdayOption = NonNullable<Intl.DateTimeFormatOptions["weekday"]>;

export function getDayNames(
  weekday: WeekdayOption,
  firstDayOfWeek?: DaysOfWeek,
  locale?: string
): string[] {
  const days: string[] = [];
  const options = { weekday };
  const day = startOfWeek(today(), firstDayOfWeek).toDate();
  const formatter = new Intl.DateTimeFormat(locale, options);

  for (let i = 0; i < 7; i++) {
    days[i] = formatter.format(day);
    day.setDate(day.getDate() + 1);
  }

  return days;
}
