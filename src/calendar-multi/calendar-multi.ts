import { define } from "../core/element.js";
import { CalendarBase } from "../calendar-base/calendar-base.js";
import { parseDateMulti } from "../utils/parse.js";
import type { PlainDate } from "../utils/temporal.js";

export class CalendarMulti extends CalendarBase {
  protected readonly type = "multi";

  protected parsedValue() {
    return parseDateMulti(this.getProp("value"));
  }

  protected focusFallback() {
    return this.parsedValue()[0];
  }

  protected onSelectDay(e: CustomEvent<PlainDate>) {
    const value = this.parsedValue();
    const newValues = [...value];

    const idx = value.findIndex((date) => date.equals(e.detail));
    idx < 0 ? newValues.push(e.detail) : newValues.splice(idx, 1);

    this.value = newValues.join(" ");
    this.emit("change");
  }
}

define("calendar-multi", CalendarMulti);
