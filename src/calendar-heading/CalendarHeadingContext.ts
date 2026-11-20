import type { Context } from "../utils/base.js";
import { signal, type ReadonlySignal } from "../utils/signals.js";
import type { PlainYearMonth } from "../utils/temporal.js";
import { getToday } from "../utils/date.js";

export interface Page {
  start: PlainYearMonth;
  end: PlainYearMonth;
}

export interface HeadingContextValue {
  /** the month(s) to describe. a single month has the same start and end */
  page: ReadonlySignal<Page>;
  locale: ReadonlySignal<string | undefined>;
}

// shared with the calendar context, so lone headings and months agree
const yearMonth = getToday().toPlainYearMonth();

export const CalendarHeadingContext: Context<HeadingContextValue> = {
  name: "calendar-heading-ctx",
  initial: {
    page: signal({ start: yearMonth, end: yearMonth }),
    locale: signal(undefined),
  },
};
