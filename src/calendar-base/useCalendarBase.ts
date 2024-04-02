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
const formatVerboseOptions = { year: "numeric", month: "long" } as const;

export function useCalendarBase({ months, locale }: CalendarBaseOptions) {
  const [min] = useDateProp("min");
  const [max] = useDateProp("max");
  const dispatchFocusDay = useEvent<Date>("focusday");
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
    dispatchFocusDay(d.focusedDate.toDate());
  }

  function setFocusedDate(day: PlainDate) {
    setDateWindow(dateWindow.adjust(day));
  }

  const host = useHost();
  function focus() {
    host.current
      .querySelectorAll<HTMLElement>("calendar-month")
      .forEach((m) => m.focus());
  }

  const format = useDateFormatter(formatOptions, locale);
  const formatVerbose = useDateFormatter(formatVerboseOptions, locale);
  const canNext = max == null || !dateWindow.contains(max);
  const canPrevious = min == null || !dateWindow.contains(min);

  return {
    format,
    formatVerbose,
    dateWindow,
    dispatch,
    handleFocus(e: CustomEvent<PlainDate>) {
      e.stopPropagation();
      setFocusedDate(e.detail);
      dispatchFocusDay(e.detail.toDate());
      setTimeout(focus);
    },
    setFocusedDate,
    min,
    max,
    next: canNext ? () => update(dateWindow.next()) : undefined,
    previous: canPrevious ? () => update(dateWindow.prev()) : undefined,
    focus,
  };
}
