import type { PropDefs } from "../utils/base.js";
import { getFormatter } from "../utils/date.js";
import { PlainYearMonth, type PlainDate } from "../utils/temporal.js";
import { SelectBase, option, template } from "./calendar-year-month-base.js";

interface SelectMonthProps {
  formatMonth: "long" | "short";
}

export interface CalendarSelectMonth extends SelectMonthProps {}

export class CalendarSelectMonth extends SelectBase<SelectMonthProps> {
  static props: PropDefs<SelectMonthProps> = {
    formatMonth: [String, "long"],
  };

  static template = template("Month", option.repeat(12));

  constructor() {
    super();
    const { context, select } = this;

    this.effect(() => {
      const { min, max, focusedDate, locale } = context.value;
      const focused = focusedDate.value.toPlainYearMonth();
      const formatter = getFormatter({ month: this.formatMonth }, locale.value);
      const day = new Date();
      day.setUTCDate(1);

      [...select.options].forEach((option, i) => {
        const yearMonth = new PlainYearMonth(focused.year, i + 1);
        day.setUTCMonth(i);

        option.label = formatter.format(day);
        option.value = `${i + 1}`;
        option.disabled =
          (min.value != null &&
            PlainYearMonth.compare(yearMonth, min.value) < 0) ||
          (max.value != null &&
            PlainYearMonth.compare(yearMonth, max.value) > 0);
      });

      select.value = `${focused.month}`;
    });
  }

  protected getDate(month: number, focusedDate: PlainDate) {
    return focusedDate.add({ months: month - focusedDate.month });
  }
}

CalendarSelectMonth.define("calendar-select-month");
