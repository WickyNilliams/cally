import type { PropDefs } from "../utils/base.js";
import { computed, signal } from "../utils/signals.js";
import { parseDate, toDateLike, type DateLike } from "../utils/date.js";
import { PlainDate } from "../utils/temporal.js";
import {
  CalendarBase,
  type CalendarProps,
  type CalendarEvents,
} from "../calendar-base/calendar-base.js";

interface RangeEvents extends CalendarEvents {
  /** Emitted when the user starts selecting a range */
  rangestart: DateLike;
  /** Emitted when the user finishes selecting a range */
  rangeend: DateLike;
}

interface RangeProps extends CalendarProps {
  /** The date that is tentatively selected e.g. the start of a range selection */
  tentative: string;
}

const sort = (a: PlainDate, b: PlainDate): [PlainDate, PlainDate] =>
  PlainDate.compare(a, b) < 0 ? [a, b] : [b, a];

export interface CalendarRange extends RangeProps {}

/**
 * A calendar for selecting a range of dates
 *
 * @property value - The currently selected range, as two dates separated by a `/`
 */
export class CalendarRange extends CalendarBase<RangeProps, RangeEvents> {
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
      this.emit("rangestart", toDateLike(date));
    } else {
      this.value = sort(tentative, date).join("/");
      this.tentative = "";
      this.emit("rangeend", toDateLike(date));
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
