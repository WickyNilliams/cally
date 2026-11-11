import type { Context } from "../utils/base.js";
import { signal, type ReadonlySignal } from "../utils/signals.js";
import { PlainYearMonth } from "../utils/temporal.js";

export interface Page {
  start: PlainYearMonth;
  end: PlainYearMonth;
}

export interface HeadingContextValue {
  /** the month(s) to describe. a single month has the same start and end */
  page: ReadonlySignal<Page>;
  locale: ReadonlySignal<string | undefined>;
}

const now = new Date();
const yearMonth = new PlainYearMonth(
  now.getUTCFullYear(),
  now.getUTCMonth() + 1,
);

export const CalendarHeadingContext: Context<HeadingContextValue> = {
  name: "calendar-heading-ctx",
  initial: {
    page: signal({ start: yearMonth, end: yearMonth }),
    locale: signal(undefined),
  },
};
