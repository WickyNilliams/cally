import { define, num, template } from "../core/element.js";
import { SelectBase, type YearOption } from "./calendar-year-month-base.js";
import { selectHtml } from "./calendar-year-month.template.js";
import type { CalendarContextValue } from "../calendar-month/CalendarMonthContext.js";

export interface CalendarSelectYear {
  maxYears: number;
}

export class CalendarSelectYear extends SelectBase {
  static props_ = {
    maxYears: num(20),
  };

  static template_ = template(selectHtml("Year"));

  protected getOptions_(context: CalendarContextValue): YearOption[] {
    const { min, max, focusedDate } = context;
    const maxYears = this.maxYears;

    const currentYear = focusedDate.toPlainYearMonth().year;

    const halfRange = Math.floor(maxYears / 2);
    const defaultMin = currentYear - halfRange;
    const defaultMax = currentYear + (maxYears - halfRange - 1);

    const minYear = Math.max(defaultMin, min?.year ?? -Infinity);
    const maxYear = Math.min(defaultMax, max?.year ?? Infinity);

    return Array.from({ length: maxYear - minYear + 1 }, (_, i) => {
      const year = minYear + i;
      return {
        label: `${year}`,
        value: `${year}`,
        selected: year === currentYear,
      };
    });
  }

  protected onChange_(value: number) {
    const { focusedDate } = this.context_();
    const diff = value - focusedDate.toPlainYearMonth().year;
    this.focusDay_(focusedDate.add({ years: diff }));
  }
}

define("calendar-select-year", CalendarSelectYear);
