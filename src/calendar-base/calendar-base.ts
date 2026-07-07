import "../calendar-heading/calendar-heading.js";
import {
  BaseElement,
  css,
  define,
  setAttr,
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

function diffInMonths(a: PlainYearMonth, b: PlainYearMonth): number {
  return (b.year - a.year) * 12 + b.month - a.month;
}

const createPage = (
  start: PlainYearMonth,
  months: number,
  pageBy: Pagination = "months",
): Page => {
  if (months === 12 && pageBy !== "single") {
    start = new PlainYearMonth(start.year, 1);
  }
  return {
    start,
    end: start.add({ months: months - 1 }),
  };
};

const button = (name: string) =>
  `<button part="button ${name}"><slot name="${name}">${name[0]!.toUpperCase()}${name.slice(1)}</slot></button>`;

const baseTemplate = template(
  `<div role="group" aria-labelledby="h" part="container">` +
    `<calendar-heading month="long" year="numeric" id="h" class="vh" aria-live="polite" aria-atomic="true"></calendar-heading>` +
    `<div part="header">` +
    button("previous") +
    `<slot part="heading" name="heading"><calendar-heading year="numeric" aria-hidden="true"></calendar-heading></slot>` +
    button("next") +
    `</div>` +
    `<slot part="months"></slot>` +
    `</div>`,
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
  static props: PropsDef = {
    value: { type: String, default: "" },
    min: { type: String, default: "" },
    max: { type: String, default: "" },
    today: { type: String, default: "" },
    isDateDisallowed: { type: Function, default: (date: Date) => false },
    formatWeekday: { type: String, default: "narrow" },
    getDayParts: { type: Function, default: (date: Date): string => "" },
    firstDayOfWeek: { type: Number, default: 1 },
    showOutsideDays: { type: Boolean, default: false },
    locale: { type: String },
    months: { type: Number, default: 1 },
    focusedDate: { type: String },
    pageBy: { type: String, default: "months" },
    showWeekNumbers: { type: Boolean, default: false },
  };

  static styles = [
    reset,
    vh,
    css`
      :host {
        display: block;
        inline-size: fit-content;
      }

      :host::part(container) {
        display: flex;
        flex-direction: column;
        gap: 1em;
      }

      :host::part(header) {
        display: flex;
        align-items: center;
        justify-content: space-between;
      }

      :host::part(heading) {
        font-weight: bold;
        font-size: 1.25em;
      }

      :host::part(button) {
        display: flex;
        align-items: center;
        justify-content: center;
      }

      :host::part(button disabled) {
        cursor: default;
        opacity: 0.5;
      }
    `,
  ];

  static template = baseTemplate;

  /** the kind of calendar context this element provides to its months */
  protected abstract readonly type: CalendarContextValue["type"];
  /** parse the value prop into its context representation */
  protected abstract parsedValue(): CalendarContextValue["value"];
  /** the date focus falls back to when the focusedDate prop is not set */
  protected abstract focusFallback(): PlainDate | undefined;
  protected abstract onSelectDay(e: CustomEvent<PlainDate>): void;

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
        createPage(
          this.focusedDatePlain().toPlainYearMonth(),
          this.months,
          this.pageBy,
        ),
      ),
    ));
  }

  constructor() {
    super();

    const root = this.shadowRoot!;
    const container = root.querySelector<HTMLElement>("[part='container']")!;
    this.#previousButton = root.querySelector("button")!;
    this.#nextButton = root.querySelectorAll("button")[1] as HTMLButtonElement;

    // internal events from months bubble through the flattened tree, so we
    // intercept them here, below the host, exactly like the old context
    // element did. this way `focusday` never escapes the host untouched,
    // while `selectday`/`hoverday` keep bubbling unless a subclass stops them
    container.addEventListener("focusday", (e) =>
      this.onFocusDay(e as CustomEvent<PlainDate>),
    );
    container.addEventListener("selectday", (e) =>
      this.onSelectDay(e as CustomEvent<PlainDate>),
    );
    container.addEventListener("hoverday", (e) =>
      this.onHoverDay(e as CustomEvent<PlainDate>),
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
      locale: this.getProp<string | undefined>("locale"),
    }));

    // page change -> update focused date
    this.onConnect(() =>
      effect(() => {
        const page = this.#pageSignal().get();

        untracked(() => {
          const focusedDate = this.focusedDatePlain();
          if (this.#contains(focusedDate)) {
            return;
          }

          const diff = diffInMonths(focusedDate.toPlainYearMonth(), page.start);
          this.#goto(focusedDate.add({ months: diff }));
        });
      }),
    );

    // focused date change -> update page
    this.onConnect(() =>
      effect(() => {
        const focusedDate = this.focusedDatePlain();
        const months = this.months;
        const step = this.#step();

        untracked(() => {
          if (this.#contains(focusedDate)) {
            return;
          }

          const diff = diffInMonths(
            this.#pageSignal().peek().start,
            focusedDate.toPlainYearMonth(),
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
    this.onConnect(() =>
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

  protected minDate() {
    return parseDate(this.getProp("min"));
  }

  protected maxDate() {
    return parseDate(this.getProp("max"));
  }

  /** the effective focused date: prop -> value -> today, clamped to min/max */
  protected focusedDatePlain(): PlainDate {
    const focused =
      parseDate(this.getProp("focusedDate")) ?? this.focusFallback();
    const today = parseDate(this.getProp("today"));
    return clamp(
      focused ?? today ?? getToday(),
      this.minDate(),
      this.maxDate(),
    );
  }

  #contextValue(): CalendarContextValue {
    return {
      type: this.type,
      value: this.parsedValue(),
      min: this.minDate(),
      max: this.maxDate(),
      today: parseDate(this.getProp("today")),
      firstDayOfWeek: this.getProp("firstDayOfWeek"),
      isDateDisallowed: this.getProp("isDateDisallowed"),
      getDayParts: this.getProp("getDayParts"),
      page: this.#pageSignal().get(),
      focusedDate: this.focusedDatePlain(),
      showOutsideDays: this.getProp("showOutsideDays"),
      showWeekNumbers: this.getProp("showWeekNumbers"),
      locale: this.getProp("locale"),
      formatWeekday: this.getProp("formatWeekday"),
    } as CalendarContextValue;
  }

  #step(): number {
    return this.pageBy === "single" ? 1 : this.months;
  }

  #contains(date: PlainDate): boolean {
    const diff = diffInMonths(
      this.#pageSignal().get().start,
      date.toPlainYearMonth(),
    );
    return diff >= 0 && diff < this.months;
  }

  #previousAllowed(): boolean {
    const min = this.minDate();
    return !min || !this.#contains(min);
  }

  #nextAllowed(): boolean {
    const max = this.maxDate();
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
        page.peek().start.add({ months: by }),
        this.months,
        this.pageBy,
      ),
    );
    page.set(next);
    this.emit<PageChangeDetail>("pagechange", {
      start: toDate(next.start),
      end: toDate(endOfMonth(next.end)),
    });
  }

  #goto(date: PlainDate) {
    this.focusedDate = date.toString();
    this.emit("focusday", toDate(date));
  }

  protected onFocusDay(e: CustomEvent<PlainDate>) {
    e.stopPropagation();
    this.#goto(e.detail);
    setTimeout(() => this.focus());
  }

  protected onHoverDay(e: CustomEvent<PlainDate>) {}

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
