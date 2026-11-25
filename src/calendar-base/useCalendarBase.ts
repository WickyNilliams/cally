import {
  useState,
  useEvent,
  useHost,
  useEffect,
  useMemo,
  useProvider,
} from "atomico";
import { CalendarHeadingContext } from "../calendar-heading/CalendarHeadingContext.js";
import { PlainDate, PlainYearMonth } from "../utils/temporal.js";
import { useDateProp, useDateFormatter } from "../utils/hooks.js";
import { clamp, endOfMonth, toDate, getToday } from "../utils/date.js";

export interface PageChangeDetail {
  start: Date;
  end: Date;
}

export type Pagination = "single" | "months";

type CalendarBaseOptions = {
  months: number;
  pageBy: Pagination;
  locale?: string;
  focusedDate: PlainDate | undefined;
  setFocusedDate: (date: PlainDate) => void;
};

function diffInMonths(a: PlainYearMonth, b: PlainYearMonth): number {
  return (b.year - a.year) * 12 + b.month - a.month;
}

const createPage = (
  start: PlainYearMonth,
  months: number,
  pageBy: Pagination = "months",
) => {
  if (months === 12 && pageBy !== "single") {
    start = new PlainYearMonth(start.year, 1);
  }
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
    createPage(focusedDate.toPlainYearMonth(), months, pageBy),
  );
  const dispatchPageChange = useEvent<PageChangeDetail>("pagechange");

  const contains = (date: PlainDate, start = page.start) => {
    const diff = diffInMonths(start, date.toPlainYearMonth());
    return diff >= 0 && diff < months;
  };

  const updatePageBy = (by: number, syncFocus = false) => {
    const next = createPage(page.start.add({ months: by }), months, pageBy);
    setPage(next);

    // Syncing focus here rather than in a page effect avoids two effects
    // correcting each other forever when page and focus change together.
    // It runs before pagechange so a listener's focusedDate wins.
    if (syncFocus && !contains(focusedDate, next.start)) {
      const diff = diffInMonths(focusedDate.toPlainYearMonth(), next.start);
      goto(focusedDate.add({ months: diff }));
    }

    dispatchPageChange({
      start: toDate(next.start),
      end: toDate(endOfMonth(next.end)),
    });
  };

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
    previous:
      !min || !contains(min) ? () => updatePageBy(-step, true) : undefined,
    next: !max || !contains(max) ? () => updatePageBy(step, true) : undefined,
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
    [focusedDateProp, today, min, max],
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

  useProvider(CalendarHeadingContext, { type: "range", value: page, locale });

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
    today,
    next,
    previous,
    focus,
  };
}
