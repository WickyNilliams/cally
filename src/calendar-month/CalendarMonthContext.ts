import type { Context } from "../utils/base.js";
import type { Page } from "../calendar-heading/CalendarHeadingContext.js";
import { signal, type ReadonlySignal } from "../utils/signals.js";
import type { PlainDate } from "../utils/temporal.js";
import { getToday, type DaysOfWeek } from "../utils/date.js";

/** What descendants of a calendar dispatch, for the calendar to act upon */
export interface DayEvents {
  selectday: PlainDate;
  focusday: PlainDate;
  hoverday: PlainDate;
}

export type CalendarType = "date" | "range" | "multi";

export interface CalendarContextValue {
  type: CalendarType;
  /**
   * The selected dates, regardless of type:
   * - date: zero or one dates
   * - range: empty, or the start and end of the range
   * - multi: any number of dates
   */
  value: ReadonlySignal<PlainDate[]>;
  min: ReadonlySignal<PlainDate | undefined>;
  max: ReadonlySignal<PlainDate | undefined>;
  today: ReadonlySignal<PlainDate | undefined>;
  firstDayOfWeek: ReadonlySignal<DaysOfWeek>;
  isDateDisallowed: ReadonlySignal<((date: Date) => boolean) | undefined>;
  getDayParts: ReadonlySignal<((date: Date) => string) | undefined>;
  page: ReadonlySignal<Page>;
  focusedDate: ReadonlySignal<PlainDate>;
  showOutsideDays: ReadonlySignal<boolean | undefined>;
  showWeekNumbers: ReadonlySignal<boolean | undefined>;
  locale: ReadonlySignal<string | undefined>;
  formatWeekday: ReadonlySignal<"narrow" | "short">;
}

const t = getToday();
const none = signal(undefined);

export const CalendarContext: Context<CalendarContextValue> = {
  name: "calendar-ctx",
  initial: {
    type: "date",
    value: signal([]),
    min: none,
    max: none,
    today: none,
    firstDayOfWeek: signal(1),
    isDateDisallowed: none,
    getDayParts: none,
    page: signal({ start: t.toPlainYearMonth(), end: t.toPlainYearMonth() }),
    focusedDate: signal(t),
    showOutsideDays: none,
    showWeekNumbers: none,
    locale: none,
    formatWeekday: signal("narrow"),
  },
};
