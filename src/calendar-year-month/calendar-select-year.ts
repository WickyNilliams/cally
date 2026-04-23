import { SignalElement } from "../signal-element.js";
import { CalendarCtx } from "../calendar-month/CalendarMonthContext.js";
import { SELECT_STYLES, SELECT_TEMPLATE } from "./calendar-year-month-base.js";
import { PlainDate } from "../utils/temporal.js";
import { toDate } from "../utils/date.js";

const MAX_POOL = 400; // max option pool size

const yearProps = {
  maxYears: { type: Number, value: 20 },
} as const;

export class CalendarSelectYear extends SignalElement<typeof yearProps> {
  static properties = yearProps;
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
      opt.setAttribute("part", "option");
      pool.push(opt);
    }

    select.addEventListener("change", () => {
      const ctxSig = CalendarCtx.consume(this);
      if (!ctxSig) return;
      const ctx = ctxSig.value;
      const value = parseInt(select.value);
      const diff = value - ctx.focusedDate.toPlainYearMonth().year;
      const newDate = ctx.focusedDate.add({ years: diff });
      this.dispatchEvent(
        new CustomEvent("focusday", { bubbles: true, detail: newDate }),
      );
    });

    return () => {
      const ctxSig = CalendarCtx.consume(this);
      if (!ctxSig) return;

      this.createEffect(() => {
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
          const year = minYear + i;
          pool[i].value = String(year);
          pool[i].textContent = String(year);
        }

        select.replaceChildren(...pool.slice(0, count));
        select.value = String(currentYear);
      });
    };
  }
}

customElements.define("calendar-select-year", CalendarSelectYear);
