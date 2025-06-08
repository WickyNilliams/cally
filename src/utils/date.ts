export type DaysOfWeek = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export function getToday() {
  const d = new Date();
  return new Temporal.PlainDate(d.getFullYear(), d.getMonth() + 1, d.getDate());
}

export function startOfWeek(
  date: Temporal.PlainDate,
  firstDayOfWeek: DaysOfWeek = 0
): Temporal.PlainDate {
  const d = toDate(date);
  const day = d.getUTCDay();
  const diff = (day < firstDayOfWeek ? 7 : 0) + day - firstDayOfWeek;

  d.setUTCDate(d.getUTCDate() - diff);
  return Temporal.PlainDate.from(toISOString(d));
}

export function endOfWeek(
  date: Temporal.PlainDate,
  firstDayOfWeek: DaysOfWeek = 0
): Temporal.PlainDate {
  return startOfWeek(date, firstDayOfWeek).add({ days: 6 });
}

export function endOfMonth(date: Temporal.PlainYearMonth): Temporal.PlainDate {
  return Temporal.PlainDate.from({
    year: date.year,
    month: date.month,
    day: date.daysInMonth,
  });
}

/**
 * Ensures date is within range, returns min or max if out of bounds
 */
export function clamp(
  date: Temporal.PlainDate,
  min?: Temporal.PlainDate,
  max?: Temporal.PlainDate
): Temporal.PlainDate {
  if (min && Temporal.PlainDate.compare(date, min) < 0) return min;
  if (max && Temporal.PlainDate.compare(date, max) > 0) return max;
  return date;
}

const oneDay = { days: 1 };

/**
 * given a date, return an array of dates from a calendar perspective
 */
export function getViewOfMonth(
  yearMonth: Temporal.PlainYearMonth,
  firstDayOfWeek: DaysOfWeek = 0
): Temporal.PlainDate[][] {
  let start = startOfWeek(yearMonth.toPlainDate({ day: 1 }), firstDayOfWeek);
  const end = endOfWeek(endOfMonth(yearMonth), firstDayOfWeek);

  const weeks: Temporal.PlainDate[][] = [];

  // get all days in range
  while (Temporal.PlainDate.compare(start, end) < 0) {
    const week = [];

    // chunk into weeks
    for (let i = 0; i < 7; i++) {
      week.push(start);
      start = start.add(oneDay);
    }

    weeks.push(week);
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

export function toISOString(date: Date): string {
  return date.toISOString().split("T")[0]!;
}
