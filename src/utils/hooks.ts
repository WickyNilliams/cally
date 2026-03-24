import { PlainDate, type PlainYearMonth } from "./temporal.js";
import { type DaysOfWeek } from "./date.js";

function safeFrom<T extends PlainDate | PlainYearMonth>(
  Ctr: { from(value: string): T },
  value: string | undefined
) {
  if (value) {
    try {
      return Ctr.from(value);
    } catch {}
  }
}

export function parseDateProp(value: string | undefined): PlainDate | undefined {
  return safeFrom(PlainDate, value);
}

export function parseDateRangeProp(value: string): [PlainDate, PlainDate] | [] {
  const [s, e] = (value ?? "").split("/");
  const start = safeFrom(PlainDate, s);
  const end = safeFrom(PlainDate, e);
  return start && end ? [start, end] : [];
}

export function parseDateMultiProp(value: string): PlainDate[] {
  const result = [];
  for (const date of (value ?? "").trim().split(/\s+/)) {
    const parsed = safeFrom(PlainDate, date);
    if (parsed) result.push(parsed);
  }
  return result;
}

type DateFormatOptions = Pick<
  Intl.DateTimeFormatOptions,
  "year" | "month" | "day" | "weekday"
>;

export function makeDateFormatter(options: DateFormatOptions, locale?: string) {
  return new Intl.DateTimeFormat(locale, { timeZone: "UTC", ...options });
}

export type WeekdayOption = {
  weekday: NonNullable<Intl.DateTimeFormatOptions["weekday"]>;
};

export function getDayNames(
  options: WeekdayOption,
  firstDayOfWeek: DaysOfWeek,
  locale?: string
): string[] {
  const formatter = makeDateFormatter(options, locale);
  const days: string[] = [];
  const day = new Date();

  for (let i = 0; i < 7; i++) {
    const index = (day.getUTCDay() - firstDayOfWeek + 7) % 7;
    days[index] = formatter.format(day);
    day.setUTCDate(day.getUTCDate() + 1);
  }

  return days;
}
