import type { Context } from "../utils/base.js";
import {
  CalendarHeadingContext,
  type Page,
} from "../calendar-heading/CalendarHeadingContext.js";
import { signal, type ReadonlySignal } from "../utils/signals.js";
import type { PlainDate } from "../utils/temporal.js";
import { getToday, getWeekNumber, type DaysOfWeek } from "../utils/date.js";

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
  /** given the first day of a week, as shown */
  getWeekNumber: ReadonlySignal<(date: Date) => number>;
  page: ReadonlySignal<Page>;
  focusedDate: ReadonlySignal<PlainDate>;
  showOutsideDays: ReadonlySignal<boolean | undefined>;
  showWeekNumbers: ReadonlySignal<boolean | undefined>;
  locale: ReadonlySignal<string | undefined>;
  formatWeekday: ReadonlySignal<"narrow" | "short">;
}

const t = getToday();
const heading = CalendarHeadingContext.initial;
// a default of undefined, which is all it ever holds
const none = heading.locale as ReadonlySignal<undefined>;

export const CalendarContext: Context<CalendarContextValue> = {
  name: "calendar-ctx",
  initial: {
    ...heading,
    type: "date",
    value: signal([]),
    min: none,
    max: none,
    today: none,
    firstDayOfWeek: signal(1),
    isDateDisallowed: none,
    getDayParts: none,
    getWeekNumber: signal(getWeekNumber),
    focusedDate: signal(t),
    showOutsideDays: none,
    showWeekNumbers: none,
    formatWeekday: signal("narrow"),
  },
};
