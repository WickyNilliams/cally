import { useProp, useMemo } from "atomico";
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

export function useDateProp(prop: string) {
  const [value, setValue] = useProp<string>(prop);

  const date = useMemo(() => safeFrom(PlainDate, value), [value]);
  const setDate = (date: PlainDate) => setValue(date.toString());

  return [date, setDate] as const;
}

export function useDateRangeProp(prop: string) {
  const [value = "", setValue] = useProp<string>(prop);

  const range = useMemo(() => {
    const [s, e] = value.split("/");
    const start = safeFrom(PlainDate, s);
    const end = safeFrom(PlainDate, e);
    return start && end ? [start, end] : [];
  }, [value]);

  const setRange = (range: [PlainDate, PlainDate]) =>
    setValue(`${range[0]}/${range[1]}`);

  return [range, setRange] as const;
}

export function useDateMultiProp(prop: string) {
  const [value = "", setValue] = useProp<string>(prop);

  const multi = useMemo(() => {
    const result = [];

    for (const date of value.trim().split(/\s+/)) {
      const parsed = safeFrom(PlainDate, date);

      if (parsed) {
        result.push(parsed);
      }
    }

    return result;
  }, [value]);

  const setMulti = (dates: PlainDate[]) => setValue(dates.join(" "));

  return [multi, setMulti] as const;
}

type DateFormatOptions = Pick<
  Intl.DateTimeFormatOptions,
  "year" | "month" | "day" | "weekday"
>;

export function useDateFormatter(options: DateFormatOptions, locale?: string) {
  return useMemo(
    () => new Intl.DateTimeFormat(locale, { timeZone: "UTC", ...options }),
    [locale, options]
  );
}

export type WeekdayOption = {
  weekday: NonNullable<Intl.DateTimeFormatOptions["weekday"]>;
};

export function useDayNames(
  options: WeekdayOption,
  firstDayOfWeek: DaysOfWeek,
  locale?: string
) {
  const formatter = useDateFormatter(options, locale);

  return useMemo(() => {
    const days = [];
    const day = new Date();

    for (var i = 0; i < 7; i++) {
      const index = (day.getDay() - firstDayOfWeek + 7) % 7;
      days[index] = formatter.format(day);
      day.setDate(day.getDate() + 1);
    }

    return days;
  }, [firstDayOfWeek, formatter]);
}
