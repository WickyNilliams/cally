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
  formatWeekday: "narrow" | "short";
}

export interface CalendarDateContext extends CalendarMonthContextBase {
  type: "date";
  value?: PlainDate;
}

export interface CalendarRangeContext extends CalendarMonthContextBase {
  type: "range";
  value: [PlainDate, PlainDate] | [];
}

export interface CalendarMultiContext extends CalendarMonthContextBase {
  type: "multi";
  value: PlainDate[];
}

export type CalendarMonthContextValue =
  | CalendarDateContext
  | CalendarRangeContext
  | CalendarMultiContext;

const t = today();

export const CalendarMonthContext = createContext<CalendarMonthContextValue>({
  focusedDate: t,
  page: { start: t.toPlainYearMonth(), end: t.toPlainYearMonth() },
} as CalendarMonthContextValue);

customElements.define("calendar-month-ctx", CalendarMonthContext);
