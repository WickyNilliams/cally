import type { PropDefs } from "../utils/base.js";
import type { CalendarContextValue } from "../calendar-month/CalendarMonthContext.js";
import { SelectBase, selectTemplate } from "./calendar-year-month-base.js";

interface SelectYearProps {
  maxYears: number;
}

export interface CalendarSelectYear extends SelectYearProps {}

export class CalendarSelectYear extends SelectBase<SelectYearProps> {
  static props: PropDefs<SelectYearProps> = {
    maxYears: [Number, 20],
  };

  static template = selectTemplate("Year");

  protected unit = "year" as const;

  protected getOptions({ min, max, focusedDate }: CalendarContextValue) {
    const { year } = focusedDate.value;
    const halfRange = Math.floor(this.maxYears / 2);
    const minYear = Math.max(year - halfRange, min.value?.year ?? -Infinity);
    const maxYear = Math.min(
      year + (this.maxYears - halfRange - 1),
      max.value?.year ?? Infinity,
    );

    return Array.from(
      { length: Math.max(0, maxYear - minYear + 1) },
      (_, i) => ({
        label: `${minYear + i}`,
        value: `${minYear + i}`,
      }),
    );
  }
}

CalendarSelectYear.define("calendar-select-year");

declare global {
  interface HTMLElementTagNameMap {
    "calendar-select-year": CalendarSelectYear;
  }
}
