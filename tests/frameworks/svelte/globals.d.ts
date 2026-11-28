import type {
  CalendarRangeProps,
  CalendarMonthProps,
  CalendarDateProps,
} from "cally";

// e.g. onchange in Svelte 5, or on:change in Svelte 4
type MapEvents<T> = {
  [K in keyof T as K extends `on${infer E}`
    ? `on${Lowercase<E>}` | `on:${Lowercase<E>}`
    : K]: T[K];
};

declare module "svelte/elements" {
  interface SvelteHTMLElements {
    "calendar-range": MapEvents<CalendarRangeProps>;
    "calendar-month": MapEvents<CalendarMonthProps>;
    "calendar-date": MapEvents<CalendarDateProps>;
  }
}
