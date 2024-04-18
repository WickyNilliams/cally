import { createContext } from "atomico";
import type { PlainDate, PlainYearMonth } from "../utils/temporal.js";
import { today, type DaysOfWeek } from "../utils/date.js";

interface CalendarMonthContextBase {
  min?: PlainDate;
  max?: PlainDate;
  firstDayOfWeek: DaysOfWeek;
  isDateDisallowed?: (date: Date) => boolean;
  page: { start: PlainYearMonth; end: PlainYearMonth };
  focusedDate: PlainDate;
  showOutsideDays?: boolean;
  locale?: string;
}

export interface CalendarDateContext extends CalendarMonthContextBase {
  value?: PlainDate;
}

export interface CalendarRangeContext extends CalendarMonthContextBase {
  highlightedRange: [PlainDate, PlainDate] | [];
}

export type CalendarMonthContextValue =
  | CalendarDateContext
  | CalendarRangeContext;

const t = today();

export const CalendarMonthContext = createContext<CalendarMonthContextValue>({
  firstDayOfWeek: 1,
  isDateDisallowed: () => false,
  focusedDate: t,
  page: { start: t.toPlainYearMonth(), end: t.toPlainYearMonth() },
});

customElements.define("calendar-month-ctx", CalendarMonthContext);
