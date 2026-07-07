import { define } from "../core/element.js";
import { Signal, effect } from "../core/signals.js";
import { CalendarBase } from "../calendar-base/calendar-base.js";
import { parseDate, parseDateRange } from "../utils/parse.js";
import { toDate } from "../utils/date.js";
import { PlainDate } from "../utils/temporal.js";

const sort = (a: PlainDate, b: PlainDate): [PlainDate, PlainDate] =>
  PlainDate.compare(a, b) < 0 ? [a, b] : [b, a];

export interface CalendarRange {
  tentative: string;
}

export class CalendarRange extends CalendarBase {
  static props = {
    ...CalendarBase.props,
    tentative: { type: String, default: "" },
  };

  protected readonly type = "range";

  #hovered = new Signal<PlainDate | undefined>(undefined);

  constructor() {
    super();

    // reset whenever tentative changes
    this.onConnect(() =>
      effect(() => {
        this.getProp("tentative");
        this.#hovered.set(undefined);
      }),
    );
  }

  #tentativeDate() {
    return parseDate(this.getProp("tentative"));
  }

  protected parsedValue(): [PlainDate, PlainDate] | [] {
    const tentative = this.#tentativeDate();
    if (!tentative) {
      return parseDateRange(this.getProp("value"));
    }

    const hovered = this.#hovered.get();
    return sort(tentative, hovered ?? tentative);
  }

  protected focusFallback() {
    return parseDateRange(this.getProp("value"))[0];
  }

  #handleHover(e: CustomEvent<PlainDate>) {
    e.stopPropagation();
    if (this.#tentativeDate()) {
      this.#hovered.set(e.detail);
    }
  }

  protected onFocusDay(e: CustomEvent<PlainDate>) {
    super.onFocusDay(e);
    this.#handleHover(e);
  }

  protected onHoverDay(e: CustomEvent<PlainDate>) {
    this.#handleHover(e);
  }

  protected onSelectDay(e: CustomEvent<PlainDate>) {
    const detail = e.detail;
    e.stopPropagation();

    const tentative = this.#tentativeDate();

    if (!tentative) {
      this.tentative = detail.toString();
      this.emit("rangestart", toDate(detail));
    } else {
      const range = sort(tentative, detail);
      this.value = `${range[0]}/${range[1]}`;
      this.tentative = "";
      this.emit("rangeend", toDate(detail));
      this.emit("change");
    }
  }
}

define("calendar-range", CalendarRange);
