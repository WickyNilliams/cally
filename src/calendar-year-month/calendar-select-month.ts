import { SignalElement, fire } from "../signal-element.js";
import { CalendarCtx } from "../calendar-month/CalendarMonthContext.js";
import { SELECT_STYLES, SELECT_TEMPLATE } from "./calendar-year-month-base.js";
import { PlainYearMonth } from "../utils/temporal.js";
import { makeDateFormatter } from "../utils/hooks.js";
import { diffInMonths } from "../calendar-base/useCalendarBase.js";

const monthProps = {
  formatMonth: { type: String, value: "long" },
} as const;

// Pre-create 12 options — fixed for month select
const MONTH_COUNT = 12;

export class CalendarSelectMonth extends SignalElement<typeof monthProps> {
  static properties = monthProps;
  static styles = SELECT_STYLES;
  static template = SELECT_TEMPLATE;

  setup() {
    const root = this.shadowRoot!;
    const select = root.querySelector<HTMLSelectElement>("select")!;
    const labelSlot = root.querySelector<HTMLSlotElement>("slot")!;

    labelSlot.textContent = "Month";

    // Pre-create exactly 12 options
    const pool: HTMLOptionElement[] = [];
    for (let i = 0; i < MONTH_COUNT; i++) {
      const opt = document.createElement("option");
      opt.part.add("option");
      pool.push(opt);
    }
    select.replaceChildren(...pool);

    return () => {
      const ctxSig = CalendarCtx.consume(this);
      if (!ctxSig) return;

      select.addEventListener("change", () => {
        const ctx = ctxSig.value;
        const value = +select.value;
        const diff = value - ctx.focusedDate.tym().month;
        const newDate = ctx.focusedDate.add("m", diff);
        fire(this, "focusday", newDate);
      });

      this.fx(() => {
        const ctx = ctxSig.value;
        const fmt = makeDateFormatter(
          { month: (this.$.formatMonth.value as string) as "long" | "short" },
          ctx.locale
        );

        const focusedYearMonth = ctx.focusedDate.tym();
        const day = new Date(Date.UTC(2000, 0, 1));

        for (let i = 0; i < MONTH_COUNT; i++) {
          const monthNum = i + 1;
          day.setUTCMonth(i);
          const ym = new PlainYearMonth(focusedYearMonth.year, monthNum);
          const isDisabled =
            (ctx.min != null && diffInMonths(ym, ctx.min) > 0) ||
            (ctx.max != null && diffInMonths(ym, ctx.max) < 0);
          pool[i].value = ""+monthNum;
          pool[i].textContent = fmt.format(day);
          pool[i].disabled = isDisabled;
        }

        select.value = ""+focusedYearMonth.month;
      });
    };
  }
}

customElements.define("calendar-select-month", CalendarSelectMonth);
