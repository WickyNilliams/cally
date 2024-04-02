import { useState, useEvent, useHost } from "atomico";
import { DateWindow } from "../utils/DateWindow.js";
import { type PlainDate, PlainYearMonth } from "../utils/temporal.js";
import { useDateProp, useDateFormatter } from "../utils/hooks.js";
import { today } from "../utils/date.js";

type CalendarBaseOptions = {
  months: number;
  locale?: string;
};

const formatOptions = { year: "numeric" } as const;

export function useCalendarBase({ months, locale }: CalendarBaseOptions) {
  const [min] = useDateProp("min");
  const [max] = useDateProp("max");
  const dispatchFocusDay = useEvent<string>("focusday");
  const dispatch = useEvent("change");

  const [dateWindow, setDateWindow] = useState(() => {
    const todaysDate = today();
    const start =
      months === 12
        ? new PlainYearMonth(todaysDate.year, 1)
        : todaysDate.toPlainYearMonth();

    return new DateWindow(start, { months }, todaysDate);
  });

  function update(d: DateWindow) {
    setDateWindow(d);
    dispatchFocusDay(d.focusedDate.toString());
  }

  const host = useHost();
  const format = useDateFormatter(formatOptions, locale);

  const canNext = max == null || !dateWindow.contains(max);
  const canPrevious = min == null || !dateWindow.contains(min);

  return {
    format,
    dateWindow,
    dispatch,
    setFocusedDate(day: PlainDate) {
      setDateWindow(dateWindow.adjust(day));
    },
    min,
    max,
    next: canNext ? () => update(dateWindow.next()) : undefined,
    previous: canPrevious ? () => update(dateWindow.prev()) : undefined,
    focus() {
      host.current
        .querySelectorAll<HTMLElement>("calendar-month")
        .forEach((m) => m.focus());
    },
  };
}
