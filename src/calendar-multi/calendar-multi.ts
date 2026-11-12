import { computed } from "../utils/signals.js";
import { parseDate } from "../utils/date.js";
import type { PlainDate } from "../utils/temporal.js";
import {
  CalendarBase,
  type CalendarElementProps,
} from "../calendar-base/calendar-base.js";
import type { ComponentProps } from "../utils/base.js";

export type CalendarMultiProps = ComponentProps<CalendarElementProps>;

export class CalendarMulti extends CalendarBase {
  protected parsed = computed(() =>
    this.value
      .trim()
      .split(/\s+/)
      .map(parseDate)
      .filter((date) => !!date),
  );

  protected selected = this.parsed;

  constructor() {
    super("multi");
  }

  protected select(date: PlainDate) {
    const values = [...this.parsed.value];

    const idx = values.findIndex((d) => d.equals(date));
    idx < 0 ? values.push(date) : values.splice(idx, 1);

    this.value = values.join(" ");
    this.emit("change");
  }
}

CalendarMulti.define("calendar-multi");

declare global {
  interface HTMLElementTagNameMap {
    "calendar-multi": CalendarMulti;
  }
}
