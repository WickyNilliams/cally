import { CalendarMonth } from "./calendar-month/calendar-month.js";
import { CalendarDate } from "./calendar-date/calendar-date.js";
import { CalendarSelectYear } from "./calendar-year-month/calendar-select-year.js";
import { CalendarSelectMonth } from "./calendar-year-month/calendar-select-month.js";
import { CalendarRange } from "./calendar-range/calendar-range.js";
import { CalendarMulti } from "./calendar-multi/calendar-multi.js";
import { CalendarHeading } from "./calendar-heading/calendar-heading.js";
import type { Pagination } from "./calendar-base/calendar-base.js";
import type { DaysOfWeek } from "./utils/date.js";

export {
  CalendarMonth,
  CalendarDate,
  CalendarRange,
  CalendarMulti,
  CalendarSelectYear,
  CalendarSelectMonth,
  CalendarHeading,
};

interface CalendarBaseProps {
  value: string;
  min: string;
  max: string;
  today: string;
  isDateDisallowed: (date: Date) => boolean;
  formatWeekday: "narrow" | "short";
  getDayParts: (date: Date) => string;
  firstDayOfWeek: DaysOfWeek;
  showOutsideDays: boolean;
  locale: string | undefined;
  months: number;
  focusedDate: string | undefined;
  pageBy: Pagination;
  showWeekNumbers: boolean;
}

// export props for use in react/vue/etc
export type CalendarMonthProps = Partial<{ offset: number }>;
export type CalendarDateProps = Partial<CalendarBaseProps>;
export type CalendarRangeProps = Partial<
  CalendarBaseProps & { tentative: string }
>;
export type CalendarMultiProps = Partial<CalendarBaseProps>;
export type CalendarSelectYearProps = Partial<{ maxYears: number }>;
export type CalendarSelectMonthProps = Partial<{
  formatMonth: "long" | "short";
}>;
export type CalendarHeadingProps = Partial<{
  year: "numeric" | "2-digit" | undefined;
  month: "numeric" | "2-digit" | "long" | "short" | "narrow" | undefined;
}>;
