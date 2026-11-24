import { computed } from "../utils/signals.js";
import { parseDate } from "../utils/date.js";
import type { PlainDate } from "../utils/temporal.js";
import {
  CalendarBase,
  type CalendarElementProps,
} from "../calendar-base/calendar-base.js";
import type { ComponentProps } from "../utils/base.js";

export type CalendarDateProps = ComponentProps<CalendarElementProps>;

export class CalendarDate extends CalendarBase {
  protected parsed = computed(() => {
    const date = parseDate(this.value);
    return date ? [date] : [];
  });

  protected selected = this.parsed;

  constructor() {
    super("date");
  }

  protected select(date: PlainDate) {
    this.value = date.toString();
    this.emit("change");
  }
}

CalendarDate.define("calendar-date");

declare global {
  interface HTMLElementTagNameMap {
    "calendar-date": CalendarDate;
  }
}
