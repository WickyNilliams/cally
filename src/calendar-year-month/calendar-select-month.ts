import type { PropDefs } from "../utils/base.js";
import { getFormatter } from "../utils/date.js";
import { PlainYearMonth } from "../utils/temporal.js";
import type { CalendarContextValue } from "../calendar-month/CalendarMonthContext.js";
import { SelectBase, selectTemplate } from "./calendar-year-month-base.js";

interface SelectMonthProps {
  /** Whether months have long ("January") or short ("Jan") names. Names depend on the calendar's locale */
  formatMonth: "long" | "short";
}

export interface CalendarSelectMonth extends SelectMonthProps {}

/**
 * A select for changing the month shown by a calendar
 *
 * @slot label - The label for the select. Defaults to "Month"
 *
 * @csspart label - The `<label>` for the `<select>`
 * @csspart select - The `<select>` element itself
 * @csspart option - The `<option>` for each month
 */
export class CalendarSelectMonth extends SelectBase<SelectMonthProps> {
  static props: PropDefs<SelectMonthProps> = {
    formatMonth: [String, "long"],
  };

  static template = selectTemplate("Month");

  protected unit = "month" as const;

  protected getOptions({
    min,
    max,
    focusedDate,
    locale,
  }: CalendarContextValue) {
    const { year } = focusedDate.value;
    const formatter = getFormatter({ month: this.formatMonth }, locale.value);
    const day = new Date();
    day.setUTCDate(1);

    return Array.from({ length: 12 }, (_, i) => {
      const yearMonth = new PlainYearMonth(year, i + 1);
      day.setUTCMonth(i);

      return {
        label: formatter.format(day),
        value: `${i + 1}`,
        disabled:
          (min.value != null &&
            PlainYearMonth.compare(yearMonth, min.value) < 0) ||
          (max.value != null &&
            PlainYearMonth.compare(yearMonth, max.value) > 0),
      };
    });
  }
}

CalendarSelectMonth.define("calendar-select-month");

declare global {
  interface HTMLElementTagNameMap {
    "calendar-select-month": CalendarSelectMonth;
  }
}
