import { Base, setText, type PropDefs } from "../utils/base.js";
import { getFormatter, toDate } from "../utils/date.js";
import { CalendarHeadingContext } from "./CalendarHeadingContext.js";

interface HeadingProps {
  /** How to display the year. When omitted, the year is not shown */
  year: "numeric" | "2-digit" | undefined;
  /** How to display the month. When omitted, the month is not shown */
  month: "numeric" | "2-digit" | "long" | "short" | "narrow" | undefined;
}

export interface CalendarHeading extends HeadingProps {}

/**
 * A heading for the month, or range of months, shown by a calendar or month
 */
export class CalendarHeading extends Base<HeadingProps> {
  static props: PropDefs<HeadingProps> = {
    year: [String],
    month: [String],
  };

  constructor() {
    super();
    const context = this.consume(CalendarHeadingContext);

    this.effect(() => {
      const { page, locale } = context.value;
      const { start, end } = page.value;
      const options: Partial<HeadingProps> = {};
      if (this.year) options.year = this.year;
      if (this.month) options.month = this.month;

      // when start and end are the same month, this is the same as `format`
      setText(
        this.root,
        getFormatter(options, locale.value).formatRange(
          toDate(start),
          toDate(end),
        ),
      );
    });
  }
}

CalendarHeading.define("calendar-heading");

declare global {
  interface HTMLElementTagNameMap {
    "calendar-heading": CalendarHeading;
  }
}
