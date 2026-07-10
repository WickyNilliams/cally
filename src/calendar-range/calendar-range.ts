import { define, str } from "../core/element.js";
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
  static props_ = {
    ...CalendarBase.props_,
    tentative: str(""),
  };

  protected readonly type = "range";

  #hovered = new Signal<PlainDate | undefined>(undefined);

  constructor() {
    super();

    // reset whenever tentative changes
    this.onConnect_(() =>
      effect(() => {
        this.getProp_("tentative");
        this.#hovered.set(undefined);
      }),
    );
  }

  #tentativeDate() {
    return parseDate(this.tentative);
  }

  protected parsedValue_(): [PlainDate, PlainDate] | [] {
    const tentative = this.#tentativeDate();
    if (!tentative) {
      return parseDateRange(this.value);
    }

    const hovered = this.#hovered.get();
    return sort(tentative, hovered ?? tentative);
  }

  protected focusFallback_() {
    return parseDateRange(this.value)[0];
  }

  #handleHover(e: CustomEvent<PlainDate>) {
    e.stopPropagation();
    if (this.#tentativeDate()) {
      this.#hovered.set(e.detail);
    }
  }

  protected onFocusDay_(e: CustomEvent<PlainDate>) {
    super.onFocusDay_(e);
    this.#handleHover(e);
  }

  protected onHoverDay_(e: CustomEvent<PlainDate>) {
    this.#handleHover(e);
  }

  protected onSelectDay_(e: CustomEvent<PlainDate>) {
    const detail = e.detail;
    e.stopPropagation();

    const tentative = this.#tentativeDate();

    if (!tentative) {
      this.tentative = detail.toString();
      this.emit_("rangestart", toDate(detail));
    } else {
      const range = sort(tentative, detail);
      this.value = `${range[0]}/${range[1]}`;
      this.tentative = "";
      this.emit_("rangeend", toDate(detail));
      this.emit_("change");
    }
  }
}

define("calendar-range", CalendarRange);
