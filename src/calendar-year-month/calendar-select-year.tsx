import { c, useContext, useEvent, type Host } from "atomico";
import { CalendarContext } from "../calendar-month/CalendarMonthContext.js";
import { PlainDate } from "../utils/temporal.js";
import {
  SelectBase,
  styles,
  type ChangeEvent,
  type YearOption,
} from "./calendar-year-month-base.js";

function times<T>(n: number, fn: (i: number) => T) {
  return Array.from({ length: n }, (_, i) => fn(i));
}

function useCalendarSelectYear(props: { minYear: number; maxYear: number }) {
  const { min, max, focusedDate } = useContext(CalendarContext);
  const dispatch = useEvent<PlainDate>("focusday", { bubbles: true });

  const minYear = min?.year ?? props.minYear;
  const maxYear = max?.year ?? props.maxYear;
  const focusedYearMonth = focusedDate.toPlainYearMonth();

  const options: YearOption[] = times(maxYear - minYear + 1, (i) => {
    const year = minYear + i;
    return {
      label: `${year}`,
      value: `${year}`,
      selected: year === focusedYearMonth.year,
    };
  });

  function onChange(e: ChangeEvent) {
    const value = parseInt(e.currentTarget.value);
    const diff = value - focusedYearMonth.year;
    dispatch(focusedDate.add({ years: diff }));
  }

  return { options, onChange };
}

export const CalendarSelectYear = c(
  (props) => {
    const select = useCalendarSelectYear(props);

    return (
      <host shadowDom>
        <SelectBase label="Year" {...select} />
      </host>
    );
  },

  {
    props: {
      minYear: { type: Number, value: 1900 },
      maxYear: { type: Number, value: 2050 },
    },

    styles,
  }
);
customElements.define("calendar-select-year", CalendarSelectYear);
