import { SignalElement } from "../signal-element.js";
import { CalendarCtx } from "../calendar-month/CalendarMonthContext.js";
import { SELECT_STYLES, SELECT_TEMPLATE } from "./calendar-year-month-base.js";
import { PlainYearMonth } from "../utils/temporal.js";
import { makeDateFormatter } from "../utils/hooks.js";

const monthProps = {
  formatMonth: { type: String, value: (): "long" | "short" => "long" },
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
      opt.setAttribute("part", "option");
      pool.push(opt);
    }
    select.replaceChildren(...pool);

    select.addEventListener("change", () => {
      const ctxSig = CalendarCtx.consume(this);
      if (!ctxSig) return;
      const ctx = ctxSig.value;
      const value = parseInt(select.value);
      const diff = value - ctx.focusedDate.toPlainYearMonth().month;
      const newDate = ctx.focusedDate.add({ months: diff });
      this.dispatchEvent(
        new CustomEvent("focusday", { bubbles: true, detail: newDate }),
      );
    });

    return () => {
      const ctxSig = CalendarCtx.consume(this);
      if (!ctxSig) return;

      this.createEffect(() => {
        const ctx = ctxSig.value;
        const fmt = makeDateFormatter(
          { month: this.$.formatMonth.value as string as "long" | "short" },
          ctx.locale,
        );

        const focusedYearMonth = ctx.focusedDate.toPlainYearMonth();

        // Build month names (ordered Jan–Dec)
        const monthNames: string[] = [];
        const day = new Date();
        day.setUTCDate(1);
        for (let i = 0; i < MONTH_COUNT; i++) {
          const idx = (day.getUTCMonth() + 12) % 12;
          monthNames[idx] = fmt.format(day);
          day.setUTCMonth(day.getUTCMonth() + 1);
        }

        for (let i = 0; i < MONTH_COUNT; i++) {
          const monthNum = i + 1;
          const yearMonth = focusedYearMonth.add({
            months: monthNum - focusedYearMonth.month,
          });
          const isDisabled =
            (ctx.min != null &&
              PlainYearMonth.compare(yearMonth, ctx.min) < 0) ||
            (ctx.max != null && PlainYearMonth.compare(yearMonth, ctx.max) > 0);

          pool[i].value = String(monthNum);
          pool[i].textContent = monthNames[i];
          pool[i].disabled = isDisabled;
        }

        select.value = String(focusedYearMonth.month);
      });
    };
  }
}

customElements.define("calendar-select-month", CalendarSelectMonth);
