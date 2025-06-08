import {
  useState,
  useEvent,
  useHost,
  useEffect,
  useMemo,
  useRef,
} from "atomico";

import { useDateProp, useDateFormatter } from "../utils/hooks.js";
import { clamp, toDate, getToday } from "../utils/date.js";

export type Pagination = "single" | "months";

type CalendarBaseOptions = {
  months: number;
  pageBy: Pagination;
  locale?: string;
  focusedDate: Temporal.PlainDate | undefined;
  setFocusedDate: (date: Temporal.PlainDate) => void;
};

const formatOptions = { year: "numeric" } as const;
const formatVerboseOptions = { year: "numeric", month: "long" } as const;

function diffInMonths(
  a: Temporal.PlainYearMonth,
  b: Temporal.PlainYearMonth
): number {
  return (b.year - a.year) * 12 + b.month - a.month;
}

const createPage = (start: Temporal.PlainYearMonth, months: number) => {
  start = months === 12 ? new Temporal.PlainYearMonth(start.year, 1) : start;
  return {
    start,
    end: start.add({ months: months - 1 }),
  };
};

type UsePaginationOptions = {
  pageBy: Pagination;
  focusedDate: Temporal.PlainDate;
  months: number;
  min?: Temporal.PlainDate;
  max?: Temporal.PlainDate;
  goto: (date: Temporal.PlainDate) => void;
};

export interface CalendarFocusOptions extends FocusOptions {
  target?: "day" | "next" | "previous";
}

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

  const contains = (date: Temporal.PlainDate) => {
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
  const [today] = useDateProp("today");
  const dispatchFocusDay = useEvent<Date>("focusday");
  const dispatch = useEvent("change");

  const focusedDate = useMemo(
    () => clamp(focusedDateProp ?? today ?? getToday(), min, max),
    [focusedDateProp, today, min, max]
  );

  function goto(date: Temporal.PlainDate) {
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
  function focus(options?: CalendarFocusOptions) {
    const target = options?.target ?? "day";
    if (target === "day") {
      host.current
        .querySelectorAll<HTMLElement>("calendar-month")
        .forEach((m) => m.focus(options));
    } else {
      host.current
        .shadowRoot!.querySelector<HTMLButtonElement>(`[part~='${target}']`)!
        .focus(options);
    }
  }

  return {
    format: useDateFormatter(formatOptions, locale),
    formatVerbose: useDateFormatter(formatVerboseOptions, locale),
    page,
    focusedDate,
    dispatch,
    onFocus(e: CustomEvent<Temporal.PlainDate>) {
      e.stopPropagation();
      goto(e.detail);
      setTimeout(focus);
    },
    min,
    max,
    today,
    next,
    previous,
    focus,
  };
}
