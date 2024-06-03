import {
  useState,
  useEvent,
  useHost,
  useEffect,
  useMemo,
  useRef,
} from "atomico";
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

function usePagination({
  pageBy,
  focusedDate,
  months,
  max,
  min,
  goto,
}: {
  pageBy: Pagination;
  focusedDate: PlainDate;
  months: number;
  min?: PlainDate;
  max?: PlainDate;
  goto: (date: PlainDate) => void;
}) {
  const nextOrPrev = useRef<boolean>(false);
  const [page, setPage] = useState(() =>
    createPage(focusedDate.toPlainYearMonth(), months)
  );

  const contains = (date: PlainDate) => {
    const diff = diffInMonths(page.start, date.toPlainYearMonth());
    return diff >= 0 && diff < months;
  };

  useEffect(() => {
    let start = page.start;

    // when paging by month, hitting next/prev button is a special case...
    // if you hit PageUp/PageDown on the keyboard you want to move _within_ the page
    // but if you hit next/prev, as here, you want to move the page itself
    if (nextOrPrev.current && pageBy === "single") {
      start = focusedDate.toPlainYearMonth();
    }
    // ensure we only move the start date in multiples of `months`
    else if (!contains(focusedDate)) {
      const diff = diffInMonths(start, focusedDate.toPlainYearMonth());
      const pages = Math.floor(diff / months);
      start = start.add({ months: pages * months });
    }

    nextOrPrev.current = false;
    setPage(createPage(start, months));
  }, [page.start, focusedDate, months, pageBy]);

  const step = pageBy === "single" ? 1 : months;
  const next =
    max == null || !contains(max)
      ? () => {
          nextOrPrev.current = true;
          goto(focusedDate.add({ months: step }));
        }
      : undefined;
  const previous =
    min == null || !contains(min)
      ? () => {
          nextOrPrev.current = true;
          return goto(focusedDate.add({ months: -step }));
        }
      : undefined;

  return {
    page,
    setPage,
    previous,
    next,
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

  const format = useDateFormatter(formatOptions, locale);
  const formatVerbose = useDateFormatter(formatVerboseOptions, locale);

  return {
    format,
    formatVerbose,
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
