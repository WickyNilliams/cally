import { useState, useEvent, useHost, useEffect, useMemo } from "atomico";
import { PlainDate, PlainYearMonth } from "../utils/temporal.js";
import { useDateProp, useDateFormatter } from "../utils/hooks.js";
import { clamp, toDate, today } from "../utils/date.js";

type CalendarBaseOptions = {
  months: number;
  locale?: string;
  focusedDate: PlainDate | undefined;
  setFocusedDate: (date: PlainDate) => void;
};

const formatOptions = { year: "numeric" } as const;
const formatVerboseOptions = { year: "numeric", month: "long" } as const;

function diffInMonths(a: PlainYearMonth, b: PlainYearMonth): number {
  return (b.year - a.year) * 12 + b.month - a.month;
}

const createPage = (start: PlainYearMonth, months: number) => {
  start = months === 12 ? new PlainYearMonth(start.year, 1) : start;
  return {
    start,
    end: start.add({ months: months - 1 }),
  };
};

export function useCalendarBase({
  months,
  locale,
  focusedDate: focusedDateProp,
  setFocusedDate,
}: CalendarBaseOptions) {
  const [min] = useDateProp("min");
  const [max] = useDateProp("max");
  const dispatchFocusDay = useEvent<Date>("focusday");
  const dispatch = useEvent("change");

  const focusedDate = useMemo(
    () => clamp(focusedDateProp ?? today(), min, max),
    [focusedDateProp, min, max]
  );

  const [page, setPage] = useState(() =>
    createPage(focusedDate.toPlainYearMonth(), months)
  );

  const contains = (date: PlainDate) => {
    const diff = diffInMonths(page.start, date.toPlainYearMonth());
    return diff >= 0 && diff < months;
  };

  useEffect(() => {
    let start = page.start;

    // ensure we only move the start date in multiples of `months`
    if (!contains(focusedDate)) {
      const diff = diffInMonths(start, focusedDate.toPlainYearMonth());
      const pages = Math.floor(diff / months);
      start = start.add({ months: pages * months });
    }

    setPage(createPage(start, months));
  }, [focusedDate, months]);

  const host = useHost();
  function focus() {
    host.current
      .querySelectorAll<HTMLElement>("calendar-month")
      .forEach((m) => m.focus());
  }

  const format = useDateFormatter(formatOptions, locale);
  const formatVerbose = useDateFormatter(formatVerboseOptions, locale);
  const canNext = max == null || !contains(max);
  const canPrevious = min == null || !contains(min);

  function goto(date: PlainDate) {
    setFocusedDate(date);
    dispatchFocusDay(toDate(date));
  }

  return {
    format,
    formatVerbose,
    page,
    focusedDate,
    dispatch,
    handleFocus(e: CustomEvent<PlainDate>) {
      e.stopPropagation();
      goto(e.detail);
      setTimeout(focus);
    },
    min,
    max,
    next: canNext ? () => goto(focusedDate.add({ months })) : undefined,
    previous: canPrevious
      ? () => goto(focusedDate.subtract({ months }))
      : undefined,
    focus,
  };
}
