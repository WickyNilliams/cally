import { c, useContext, useEvent, useMemo, type Host } from "atomico";
import { CalendarContext } from "../calendar-month/CalendarMonthContext.js";
import { useDateFormatter } from "../utils/hooks.js";
import { PlainDate, PlainYearMonth } from "../utils/temporal.js";
import {
  SelectBase,
  styles,
  type ChangeEvent,
  type MonthOption,
} from "./calendar-year-month-base.js";

function useCalendarSelectMonth(props: { formatMonth: "long" | "short" }) {
  const { min, max, focusedDate, locale } = useContext(CalendarContext);
  const dispatch = useEvent<PlainDate>("focusday", { bubbles: true });

  const formatOptions = useMemo(
    () => ({ month: props.formatMonth }) as const,
    [props.formatMonth]
  );
  const formatter = useDateFormatter(formatOptions, locale);

  const monthNames = useMemo(() => {
    const months = [];
    const day = new Date();
    day.setUTCDate(1);

    for (var i = 0; i < 12; i++) {
      const index = (day.getUTCMonth() + 12) % 12;
      months[index] = formatter.format(day);
      day.setUTCMonth(day.getUTCMonth() + 1);
    }

    return months;
  }, [formatter]);

  const focusedYearMonth = focusedDate.toPlainYearMonth();
  const options: MonthOption[] = monthNames.map((label, index) => {
    const i = index + 1;
    const yearMonth = focusedYearMonth.add({ months: i - focusedYearMonth.month });

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

  function onChange(e: ChangeEvent) {
    const value = parseInt(e.currentTarget.value);
    const diff = value - focusedYearMonth.month;
    dispatch(focusedDate.add({ months: diff }));
  }

  return { options, onChange };
}

export const CalendarSelectMonth = c(
  (props) => {
    const select = useCalendarSelectMonth(props);

    return (
      <host shadowDom>
        <SelectBase label="Month" {...select} />
      </host>
    );
  },

  {
    props: {
      formatMonth: {
        type: String,
        value: (): "long" | "short" => "long",
      },
    },

    styles,
  }
);

customElements.define("calendar-select-month", CalendarSelectMonth);
