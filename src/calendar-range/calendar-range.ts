import type { ComponentProps, PropDefs } from "../utils/base.js";
import { computed, signal } from "../utils/signals.js";
import { parseDate, toDate } from "../utils/date.js";
import { PlainDate } from "../utils/temporal.js";
import {
  CalendarBase,
  type CalendarElementProps,
  type CalendarProps,
} from "../calendar-base/calendar-base.js";

interface RangeProps extends CalendarProps {
  tentative: string;
}

const sort = (a: PlainDate, b: PlainDate): [PlainDate, PlainDate] =>
  PlainDate.compare(a, b) < 0 ? [a, b] : [b, a];

export type CalendarRangeProps = ComponentProps<
  CalendarElementProps &
    Pick<RangeProps, "tentative"> & {
      onRangeStart: (event: CustomEvent<Date>) => any;
      onRangeEnd: (event: CustomEvent<Date>) => any;
    }
>;

export interface CalendarRange extends RangeProps {}

export class CalendarRange extends CalendarBase<RangeProps> {
  static props: PropDefs<RangeProps> = {
    ...CalendarBase.props,
    tentative: [String, ""],
  };

  #tentative = computed(() => parseDate(this.tentative));
  #hovered = signal<PlainDate | undefined>(undefined);

  protected parsed = computed(() => {
    const [start, end] = this.value.split("/").map(parseDate);
    return start && end ? [start, end] : [];
  });

  protected selected = computed(() => {
    const tentative = this.#tentative.value;

    return tentative
      ? sort(tentative, this.#hovered.value ?? tentative)
      : this.parsed.value;
  });

  constructor() {
    super("range");

    // reset whenever tentative changes
    this.effect(() => {
      this.#tentative.value;
      this.#hovered.value = undefined;
    });

    const hover = (date: PlainDate, e: Event) => {
      e.stopPropagation();

      if (this.#tentative.value) {
        this.#hovered.value = date;
      }
    };

    this.on("selectday", (_, e) => e.stopPropagation());
    this.on("focusday", hover);
    this.on("hoverday", hover);
  }

  protected select(date: PlainDate) {
    const tentative = this.#tentative.value;

    if (!tentative) {
      this.tentative = date.toString();
      this.emit("rangestart", toDate(date));
    } else {
      this.value = sort(tentative, date).join("/");
      this.tentative = "";
      this.emit("rangeend", toDate(date));
      this.emit("change");
    }
  }
}

CalendarRange.define("calendar-range");

declare global {
  interface HTMLElementTagNameMap {
    "calendar-range": CalendarRange;
  }
}
