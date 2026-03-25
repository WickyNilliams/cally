import { PlainDate } from "./temporal.js";

export function parseDateProp(value: string | undefined): PlainDate | undefined {
  if (value) try { return PlainDate.from(value); } catch {}
}

export function parseDateRangeProp(value: string): [PlainDate, PlainDate] | [] {
  const [s, e] = value.split("/").map(parseDateProp);
  return s && e ? [s, e] : [];
}

export function parseDateMultiProp(value: string): PlainDate[] {
  return value.split(/\s+/).map(parseDateProp).filter(d => d) as PlainDate[];
}

type DateFormatOptions = Pick<
  Intl.DateTimeFormatOptions,
  "year" | "month" | "day" | "weekday"
>;

export function makeDateFormatter(options: DateFormatOptions, locale?: string) {
  return new Intl.DateTimeFormat(locale, { timeZone: "UTC", ...options });
}

