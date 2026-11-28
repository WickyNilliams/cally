import type { DefineComponent } from "vue";
import type {
  CalendarRangeProps,
  CalendarMonthProps,
  CalendarDateProps,
} from "cally";

interface CallyComponents {
  "calendar-range": DefineComponent<CalendarRangeProps>;
  "calendar-date": DefineComponent<CalendarDateProps>;
  "calendar-month": DefineComponent<CalendarMonthProps>;
}

declare module "vue" {
  interface GlobalComponents extends CallyComponents {}
}

declare global {
  namespace JSX {
    interface IntrinsicElements extends CallyComponents {}
  }
}
