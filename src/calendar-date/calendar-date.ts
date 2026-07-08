import { define } from "../core/element.js";
import { CalendarBase } from "../calendar-base/calendar-base.js";
import { parseDate } from "../utils/parse.js";
import type { PlainDate } from "../utils/temporal.js";

export class CalendarDate extends CalendarBase {
  protected readonly type = "date";

  protected parsedValue_() {
    return parseDate(this.getProp_("value"));
  }

  protected focusFallback_() {
    return this.parsedValue_();
  }

  protected onSelectDay_(e: CustomEvent<PlainDate>) {
    this.value = e.detail.toString();
    this.emit_("change");
  }
}

define("calendar-date", CalendarDate);
