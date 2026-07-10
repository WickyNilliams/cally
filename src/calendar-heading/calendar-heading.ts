import { BaseElement, define, str } from "../core/element.js";
import { effect } from "../core/signals.js";
import { consumeContext } from "../core/context.js";
import { CalendarHeadingContext } from "./CalendarHeadingContext.js";
import { dateFormatter } from "../utils/parse.js";
import { toDate } from "../utils/date.js";

type DateFormatOptions = Pick<Intl.DateTimeFormatOptions, "year" | "month">;
type YearFormat = NonNullable<DateFormatOptions["year"]>;
type MonthFormat = NonNullable<DateFormatOptions["month"]>;

export interface CalendarHeading {
  year: YearFormat | undefined;
  month: MonthFormat | undefined;
}

export class CalendarHeading extends BaseElement {
  static props_ = {
    year: str<YearFormat>(),
    month: str<MonthFormat>(),
  };

  constructor() {
    super();
    const context = consumeContext(this, CalendarHeadingContext);

    this.onConnect_(() =>
      effect(() => {
        const { year, month } = this;
        const ctx = context();

        const options: DateFormatOptions = {};
        if (year) options.year = year;
        if (month) options.month = month;

        const formatter = dateFormatter(options, ctx.locale);

        this.shadowRoot!.textContent =
          ctx.type === "range"
            ? formatter.formatRange(
                toDate(ctx.value.start),
                toDate(ctx.value.end),
              )
            : formatter.format(toDate(ctx.value));
      }),
    );
  }
}

define("calendar-heading", CalendarHeading);
