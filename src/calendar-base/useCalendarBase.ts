import { useState, useEvent, useHost, useEffect, useMemo } from "atomico";
import { PlainDate, PlainYearMonth } from "../utils/temporal.js";
import { useDateProp, useDateFormatter } from "../utils/hooks.js";
import { clamp, toDate, today } from "../utils/date.js";

export type Pagination = "single" | "months";

type CalendarBaseOptions = {
  months: number;
  pageBy: Pagination;
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

type UsePaginationOptions = {
  pageBy: Pagination;
  focusedDate: PlainDate;
  months: number;
  min?: PlainDate;
  max?: PlainDate;
  goto: (date: PlainDate) => void;
};

function usePagination({
  pageBy,
  focusedDate,
  months,
  max,
  min,
  goto,
}: UsePaginationOptions) {
  const step = pageBy === "single" ? 1 : months;
  const [page, setPage] = useState(() =>
    createPage(focusedDate.toPlainYearMonth(), months)
  );

  const updatePageBy = (by: number) =>
    setPage(createPage(page.start.add({ months: by }), months));

  const contains = (date: PlainDate) => {
    const diff = diffInMonths(page.start, date.toPlainYearMonth());
    return diff >= 0 && diff < months;
  };

  // page change -> update focused date
  useEffect(() => {
    if (contains(focusedDate)) {
      return;
    }

    const diff = diffInMonths(focusedDate.toPlainYearMonth(), page.start);
    goto(focusedDate.add({ months: diff }));
  }, [page.start]);

  // focused date change -> update page
  useEffect(() => {
    if (contains(focusedDate)) {
      return;
    }

    const diff = diffInMonths(page.start, focusedDate.toPlainYearMonth());

    // if we only move one month either way, move by step
    if (diff === -1) {
      updatePageBy(-step);
    } else if (diff === months) {
      updatePageBy(step);
    } else {
      // anything else, move in steps of months
      updatePageBy(Math.floor(diff / months) * months);
    }
  }, [focusedDate, step, months]);

  return {
    page,
    previous: !min || !contains(min) ? () => updatePageBy(-step) : undefined,
    next: !max || !contains(max) ? () => updatePageBy(step) : undefined,
  };
}

export function useCalendarBase({
  months,
  pageBy,
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

  function goto(date: PlainDate) {
    setFocusedDate(date);
    dispatchFocusDay(toDate(date));
  }

  const { next, previous, page } = usePagination({
    pageBy,
    focusedDate,
    months,
    min,
    max,
    goto,
  });

  const host = useHost();
  function focus() {
    host.current
      .querySelectorAll<HTMLElement>("calendar-month")
      .forEach((m) => m.focus());
  }

  return {
    format: useDateFormatter(formatOptions, locale),
    formatVerbose: useDateFormatter(formatVerboseOptions, locale),
    page,
    focusedDate,
    dispatch,
    onFocus(e: CustomEvent<PlainDate>) {
      e.stopPropagation();
      goto(e.detail);
      setTimeout(focus);
    },
    min,
    max,
    next,
    previous,
    focus,
  };
}
