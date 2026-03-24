import { createContext, signal, type ReadonlySignal } from "../signal-element.js";
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

/** Signal-based context handle used by all components */
export const CalendarCtx = createContext<ReadonlySignal<CalendarContextValue>>("calendar");

const t = getToday();
const DEFAULT_CONTEXT: CalendarContextValue = {
  type: "date",
  firstDayOfWeek: 1,
  focusedDate: t,
  page: { start: t.toPlainYearMonth(), end: t.toPlainYearMonth() },
};

/**
 * Vanilla WC wrapper used in calendar-month tests.
 * Tests wrap <CalendarMonth> in <CalendarContext value={...}> to provide context.
 */
export class CalendarContext extends HTMLElement {
  #sig = signal<CalendarContextValue>(DEFAULT_CONTEXT);

  connectedCallback() {
    CalendarCtx.provide(this, this.#sig);
  }

  get value(): CalendarContextValue {
    return this.#sig.value;
  }

  set value(v: CalendarContextValue) {
    this.#sig.value = v;
  }
}

customElements.define("calendar-ctx", CalendarContext);
