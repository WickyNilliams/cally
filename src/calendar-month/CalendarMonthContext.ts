import { createContext } from "atomico";
import { getToday, type DaysOfWeek } from "../utils/date.js";

interface CalendarContextBase {
  min?: Temporal.PlainDate;
  max?: Temporal.PlainDate;
  today?: Temporal.PlainDate;
  firstDayOfWeek: DaysOfWeek;
  isDateDisallowed?: (date: Date) => boolean;
  getDayParts?: (date: Date) => string;
  page: { start: Temporal.PlainYearMonth; end: Temporal.PlainYearMonth };
  focusedDate: Temporal.PlainDate;
  showOutsideDays?: boolean;
  locale?: string;
  formatWeekday: "narrow" | "short";
}

export interface CalendarDateContext extends CalendarContextBase {
  type: "date";
  value?: Temporal.PlainDate;
}

export interface CalendarRangeContext extends CalendarContextBase {
  type: "range";
  value: [Temporal.PlainDate, Temporal.PlainDate] | [];
}

export interface CalendarMultiContext extends CalendarContextBase {
  type: "multi";
  value: Temporal.PlainDate[];
}

export type CalendarContextValue =
  | CalendarDateContext
  | CalendarRangeContext
  | CalendarMultiContext;

const t = getToday();

export const CalendarContext = createContext<CalendarContextValue>({
  type: "date",
  firstDayOfWeek: 1,
  focusedDate: t,
  page: { start: t.toPlainYearMonth(), end: t.toPlainYearMonth() },
} as CalendarContextValue);

customElements.define("calendar-ctx", CalendarContext);
