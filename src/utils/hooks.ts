import { useProp, useMemo } from "atomico";
import { PlainDate, type PlainYearMonth } from "./temporal.js";
import { getDayNames, type DaysOfWeek, type WeekdayOption } from "./date.js";

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

export function useDateProp(prop: string) {
  const [value, setValue] = useProp<string>(prop);

  const date = useMemo(() => safeFrom(PlainDate, value), [value]);
  const setDate = (date: PlainDate) => setValue(date.toString());

  return [date, setDate] as const;
}

function parseISORange(value?: string): [PlainDate, PlainDate] | [] {
  if (value) {
    const [s, e] = value.split("/");
    const start = safeFrom(PlainDate, s);
    const end = safeFrom(PlainDate, e);

    if (start && end) {
      return [start, end];
    }
  }

  return [];
}

function printISORange(start: PlainDate, end: PlainDate): string {
  return `${start}/${end}`;
}

export function useDateRangeProp(prop: string) {
  const [value, setValue] = useProp<string>(prop);
  const range = useMemo(() => parseISORange(value), [value]);

  const setRange = (range: [PlainDate, PlainDate]) =>
    setValue(printISORange(range[0], range[1]));

  return [range, setRange] as const;
}

type DateFormatOptions = Pick<
  Intl.DateTimeFormatOptions,
  "year" | "month" | "day"
>;

export function useDateFormatter(options: DateFormatOptions, locale?: string) {
  return useMemo(
    () => new Intl.DateTimeFormat(locale, { timeZone: "UTC", ...options }),
    [locale, options]
  );
}

export function useDayNames(
  weekday: WeekdayOption,
  firstDayOfWeek: DaysOfWeek,
  locale?: string
) {
  return useMemo(
    () => getDayNames(weekday, firstDayOfWeek, locale),
    [weekday, firstDayOfWeek, locale]
  );
}
