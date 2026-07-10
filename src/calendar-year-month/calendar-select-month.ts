import { define, str, template } from "../core/element.js";
import { SelectBase, type MonthOption } from "./calendar-year-month-base.js";
import { selectHtml } from "./calendar-year-month.template.js";
import type { CalendarContextValue } from "../calendar-month/CalendarMonthContext.js";
import { dateFormatter } from "../utils/parse.js";
import { PlainYearMonth } from "../utils/temporal.js";

export interface CalendarSelectMonth {
  formatMonth: "long" | "short";
}

export class CalendarSelectMonth extends SelectBase {
  static props_ = {
    formatMonth: str<"long" | "short">("long"),
  };

  static template_ = template(selectHtml("Month"));

  protected getOptions_(context: CalendarContextValue): MonthOption[] {
    const { min, max, focusedDate, locale } = context;
    const formatter = dateFormatter({ month: this.formatMonth }, locale);

    const monthNames = [];
    const day = new Date();
    day.setUTCDate(1);

    for (var i = 0; i < 12; i++) {
      monthNames[day.getUTCMonth()] = formatter.format(day);
      day.setUTCMonth(day.getUTCMonth() + 1);
    }

    const focusedYearMonth = focusedDate.toPlainYearMonth();

    return monthNames.map((label, index) => {
      const i = index + 1;
      const yearMonth = focusedYearMonth.add({
        months: i - focusedYearMonth.month,
      });

      const isDisabled =
        (min != null && PlainYearMonth.compare(yearMonth, min) < 0) ||
        (max != null && PlainYearMonth.compare(yearMonth, max) > 0);

      return {
        label,
        value: `${i}`,
        disabled: isDisabled,
        selected: i === focusedYearMonth.month,
      };
    });
  }

  protected onChange_(value: number) {
    const { focusedDate } = this.context_();
    const diff = value - focusedDate.toPlainYearMonth().month;
    this.focusDay_(focusedDate.add({ months: diff }));
  }
}

define("calendar-select-month", CalendarSelectMonth);
