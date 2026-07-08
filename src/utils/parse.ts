import { PlainDate } from "./temporal.js";
import { type DaysOfWeek } from "./date.js";

export function parseDate(value: string | undefined): PlainDate | undefined {
  if (value) {
    try {
      return PlainDate.from(value);
    } catch {}
  }
}

export function parseDateRange(
  value: string | undefined,
): [PlainDate, PlainDate] | [] {
  const [s, e] = (value ?? "").split("/");
  const start = parseDate(s);
  const end = parseDate(e);
  return start && end ? [start, end] : [];
}

export function parseDateMulti(value: string | undefined): PlainDate[] {
  const result = [];

  for (const date of (value ?? "").trim().split(/\s+/)) {
    const parsed = parseDate(date);

    if (parsed) {
      result.push(parsed);
    }
  }

  return result;
}

type DateFormatOptions = Pick<
  Intl.DateTimeFormatOptions,
  "year" | "month" | "day" | "weekday"
>;

export function dateFormatter(options: DateFormatOptions, locale?: string) {
  return new Intl.DateTimeFormat(locale, { timeZone: "UTC", ...options });
}

export type WeekdayOption = {
  weekday: NonNullable<Intl.DateTimeFormatOptions["weekday"]>;
};

export function getDayNames(
  options: WeekdayOption,
  firstDayOfWeek: DaysOfWeek,
  locale?: string,
) {
  const formatter = dateFormatter(options, locale);
  const days = [];
  const day = new Date();

  for (var i = 0; i < 7; i++) {
    const index = (day.getUTCDay() - firstDayOfWeek + 7) % 7;
    days[index] = formatter.format(day);
    day.setUTCDate(day.getUTCDate() + 1);
  }

  return days;
}
