import { CalendarMonth } from "./calendar-month/calendar-month.js";
import { CalendarDate } from "./calendar-date/calendar-date.js";
import { CalendarSelectYear } from "./calendar-year-month/calendar-select-year.js";
import { CalendarSelectMonth } from "./calendar-year-month/calendar-select-month.js";
import { CalendarRange } from "./calendar-range/calendar-range.js";
import { CalendarMulti } from "./calendar-multi/calendar-multi.js";
import { CalendarHeading } from "./calendar-heading/calendar-heading.js";
import type {
  CalendarFocusOptions,
  CalendarProps,
  PageChangeDetail,
} from "./calendar-base/calendar-base.js";

export {
  CalendarMonth,
  CalendarDate,
  CalendarRange,
  CalendarMulti,
  CalendarSelectYear,
  CalendarSelectMonth,
  CalendarHeading,
};

type Simplify<T> = {
  [K in keyof T]: T[K];
} & {};

type ComponentProps<T> = Simplify<Partial<T>>;

interface CalendarBaseProps extends CalendarProps {
  focus: (options?: CalendarFocusOptions) => void;
  onChange: (event: Event) => any;
  onFocusDay: (event: CustomEvent<Date>) => any;
  onPageChange: (event: CustomEvent<PageChangeDetail>) => any;
}

// export props for use in react/vue/etc
export type CalendarMonthProps = ComponentProps<
  Pick<CalendarMonth, "offset"> & {
    onSelectDay: (event: CustomEvent<string>) => any;
    onFocusDay: (event: CustomEvent<string>) => any;
    onHoverDay: (event: CustomEvent<string>) => any;
  }
>;
export type CalendarDateProps = ComponentProps<CalendarBaseProps>;
export type CalendarRangeProps = ComponentProps<
  CalendarBaseProps &
    Pick<CalendarRange, "tentative"> & {
      onRangeStart: (event: CustomEvent<Date>) => any;
      onRangeEnd: (event: CustomEvent<Date>) => any;
    }
>;
export type CalendarMultiProps = ComponentProps<CalendarBaseProps>;
export type CalendarSelectYearProps = ComponentProps<
  Pick<CalendarSelectYear, "maxYears">
>;
export type CalendarSelectMonthProps = ComponentProps<
  Pick<CalendarSelectMonth, "formatMonth">
>;
export type CalendarHeadingProps = ComponentProps<
  Pick<CalendarHeading, "year" | "month">
>;
