/** @jsxImportSource ../core/jsx-html */
import "../calendar-heading/calendar-heading.js";
import {
  BaseElement,
  bool,
  css,
  define,
  func,
  num,
  setAttr,
  str,
  template,
  type PropsDef,
} from "../core/element.js";
import { Signal, effect, untracked } from "../core/signals.js";
import { provideContext } from "../core/context.js";
import {
  CalendarContext,
  type CalendarContextValue,
} from "../calendar-month/CalendarMonthContext.js";
import { CalendarHeadingContext } from "../calendar-heading/CalendarHeadingContext.js";
import type { CalendarMonth } from "../calendar-month/calendar-month.js";
import { reset, vh } from "../utils/styles.js";
import {
  clamp,
  endOfMonth,
  toDate,
  getToday,
  type DaysOfWeek,
} from "../utils/date.js";
import { parseDate } from "../utils/parse.js";
import { PlainDate, PlainYearMonth } from "../utils/temporal.js";

export interface PageChangeDetail {
  start: Date;
  end: Date;
}

export type Pagination = "single" | "months";

export interface CalendarFocusOptions extends FocusOptions {
  target?: "day" | "next" | "previous";
}

interface Page {
  start: PlainYearMonth;
  end: PlainYearMonth;
}

type YearMonthLike = { year: number; month: number };

function diffInMonths(a: YearMonthLike, b: YearMonthLike): number {
  return (b.year - a.year) * 12 + b.month - a.month;
}

const createPage = (
  from: YearMonthLike,
  months: number,
  pageBy: Pagination,
): Page => {
  const start = new PlainYearMonth(
    from.year,
    months === 12 && pageBy !== "single" ? 1 : from.month,
  );
  return {
    start,
    end: start.add({ months: months - 1 }),
  };
};

const button = (name: string, label: string) => (
  <button part={`button ${name}`}>
    <slot name={name}>{label}</slot>
  </button>
);

const baseTemplate = template(
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
      {button("previous", "Previous")}
      <slot part="heading" name="heading">
        <calendar-heading year="numeric" aria-hidden="true"></calendar-heading>
      </slot>
      {button("next", "Next")}
    </div>
    <slot part="months"></slot>
  </div>,
);

export interface CalendarBase {
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

export abstract class CalendarBase extends BaseElement {
  static props_: PropsDef = {
    value: str(""),
    min: str(""),
    max: str(""),
    today: str(""),
    isDateDisallowed: func<(date: Date) => boolean>((date) => false),
    formatWeekday: str<"narrow" | "short">("narrow"),
    getDayParts: func<(date: Date) => string>((date) => ""),
    firstDayOfWeek: num<DaysOfWeek>(1),
    showOutsideDays: bool(false),
    locale: str(),
    months: num(1),
    focusedDate: str(),
    pageBy: str<Pagination>("months"),
    showWeekNumbers: bool(false),
  };

  static styles_ = [
    reset,
    vh,
    css`
      :host {
        display: block;
        inline-size: fit-content;
      }

      [part~="container"] {
        display: flex;
        flex-direction: column;
        gap: 1em;
      }

      [part~="header"] {
        display: flex;
        align-items: center;
        justify-content: space-between;
      }

      [part~="heading"] {
        font-weight: bold;
        font-size: 1.25em;
      }

      [part~="button"] {
        display: flex;
        align-items: center;
        justify-content: center;
      }

      [part~="disabled"] {
        cursor: default;
        opacity: 0.5;
      }
    `,
  ];

  static template_ = baseTemplate;

  /** the kind of calendar context this element provides to its months */
  protected abstract readonly type: CalendarContextValue["type"];
  /** parse the value prop into its context representation */
  protected abstract parsedValue_(): CalendarContextValue["value"];
  /** the date focus falls back to when the focusedDate prop is not set */
  protected abstract focusFallback_(): PlainDate | undefined;
  protected abstract onSelectDay_(e: CustomEvent<PlainDate>): void;

  #page?: Signal<Page>;
  #previousButton: HTMLButtonElement;
  #nextButton: HTMLButtonElement;

