import { define } from "../core/element.js";
import {
  SelectBase,
  selectTemplate,
  type YearOption,
} from "./calendar-year-month-base.js";
import type { CalendarContextValue } from "../calendar-month/CalendarMonthContext.js";

function times<T>(n: number, fn: (i: number) => T) {
  return Array.from({ length: n }, (_, i) => fn(i));
}

export interface CalendarSelectYear {
  maxYears: number;
}

export class CalendarSelectYear extends SelectBase {
  static props = {
    maxYears: { type: Number, default: 20 },
  };

  static template = selectTemplate("Year");

  protected getOptions(context: CalendarContextValue): YearOption[] {
    const { min, max, focusedDate } = context;
    const maxYears = this.maxYears;

    const currentYear = focusedDate.toPlainYearMonth().year;

    const halfRange = Math.floor(maxYears / 2);
    const defaultMin = currentYear - halfRange;
    const defaultMax = currentYear + (maxYears - halfRange - 1);

    const minYear = Math.max(defaultMin, min?.year ?? -Infinity);
    const maxYear = Math.min(defaultMax, max?.year ?? Infinity);

    return times(maxYear - minYear + 1, (i) => {
      const year = minYear + i;
      return {
        label: `${year}`,
        value: `${year}`,
        selected: year === currentYear,
      };
    });
  }

  protected onChange(value: number) {
    const { focusedDate } = this.context();
    const diff = value - focusedDate.toPlainYearMonth().year;
    this.focusDay(focusedDate.add({ years: diff }));
  }
}

define("calendar-select-year", CalendarSelectYear);
