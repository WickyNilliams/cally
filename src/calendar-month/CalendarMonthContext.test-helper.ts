import { signal } from "../signal-element.js";
import { CalendarCtx, type CalendarContextValue } from "./CalendarMonthContext.js";
import { getToday } from "../utils/date.js";

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
