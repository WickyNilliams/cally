import { useProp, useMemo } from "atomico";
import { type DaysOfWeek } from "./date.js";

function safeFrom<T extends Temporal.PlainDate | Temporal.PlainYearMonth>(
  Ctr: { from(value: string): T },
  value: string | undefined
) {
  if (value) {
    try {
      return Ctr.from(value);
    } catch {}
  }
}

export function useDateProp<
  T extends Temporal.PlainDate | undefined = Temporal.PlainDate,
>(prop: string) {
  const [value, setValue] = useProp<string>(prop);

  const date = useMemo(() => safeFrom(Temporal.PlainDate, value), [value]);
  const setDate = (date: T) => setValue(date?.toString());

  return [date, setDate] as const;
}

export function useDateRangeProp(prop: string) {
  const [value = "", setValue] = useProp<string>(prop);

  const range = useMemo((): [Temporal.PlainDate, Temporal.PlainDate] | [] => {
    const [s, e] = value.split("/");
    const start = safeFrom(Temporal.PlainDate, s);
    const end = safeFrom(Temporal.PlainDate, e);
    return start && end ? [start, end] : [];
  }, [value]);

  const setRange = (range: [Temporal.PlainDate, Temporal.PlainDate]) =>
    setValue(`${range[0]}/${range[1]}`);

  return [range, setRange] as const;
}

export function useDateMultiProp(prop: string) {
  const [value = "", setValue] = useProp<string>(prop);

  const multi = useMemo(() => {
    const result = [];

    for (const date of value.trim().split(/\s+/)) {
      const parsed = safeFrom(Temporal.PlainDate, date);

      if (parsed) {
        result.push(parsed);
      }
    }

    return result;
  }, [value]);

  const setMulti = (dates: Temporal.PlainDate[]) => setValue(dates.join(" "));

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
      const index = (day.getUTCDay() - firstDayOfWeek + 7) % 7;
      days[index] = formatter.format(day);
      day.setUTCDate(day.getUTCDate() + 1);
    }

    return days;
  }, [firstDayOfWeek, formatter]);
}
