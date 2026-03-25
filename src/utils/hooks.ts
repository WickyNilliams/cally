import { PlainDate } from "./temporal.js";
import { type DaysOfWeek } from "./date.js";

export function parseDateProp(value: string | undefined): PlainDate | undefined {
  if (value) try { return PlainDate.from(value); } catch {}
}

export function parseDateRangeProp(value: string): [PlainDate, PlainDate] | [] {
  const [s, e] = value.split("/");
  const start = parseDateProp(s);
  const end = parseDateProp(e);
  return start && end ? [start, end] : [];
}

export function parseDateMultiProp(value: string): PlainDate[] {
  return value.trim().split(/\s+/).map(parseDateProp).filter(d => d) as PlainDate[];
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
  const day = new Date(Date.UTC(2023, 0, 1)); // Sunday

  for (let i = 0; i < 7; i++) {
    day.setUTCDate((firstDayOfWeek + i) % 7 + 1);
    days.push(formatter.format(day));
  }

  return days;
}
