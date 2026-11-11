import { Base, css, html, setAttr, type PropDefs } from "../utils/base.js";
import {
  computed,
  signal,
  untracked,
  type ReadonlySignal,
} from "../utils/signals.js";
import { PlainDate, PlainYearMonth } from "../utils/temporal.js";
import {
  clamp,
  endOfMonth,
  getToday,
  parseDate,
  toDate,
  type DaysOfWeek,
} from "../utils/date.js";
import {
  CalendarContext,
  type CalendarType,
} from "../calendar-month/CalendarMonthContext.js";
import { CalendarHeadingContext } from "../calendar-heading/CalendarHeadingContext.js";
import "../calendar-heading/calendar-heading.js";
import reset from "../utils/reset.css?inline";
import styles from "./calendar-base.css?inline";

export interface PageChangeDetail {
  start: Date;
  end: Date;
}

export type Pagination = "single" | "months";

export interface CalendarFocusOptions extends FocusOptions {
  target?: "day" | "next" | "previous";
}

export interface CalendarProps {
  value: string;
  min: string;
  max: string;
  today: string;
  isDateDisallowed: (date: Date) => boolean;
  formatWeekday: "narrow" | "short";
  getDayParts: (date: Date) => string;
  firstDayOfWeek: DaysOfWeek;
  showOutsideDays: boolean;
  locale: string | undefined;
  months: number;
  focusedDate: string | undefined;
  pageBy: Pagination;
  showWeekNumbers: boolean;
}

function diffInMonths(a: PlainYearMonth, b: PlainYearMonth): number {
  return (b.year - a.year) * 12 + b.month - a.month;
}

export interface CalendarBase<Props> extends CalendarProps {}

export abstract class CalendarBase<
  Props extends CalendarProps = CalendarProps,
> extends Base<Props> {
  static props: PropDefs<CalendarProps> = {
    value: [String, ""],
    min: [String, ""],
    max: [String, ""],
    today: [String, ""],
    isDateDisallowed: [Function, () => false],
    formatWeekday: [String, "narrow"],
    getDayParts: [Function, () => ""],
    firstDayOfWeek: [Number, 1],
    showOutsideDays: [Boolean, false],
    locale: [String],
    months: [Number, 1],
    focusedDate: [String],
    pageBy: [String, "months"],
    showWeekNumbers: [Boolean, false],
  };

  static template = html`
    <div role="group" aria-labelledby="h" part="container">
      <calendar-heading
        month="long"
        year="numeric"
        id="h"
        class="vh"
        aria-live="polite"
        aria-atomic="true"
      ></calendar-heading>

      <div part="header">
        <button part="button previous">
          <slot name="previous">Previous</slot>
        </button>

        <slot part="heading" name="heading">
          <calendar-heading
            year="numeric"
            aria-hidden="true"
          ></calendar-heading>
        </slot>

        <button part="button next">
          <slot name="next">Next</slot>
        </button>
      </div>

      <slot part="months"></slot>
    </div>
  `;

  static styles = css(reset, styles);

  /** The dates parsed from the `value` prop */
  protected abstract parsed: ReadonlySignal<PlainDate[]>;

  /** The dates that months should show as selected */
  protected abstract selected: ReadonlySignal<PlainDate[]>;

  /** Called when the user picks a day */
  protected abstract select(date: PlainDate): void;

  constructor(type: CalendarType) {
    super();
    const { $ } = this;

    const min = computed(() => parseDate(this.min));
    const max = computed(() => parseDate(this.max));
    const today = computed(() => parseDate(this.today));

    const focusedDate = computed(() =>
      clamp(
        parseDate(this.focusedDate) ??
          this.parsed.value[0] ??
          today.value ??
          getToday(),
        min.value,
        max.value,
      ),
    );

    const goto = (date: PlainDate) => {
      this.focusedDate = date.toString();
      this.emit("focusday", toDate(date));
    };

    //
    // pagination
    //

    // a page of 12 months is aligned to the start of the year
    const align = (start: PlainYearMonth) =>
      this.months === 12 && this.pageBy !== "single"
        ? new PlainYearMonth(start.year, 1)
        : start;

    // until first connected, the page simply follows the focused date
    const pageStart = signal<PlainYearMonth | undefined>(undefined);

    const page = computed(() => {
      const start =
        pageStart.value ?? align(focusedDate.value.toPlainYearMonth());
      return { start, end: start.add({ months: this.months - 1 }) };
    });

    const step = () => (this.pageBy === "single" ? 1 : this.months);

    const contains = (date: PlainDate) => {
      const diff = diffInMonths(page.value.start, date.toPlainYearMonth());
      return diff >= 0 && diff < this.months;
    };

    const pageBy = (by: number) => {
      const start = align(page.value.start.add({ months: by }));
      pageStart.value = start;

      this.emit("pagechange", {
        start: toDate(start),
        end: toDate(endOfMonth(page.value.end)),
      } satisfies PageChangeDetail);
    };

    // focused date change -> update page
    this.effect(() => {
      const focused = focusedDate.value;
      const { months } = this;
      const by = step();

      untracked(() => {
        if (!pageStart.value) {
          pageStart.value = page.value.start;
        } else if (!contains(focused)) {
          const diff = diffInMonths(
            page.value.start,
            focused.toPlainYearMonth(),
          );

          // if we only move one month either way, move by step
          if (diff === -1) {
            pageBy(-by);
          } else if (diff === months) {
            pageBy(by);
          } else {
            // anything else, move in steps of months
            pageBy(Math.floor(diff / months) * months);
          }
        }
      });
    });

    //
    // paging buttons
    //

    const setupButton = (
      name: "previous" | "next",
      limit: ReadonlySignal<PlainDate | undefined>,
      direction: number,
    ) => {
      const button = this.query(`[part~=${name}]`);
      const enabled = () => !limit.value || !contains(limit.value);

      button.addEventListener("click", () => {
        if (enabled()) {
          pageBy(direction * step());

          // page change -> update focused date
          const focused = focusedDate.value;

          if (!contains(focused)) {
            const diff = diffInMonths(
              focused.toPlainYearMonth(),
              page.value.start,
            );
            goto(focused.add({ months: diff }));
          }
        }
      });

      this.effect(() => {
        const disabled = !enabled();
        button.part.toggle("disabled", disabled);
        setAttr(button, "aria-disabled", disabled ? "true" : null);
      });
    };

    setupButton("previous", min, -1);
    setupButton("next", max, 1);

    //
    // communication with descendants
    //

    const context = {
      ...$,
      type,
      min,
      max,
      today,
      page,
      focusedDate,
      value: computed(() => this.selected.value),
    };

    this.provide(CalendarContext, context);
    this.provide(CalendarHeadingContext, context);

    // note: only the range calendar stops `selectday` from propagating further
    this.on("selectday", (date) => this.select(date));
    this.on("focusday", (date, e) => {
      e.stopPropagation();
      goto(date);
      setTimeout(() => this.focus());
    });
  }

  /**
   * Listens for an event from a descendant.
   * They come from slotted content, so pass through our shadow root on the way to the host.
   */
  protected on(type: string, fn: (date: PlainDate, e: Event) => void) {
    this.root.addEventListener(type, (e) =>
      fn((e as CustomEvent<PlainDate>).detail, e),
    );
  }

  focus(options?: CalendarFocusOptions) {
    const target = options?.target ?? "day";

    if (target === "day") {
      this.querySelectorAll<HTMLElement>("calendar-month").forEach((m) =>
        m.focus(options),
      );
    } else {
      this.query<HTMLElement>(`[part~=${target}]`).focus(options);
    }
  }
}
