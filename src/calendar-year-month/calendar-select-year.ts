import { SignalElement, fire } from "../signal-element.js";
import { CalendarCtx } from "../calendar-month/CalendarMonthContext.js";
import { SELECT_STYLES, SELECT_TEMPLATE } from "./calendar-year-month-base.js";

const MAX_POOL = 400;

export class CalendarSelectYear extends SignalElement<{
  maxYears: { type: typeof Number; value: number };
}> {
  static properties = {
    maxYears: { type: Number, value: 20 },
  };
  static styles = SELECT_STYLES;
  static template = SELECT_TEMPLATE;

  setup() {
    const root = this.shadowRoot!;
    const select = root.querySelector<HTMLSelectElement>("select")!;
    const labelSlot = root.querySelector<HTMLSlotElement>("slot")!;

    // Set default label text in slot
    labelSlot.textContent = "Year";

    // Pre-create option pool — only once in setup, never in effects
    const pool: HTMLOptionElement[] = [];
    for (let i = 0; i < MAX_POOL; i++) {
      const opt = document.createElement("option");
      opt.part.add("option");
      pool.push(opt);
    }

    return () => {
      const ctxSig = CalendarCtx.consume(this);
      if (!ctxSig) return;

      select.addEventListener("change", () => {
        const ctx = ctxSig.value;
        const value = +select.value;
        const diff = value - ctx.focusedDate.toPlainYearMonth().year;
        const newDate = ctx.focusedDate.add("y", diff);
        fire(this, "focusday", newDate);
      });

      this.fx(() => {
        const ctx = ctxSig.value;
        const maxYears = this.$.maxYears.value as number;
        const focusedYearMonth = ctx.focusedDate.toPlainYearMonth();
        const currentYear = focusedYearMonth.year;

        const halfRange = Math.floor(maxYears / 2);
        const defaultMin = currentYear - halfRange;
        const defaultMax = currentYear + (maxYears - halfRange - 1);

        const minYear = Math.max(defaultMin, ctx.min?.year ?? -Infinity);
        const maxYear = Math.min(defaultMax, ctx.max?.year ?? Infinity);
        const count = Math.min(maxYear - minYear + 1, MAX_POOL);

        for (let i = 0; i < count; i++) {
          pool[i].value = pool[i].textContent = ""+(minYear + i);
        }

        select.replaceChildren(...pool.slice(0, count));
        select.value = ""+currentYear;
      });
    };
  }
}

customElements.define("calendar-select-year", CalendarSelectYear);
