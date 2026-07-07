import { define } from "../core/element.js";
import {
  SelectBase,
  selectTemplate,
  type MonthOption,
} from "./calendar-year-month-base.js";
import type { CalendarContextValue } from "../calendar-month/CalendarMonthContext.js";
import { dateFormatter } from "../utils/parse.js";
import { PlainYearMonth } from "../utils/temporal.js";

export interface CalendarSelectMonth {
  formatMonth: "long" | "short";
}

export class CalendarSelectMonth extends SelectBase {
  static props = {
    formatMonth: { type: String, default: "long" },
  };

  static template = selectTemplate("Month");

  protected getOptions(context: CalendarContextValue): MonthOption[] {
    const { min, max, focusedDate, locale } = context;
    const formatter = dateFormatter({ month: this.formatMonth }, locale);

    const monthNames = [];
    const day = new Date();
    day.setUTCDate(1);

    for (var i = 0; i < 12; i++) {
      const index = (day.getUTCMonth() + 12) % 12;
      monthNames[index] = formatter.format(day);
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

  protected onChange(value: number) {
    const { focusedDate } = this.context();
    const diff = value - focusedDate.toPlainYearMonth().month;
    this.focusDay(focusedDate.add({ months: diff }));
  }
}

define("calendar-select-month", CalendarSelectMonth);
