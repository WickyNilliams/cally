import { createContext } from "atomico";
import type { PlainDate, PlainYearMonth } from "../utils/temporal.js";
import { getToday, type DaysOfWeek } from "../utils/date.js";

interface CalendarContextBase {
  min?: PlainDate;
  max?: PlainDate;
  today?: PlainDate;
  firstDayOfWeek: DaysOfWeek;
  isDateDisallowed?: (date: Date) => boolean;
  getDayParts?: (date: Date) => string;
  page: { start: PlainYearMonth; end: PlainYearMonth };
  focusedDate: PlainDate;
  showOutsideDays?: boolean;
  showWeekNumbers?: boolean;
  locale?: string;
  formatWeekday: "narrow" | "short";
}

export interface CalendarDateContext extends CalendarContextBase {
  type: "date";
  value?: PlainDate;
}

export interface CalendarRangeContext extends CalendarContextBase {
  type: "range";
  value: [PlainDate, PlainDate] | [];
}

export interface CalendarMultiContext extends CalendarContextBase {
  type: "multi";
  value: PlainDate[];
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