  /**
   * created lazily on first access: by then attributes have been delivered,
   * whether accessed from a consumer's context request or our own effects
   */
  #pageSignal(): Signal<Page> {
    return (this.#page ??= new Signal(
      untracked(() =>
        createPage(this.focusedDatePlain_(), this.months, this.pageBy),
      ),
    ));
  }

  constructor() {
    super();

    const root = this.shadowRoot!;
    const container = root.querySelector<HTMLElement>("[part='container']")!;
    [this.#previousButton, this.#nextButton] = root.querySelectorAll(
      "button",
    ) as unknown as [HTMLButtonElement, HTMLButtonElement];

    // internal events from months bubble through the flattened tree, so we
    // intercept them here, below the host, exactly like the old context
    // element did. this way `focusday` never escapes the host untouched,
    // while `selectday`/`hoverday` keep bubbling unless a subclass stops them
    container.addEventListener("focusday", (e) =>
      this.onFocusDay_(e as CustomEvent<PlainDate>),
    );
    container.addEventListener("selectday", (e) =>
      this.onSelectDay_(e as CustomEvent<PlainDate>),
    );
    container.addEventListener("hoverday", (e) =>
      this.onHoverDay_(e as CustomEvent<PlainDate>),
    );

    this.#previousButton.addEventListener("click", () => {
      if (untracked(() => this.#previousAllowed())) {
        this.#updatePageBy(-this.#step());
      }
    });
    this.#nextButton.addEventListener("click", () => {
      if (untracked(() => this.#nextAllowed())) {
        this.#updatePageBy(this.#step());
      }
    });

    provideContext(this, CalendarContext, () => this.#contextValue());
    provideContext(this, CalendarHeadingContext, () => ({
      type: "range" as const,
      value: this.#pageSignal().get(),
      locale: this.locale,
    }));

    // page change -> update focused date
    this.onConnect_(() =>
      effect(() => {
        const page = this.#pageSignal().get();

        untracked(() => {
          const focusedDate = this.focusedDatePlain_();
          if (this.#contains(focusedDate)) {
            return;
          }

          const diff = diffInMonths(focusedDate, page.start);
          this.#goto(focusedDate.add({ months: diff }));
        });
      }),
    );

    // focused date change -> update page
    this.onConnect_(() =>
      effect(() => {
        const focusedDate = this.focusedDatePlain_();
        const months = this.months;
        const step = this.#step();

        untracked(() => {
          if (this.#contains(focusedDate)) {
            return;
          }

          const diff = diffInMonths(
            this.#pageSignal().peek_().start,
            focusedDate,
          );

          // if we only move one month either way, move by step
          if (diff === -1) {
            this.#updatePageBy(-step);
          } else if (diff === months) {
            this.#updatePageBy(step);
          } else {
            // anything else, move in steps of months
            this.#updatePageBy(Math.floor(diff / months) * months);
          }
        });
      }),
    );

    // update previous/next button state
    this.onConnect_(() =>
      effect(() => {
        this.#renderButton(
          this.#previousButton,
          "previous",
          this.#previousAllowed(),
        );
        this.#renderButton(this.#nextButton, "next", this.#nextAllowed());
      }),
    );
  }

  protected minDate_() {
    return parseDate(this.min);
  }

  protected maxDate_() {
    return parseDate(this.max);
  }

  /** the effective focused date: prop -> value -> today, clamped to min/max */
  protected focusedDatePlain_(): PlainDate {
    const focused = parseDate(this.focusedDate) ?? this.focusFallback_();
    const today = parseDate(this.today);
    return clamp(
      focused ?? today ?? getToday(),
      this.minDate_(),
      this.maxDate_(),
    );
  }

  #contextValue(): CalendarContextValue {
    // all props pass through as-is (like the previous atomico implementation),
    // with the date-valued ones overridden by their parsed form
    return {
      ...this.propsSnapshot_(),
      type: this.type,
      value: this.parsedValue_(),
      min: this.minDate_(),
      max: this.maxDate_(),
      today: parseDate(this.today),
      page: this.#pageSignal().get(),
      focusedDate: this.focusedDatePlain_(),
    } as CalendarContextValue;
  }

  #step(): number {
    return this.pageBy === "single" ? 1 : this.months;
  }

  #contains(date: PlainDate): boolean {
    const diff = diffInMonths(this.#pageSignal().get().start, date);
    return diff >= 0 && diff < this.months;
  }

  #previousAllowed(): boolean {
    const min = this.minDate_();
    return !min || !this.#contains(min);
  }

  #nextAllowed(): boolean {
    const max = this.maxDate_();
    return !max || !this.#contains(max);
  }

  #renderButton(button: HTMLButtonElement, name: string, allowed: boolean) {
    button.setAttribute("part", `button ${name} ${!allowed ? "disabled" : ""}`);
    setAttr(button, "aria-disabled", !allowed ? "true" : undefined);
  }

  #updatePageBy(by: number) {
    const page = this.#pageSignal();
    const next = untracked(() =>
      createPage(
        page.peek_().start.add({ months: by }),
        this.months,
        this.pageBy,
      ),
    );
    page.set(next);
    this.emit_<PageChangeDetail>("pagechange", {
      start: toDate(next.start),
      end: toDate(endOfMonth(next.end)),
    });
  }

  #goto(date: PlainDate) {
    this.focusedDate = date.toString();
    this.emit_("focusday", toDate(date));
  }

  protected onFocusDay_(e: CustomEvent<PlainDate>) {
    e.stopPropagation();
    this.#goto(e.detail);
    setTimeout(() => this.focus());
  }

  protected onHoverDay_(e: CustomEvent<PlainDate>) {}

  focus(options?: CalendarFocusOptions) {
    const target = options?.target ?? "day";
    if (target === "day") {
      this.querySelectorAll<CalendarMonth>("calendar-month").forEach((m) =>
        m.focus(),
      );
    } else {
      this.shadowRoot!.querySelector<HTMLButtonElement>(
        `[part~='${target}']`,
      )!.focus(options);
    }
  }
}
