import { define } from "../core/element.js";
import { CalendarBase } from "../calendar-base/calendar-base.js";
import { parseDate } from "../utils/parse.js";
import type { PlainDate } from "../utils/temporal.js";

export class CalendarDate extends CalendarBase {
  protected readonly type = "date";

  protected parsedValue() {
    return parseDate(this.getProp("value"));
  }

  protected focusFallback() {
    return this.parsedValue();
  }

  protected onSelectDay(e: CustomEvent<PlainDate>) {
    this.value = e.detail.toString();
    this.emit("change");
  }
}

define("calendar-date", CalendarDate);
