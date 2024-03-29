import { createContext } from "atomico";
import { DateWindow } from "../utils/DateWindow.js";
import type { PlainDate } from "../utils/temporal.js";
import { today, type DaysOfWeek } from "../utils/date.js";

interface CalendarMonthContextBase {
  min?: PlainDate;
  max?: PlainDate;
  firstDayOfWeek: DaysOfWeek;
  isDateDisallowed?: (date: Date) => boolean;
  dateWindow: DateWindow;
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
  firstDayOfWeek: 0,
  isDateDisallowed: () => false,
  dateWindow: new DateWindow(t.toPlainYearMonth(), { months: 1 }, t),
});

customElements.define("calendar-month-ctx", CalendarMonthContext);
