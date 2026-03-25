import type { ReadonlySignal } from "../signal-element.js";
import type { PlainDate, PlainYearMonth } from "../utils/temporal.js";
import type { DaysOfWeek } from "../utils/date.js";

export interface CalendarContextBase {
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

/** Signal-based context handle used by all components */
export const CalendarCtx = {
  provide(host: HTMLElement, value: ReadonlySignal<CalendarContextValue>) {
    host.addEventListener("_c", (e: Event) => {
      e.stopPropagation();
      (e as CustomEvent<{ value?: ReadonlySignal<CalendarContextValue> }>).detail.value = value;
    });
  },
  consume(host: HTMLElement): ReadonlySignal<CalendarContextValue> | undefined {
    const detail: { value?: ReadonlySignal<CalendarContextValue> } = {};
    host.dispatchEvent(new CustomEvent("_c", { bubbles: true, composed: true, detail }));
    return detail.value;
  },
};
