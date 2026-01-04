import { c, useContext, useMemo } from "atomico";
import { CalendarHeadingContext } from "./CalendarHeadingContext.js";
import { useDateFormatter } from "../utils/hooks.js";

type DateFormatOptions = Pick<Intl.DateTimeFormatOptions, "year" | "month">;

export const CalendarHeading = c(
  (props) => {
    const context = useContext(CalendarHeadingContext);

    // Memoize options to avoid recreating formatter on every render
    const options: DateFormatOptions = useMemo(() => {
      const opts: DateFormatOptions = {};
      if (props.year) opts.year = props.year;
      if (props.month) opts.month = props.month;
      return opts;
    }, [props.year, props.month]);

    const formatter = useDateFormatter(options, context.locale);

    const formattedDate =
      context.type === "range"
        ? formatter.formatRange(context.value[0], context.value[1])
        : formatter.format(context.value);

    return <host>{formattedDate}</host>;
  },
  {
    props: {
      year: {
        type: String,
        value: (): "numeric" | "2-digit" | undefined => undefined,
      },
      month: {
        type: String,
        value: ():
          | "numeric"
          | "2-digit"
          | "long"
          | "short"
          | "narrow"
          | undefined => undefined,
      },
    },
  },
);

customElements.define("calendar-heading", CalendarHeading);
