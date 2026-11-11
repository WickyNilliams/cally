import { template, type PropDefs } from "../utils/base.js";
import type { PlainDate } from "../utils/temporal.js";
import {
  SelectBase,
  option,
  selectTemplate,
} from "./calendar-year-month-base.js";

interface SelectYearProps {
  maxYears: number;
}

const optionTemplate = template(option);

export interface CalendarSelectYear extends SelectYearProps {}

export class CalendarSelectYear extends SelectBase<SelectYearProps> {
  static props: PropDefs<SelectYearProps> = {
    maxYears: [Number, 20],
  };

  static template = selectTemplate("Year");

  constructor() {
    super();
    const { context, select } = this;
    const { options } = select;

    this.effect(() => {
      const { min, max, focusedDate } = context.value;
      const { year } = focusedDate.value;

      const halfRange = Math.floor(this.maxYears / 2);
      const minYear = Math.max(year - halfRange, min.value?.year ?? -Infinity);
      const maxYear = Math.min(
        year + (this.maxYears - halfRange - 1),
        max.value?.year ?? Infinity,
      );
      const count = Math.max(0, maxYear - minYear + 1);

      // the number of years is not known up front, so top up or trim as necessary
      while (options.length < count) {
        select.append(optionTemplate.content.cloneNode(true));
      }
      while (options.length > count) {
        select.lastChild!.remove();
      }

      [...options].forEach((option, i) => {
        option.label = option.value = `${minYear + i}`;
      });

      select.value = `${year}`;
    });
  }

  protected getDate(year: number, focusedDate: PlainDate) {
    return focusedDate.add({ years: year - focusedDate.year });
  }
}

CalendarSelectYear.define("calendar-select-year");
