import { BaseElement, define } from "../core/element.js";
import { effect } from "../core/signals.js";
import { consumeContext } from "../core/context.js";
import { CalendarHeadingContext } from "./CalendarHeadingContext.js";
import { dateFormatter } from "../utils/parse.js";
import { toDate } from "../utils/date.js";

type DateFormatOptions = Pick<Intl.DateTimeFormatOptions, "year" | "month">;

export interface CalendarHeading {
  year: "numeric" | "2-digit" | undefined;
  month: "numeric" | "2-digit" | "long" | "short" | "narrow" | undefined;
}

export class CalendarHeading extends BaseElement {
  static props = {
    year: { type: String },
    month: { type: String },
  };

  constructor() {
    super();
    const context = consumeContext(this, CalendarHeadingContext);

    this.onConnect(() =>
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
