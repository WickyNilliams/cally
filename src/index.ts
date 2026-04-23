import { CalendarMonth } from "./calendar-month/calendar-month";
import { CalendarDate } from "./calendar-date/calendar-date";
import { CalendarSelectYear } from "./calendar-year-month/calendar-select-year";
import { CalendarSelectMonth } from "./calendar-year-month/calendar-select-month";
import { CalendarRange } from "./calendar-range/calendar-range";
import { CalendarMulti } from "./calendar-multi/calendar-multi";
import { CalendarHeading } from "./calendar-heading/calendar-heading";

export {
  CalendarMonth,
  CalendarDate,
  CalendarRange,
  CalendarMulti,
  CalendarSelectYear,
  CalendarSelectMonth,
  CalendarHeading,
};

import type { AtomicoThis } from "atomico/types/dom";

type Simplify<T> = {
  [K in keyof T]: T[K];
} & {};

type ComponentProps<T extends abstract new (...args: any) => any> = Simplify<
  Partial<Omit<InstanceType<T>, keyof HTMLElement | keyof AtomicoThis>>
>;

// export props for use in react/vue/etc
export type CalendarMonthProps = ComponentProps<typeof CalendarMonth>;
export type CalendarDateProps = ComponentProps<typeof CalendarDate>;
export type CalendarRangeProps = ComponentProps<typeof CalendarRange>;
export type CalendarMultiProps = ComponentProps<typeof CalendarMulti>;
export type CalendarSelectYearProps = ComponentProps<typeof CalendarSelectYear>;
export type CalendarSelectMonthProps = ComponentProps<
  typeof CalendarSelectMonth
>;
export type CalendarHeadingProps = ComponentProps<typeof CalendarHeading>;
