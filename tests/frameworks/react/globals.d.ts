import type {
  CalendarRangeProps,
  CalendarMonthProps,
  CalendarDateProps,
  CalendarMultiProps,
} from "cally";

type MapEvents<T> = {
  [K in keyof T as K extends `on${infer E}` ? `on${Lowercase<E>}` : K]: T[K];
};

declare module "react" {
  namespace JSX {
    interface IntrinsicElements {
      "calendar-month": MapEvents<CalendarMonthProps> &
        React.HTMLAttributes<HTMLElement>;
      "calendar-range": MapEvents<CalendarRangeProps> &
        React.HTMLAttributes<HTMLElement>;
      "calendar-date": MapEvents<CalendarDateProps> &
        React.HTMLAttributes<HTMLElement>;
      "calendar-multi": MapEvents<CalendarMultiProps> &
        React.HTMLAttributes<HTMLElement>;
    }
  }
}
