import { createContext } from "atomico";
import { DateWindow } from "../utils/DateWindow.js";
import type { PlainDate } from "../utils/temporal.js";
import { today, type DaysOfWeek } from "../utils/utils.js";

type CalendarMonthContextBase = {
  min?: PlainDate;
  max?: PlainDate;
  firstDayOfWeek: DaysOfWeek;
  isDateDisallowed?: (date: Date) => boolean;
  dateWindow: DateWindow;
  locale: string | undefined;
  showOutsideDays?: boolean;
};

interface CalendarDateContext extends CalendarMonthContextBase {
  value?: PlainDate;
}

interface CalendarRangeContext extends CalendarMonthContextBase {
  highlightedRange: { start?: PlainDate; end?: PlainDate };
}

export type CalendarMonthContextValue =
  | CalendarDateContext
  | CalendarRangeContext;

const t = today();
export const CalendarMonthContext = createContext<CalendarMonthContextValue>({
  firstDayOfWeek: 0,
  highlightedRange: {},
  isDateDisallowed: () => false,
  locale: undefined,
  dateWindow: new DateWindow(t.toPlainYearMonth(), { months: 1 }, t),
});

customElements.define("calendar-month-ctx", CalendarMonthContext);
