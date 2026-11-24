import { Base, css, setAttr, template, type PropDefs } from "../utils/base.js";
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
  getWeekNumber,
  parseDate,
  toDateLike,
  type DateLike,
  type DaysOfWeek,
} from "../utils/date.js";
import {
  CalendarContext,
  type CalendarType,
  type DayEvents,
} from "../calendar-month/CalendarMonthContext.js";
import { CalendarHeadingContext } from "../calendar-heading/CalendarHeadingContext.js";
import "../calendar-heading/calendar-heading.js";
import reset from "../utils/reset.css?inline";
import styles from "./calendar-base.css?inline";

export interface PageChangeDetail {
  start: DateLike;
  end: DateLike;
}

export type Pagination = "single" | "months";

export interface CalendarFocusOptions extends FocusOptions {
  target?: "day" | "next" | "previous";
}

export interface CalendarProps {
  /** The selected value */
  value: string;
  /** The earliest date that can be selected */
  min: string;
  /** The latest date that can be selected */
  max: string;
  /** The date that is considered today */
  today: string;
  /** The date that is considered "focused" by the calendar */
  focusedDate: string | undefined;
  /** The first day of the week, where Monday is `1` and Sunday is `7` (ISO 8601) */
  firstDayOfWeek: DaysOfWeek;
  /** Whether to show days outside the month */
  showOutsideDays: boolean;
  /**
   * Whether to show week numbers. By default these are ISO week numbers, taken from the first day of each week.
   * ISO weeks start on Monday, so if `firstDayOfWeek` is another day, each week shown spans two ISO weeks.
   * Use `getWeekNumber` to number weeks differently
   */
  showWeekNumbers: boolean;
  /** The locale for formatting dates. If not set, will use the browser's locale */
  locale: string | undefined;
  /** The number of months to display per page */
  months: number;
  /** Whether next and previous should move by number of `months` or by a single month at a time */
  pageBy: Pagination;
  /** Controls the format of the weekday headers in the month table */
  formatWeekday: "narrow" | "short";
  /** A function that takes a date and returns `true` if the date should not be selectable */
  isDateDisallowed: (date: DateLike) => boolean;
  /** A function that takes a date and returns a string of CSS parts, allowing custom styling for individual dates */
  getDayParts: (date: DateLike) => string;
  /** A function that takes the first day of a week and returns its number, when `showWeekNumbers` is set. Defaults to ISO week numbers */
  getWeekNumber: (date: DateLike) => number;
}

/** The events dispatched by every kind of calendar, and the type of their detail */
export interface CalendarEvents {
  /** Emitted when the value changes via user interaction. Not emitted when `value` is changed programmatically */
  change: undefined;
  /** Emitted when the focused day changes. This can happen via keyboard commands, or clicking the next or previous buttons */
  focusday: DateLike;
  /** Emitted when the visible months change */
  pagechange: PageChangeDetail;
}

function diffInMonths(a: PlainYearMonth, b: PlainYearMonth): number {
  return (b.year - a.year) * 12 + b.month - a.month;
}

export interface CalendarBase<Props, Events> extends CalendarProps {}

/**
 * @slot - Where your `<calendar-month>` components go, along with any other markup. `<calendar-month>` does not need to be a direct descendant
 * @slot previous - The inner content of the previous page button. By default uses text "Previous". You will likely want to slot an icon here
 * @slot next - The inner content of the next page button. By default uses text "Next". You will likely want to slot an icon here
 * @slot heading - By default displays the visible heading for the component. You may want to replace this with a year select. A separate visually-hidden heading is always rendered for accessibility purposes
 *
 * @csspart container - The container for the entire component
 * @csspart header - The container for heading and buttons
 * @csspart button - Any button within the component
 * @csspart previous - The previous page button
 * @csspart next - The next page button
 * @csspart disabled - A button that is disabled due to min/max
 * @csspart heading - The heading that labels the calendar
 * @csspart months - The default slot, where `<calendar-month>`s get rendered
 */
export abstract class CalendarBase<
  Props extends CalendarProps = CalendarProps,
  Events extends CalendarEvents = CalendarEvents,
> extends Base<Props, Events> {
  static props: PropDefs<CalendarProps> = {
    value: [String, ""],
    min: [String, ""],
    max: [String, ""],
    today: [String, ""],
    isDateDisallowed: [Function, () => false],
    formatWeekday: [String, "narrow"],
    getDayParts: [Function, () => ""],
    getWeekNumber: [Function, getWeekNumber],
    firstDayOfWeek: [Number, 1],
    showOutsideDays: [Boolean, false],
    locale: [String],
    months: [Number, 1],
    focusedDate: [String],
    pageBy: [String, "months"],
    showWeekNumbers: [Boolean, false],
  };

  static template = template(
    <div role="group" aria-labelledby="h" part="container">
      <calendar-heading
        month="long"
        year="numeric"
        id="h"
        class="vh"
        aria-live="polite"
        aria-atomic="true"
      />

      <div part="header">
        <button part="button previous">
          <slot name="previous">Previous</slot>
        </button>

        <slot part="heading" name="heading">
          <calendar-heading year="numeric" aria-hidden="true" />
        </slot>

        <button part="button next">
          <slot name="next">Next</slot>
        </button>
      </div>

      <slot part="months" />
    </div>,
  );

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
      this.emit("focusday", toDateLike(date));
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
        start: toDateLike(start.toPlainDate({ day: 1 })),
        end: toDateLike(endOfMonth(page.value.end)),
      });
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
  protected on<K extends keyof DayEvents>(
    type: K,
    fn: (date: DayEvents[K], e: Event) => void,
  ) {
    this.root.addEventListener(type, (e) =>
      fn((e as CustomEvent<DayEvents[K]>).detail, e),
    );
  }

  /**
   * Focuses the `<calendar-month>` containing the currently focused date.
   * @param options - controls what gets focused, and how. `options.target` controls which part of the component gets focused
   */
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
