import { useState, useEvent, useHost } from "atomico";
import { DateWindow } from "../utils/DateWindow.js";
import { type PlainDate, PlainYearMonth } from "../utils/temporal.js";
import { useDateProp, useDateFormatter } from "../utils/hooks.js";
import { today } from "../utils/utils.js";

type CalendarBaseOptions = {
  months: number;
  locale?: string;
};

export function useCalendarBase({ months, locale }: CalendarBaseOptions) {
  const [min] = useDateProp("min");
  const [max] = useDateProp("max");
  const dispatch = useEvent<string>("focusday");

  const todaysDate = today();
  const start = todaysDate.toPlainYearMonth();

  const [dateWindow, setDateWindow] = useState(
    new DateWindow(
      months === 12 ? new PlainYearMonth(start.year, 1) : start,
      { months },
      todaysDate
    )
  );

  function next() {
    const next = dateWindow.next();
    setDateWindow(next);
    dispatch(next.focusedDate.toString());
  }

  function previous() {
    const prev = dateWindow.prev();
    setDateWindow(prev);
    dispatch(prev.focusedDate.toString());
  }

  const host = useHost();
  const formatter = useDateFormatter(locale, { year: "numeric" });

  const canNext =
    max == null || PlainYearMonth.compare(max, dateWindow.end) > 0;
  const canPrevious =
    min == null || PlainYearMonth.compare(min, dateWindow.start) < 0;

  return {
    formatter,
    dateWindow,
    setFocusedDate(day: PlainDate) {
      setDateWindow(dateWindow.adjust(day));
    },
    min,
    max,
    next: canNext ? next : undefined,
    previous: canPrevious ? previous : undefined,
    focus() {
      host.current
        .querySelectorAll<HTMLElement>("calendar-month")
        .forEach((m) => m.focus());
    },
  };
}
