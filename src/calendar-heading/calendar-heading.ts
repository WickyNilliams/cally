import { Base, setText, type PropDefs } from "../utils/base.js";
import { getFormatter, toDate } from "../utils/date.js";
import { CalendarHeadingContext } from "./CalendarHeadingContext.js";

interface HeadingProps {
  year: "numeric" | "2-digit" | undefined;
  month: "numeric" | "2-digit" | "long" | "short" | "narrow" | undefined;
}

export interface CalendarHeading extends HeadingProps {}

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
