import "../calendar-heading/calendar-heading.js";
import {
  dayHeaderHtml,
  monthHtml,
  weekRowHtml,
} from "./calendar-month.template.js";
import {
  BaseElement,
  css,
  define,
  num,
  setAttr,
  template,
} from "../core/element.js";
import { effect } from "../core/signals.js";
import { consumeContext, provideContext } from "../core/context.js";
import {
  CalendarContext,
  type CalendarContextValue,
} from "./CalendarMonthContext.js";
import { CalendarHeadingContext } from "../calendar-heading/CalendarHeadingContext.js";
import { reset, vh } from "../utils/styles.js";
import {
  clamp,
  endOfWeek,
  getViewOfMonth,
  getWeekNumber,
  startOfWeek,
  toDate,
  getToday,
} from "../utils/date.js";
import { dateFormatter, getDayNames } from "../utils/parse.js";
import type { PlainDate } from "../utils/temporal.js";

const inRange = (date: PlainDate, min?: PlainDate, max?: PlainDate) =>
  clamp(date, min, max) === date;

const isLTR = (e: Event) => (e.target as HTMLElement).matches(":dir(ltr)");

const dispatchOptions = { bubbles: true };

// all 6 possible week rows are rendered up front; rows and week number
// cells that aren't needed get detached from the DOM as the view changes
const monthTemplate = template(
  monthHtml
    .replace("$days", dayHeaderHtml.repeat(7))
    .replace("$weeks", weekRowHtml.repeat(6)),
);

interface Cell {
  td_: HTMLTableCellElement;
  button_: HTMLButtonElement;
  date_: PlainDate;
}

interface Row {
  tr_: HTMLTableRowElement;
  weekNumber_: HTMLTableCellElement;
  cells_: Cell[];
}

/** attach or detach a node from a fixed position in the static DOM */
const toggle = (
  show: unknown,
  node: Element,
  attach: (node: Element) => void,
) => {
  if (show) {
    if (!node.parentNode) attach(node);
  } else {
    node.remove();
  }
};

export interface CalendarMonth {
  offset: number;
}

export class CalendarMonth extends BaseElement {
  static props_ = {
    offset: num(0),
  };

  static styles_ = [
    reset,
    vh,
    css`
      :host {
        --color-accent: black;
        --color-text-on-accent: white;

        display: flex;
        flex-direction: column;
        gap: 0.25rem;
        text-align: center;
        inline-size: fit-content;
      }

      table {
        border-collapse: collapse;
        font-size: 0.875rem;
      }

      th {
        inline-size: 2.25rem;
        block-size: 2.25rem;
      }

      td {
        padding-inline: 0;
      }

      .num {
        font-variant-numeric: tabular-nums;
      }

      button {
        color: inherit;
        font-size: inherit;
        background: transparent;
        border: 0;
        block-size: 2.25rem;
        inline-size: 2.25rem;
      }

      button:hover:where(:not(:disabled, [aria-disabled])) {
        background: #0000000d;
      }

      button:is([aria-pressed="true"], :focus-visible) {
        background: var(--color-accent);
        color: var(--color-text-on-accent);
      }

      button:focus-visible {
        outline: 1px solid var(--color-text-on-accent);
        outline-offset: -2px;
      }

      button:disabled,
      [part~="outside"],
      [part~="disallowed"] {
        cursor: default;
        opacity: 0.5;
      }
    `,
  ];

  static template_ = monthTemplate;

  #context: () => CalendarContextValue;
  #table: HTMLTableElement;
  #colWeekNumber: HTMLTableColElement;
  #colGroup: HTMLTableColElement;
  #headRow: HTMLTableRowElement;
  #headWeekNumber: HTMLTableCellElement;
  #headDays: HTMLTableCellElement[];
  #tbody: HTMLTableSectionElement;
  #rows: Row[];
  #cellByButton = new Map<HTMLButtonElement, Cell>();

  constructor() {
    super();

    const root = this.shadowRoot!;
    this.#table = root.querySelector("table")!;
    this.#colGroup = root.querySelector("colgroup")!;
    this.#colWeekNumber = root.querySelector("col")!;
    this.#headRow = this.#table.tHead!.rows[0]!;
    this.#headWeekNumber = this.#headRow.cells[0]!;
    this.#headDays = [...this.#headRow.cells].slice(1);
    this.#tbody = this.#table.tBodies[0]!;

    this.#rows = [...this.#tbody.rows].map((tr) => {
      const row: Row = {
        tr_: tr,
        weekNumber_: tr.cells[0]!,
        cells_: [...tr.cells].slice(1).map((td) => ({
          td_: td,
          button_: td.querySelector("button")!,
          date_: undefined as unknown as PlainDate,
        })),
      };
      for (const cell of row.cells_) {
        this.#cellByButton.set(cell.button_, cell);
      }
      return row;
    });

    this.#table.addEventListener("click", this.#onClick);
    this.#table.addEventListener("keydown", this.#onKeyDown);
    this.#table.addEventListener("mouseover", this.#onMouseOver);

    this.#context = consumeContext(this, CalendarContext);

    provideContext(this, CalendarHeadingContext, () => {
      const ctx = this.#context();
      return {
        type: "date" as const,
        value: ctx.page.start.add({ months: this.getProp_<number>("offset") }),
        locale: ctx.locale,
      };
    });

    this.onConnect_(() => effect(() => this.#render()));
  }

  focus() {
    this.#table
      .querySelector<HTMLButtonElement>("button[tabindex='0']")
      ?.focus();
  }

  #cellFor(e: Event): Cell | undefined {
    const button = (e.target as Element).closest?.("button");
    return button
      ? this.#cellByButton.get(button as HTMLButtonElement)
      : undefined;
  }

  #focusDay_(date: PlainDate) {
    const { min, max } = this.#context();
    this.emit_("focusday", clamp(date, min, max), dispatchOptions);
  }

  #onClick = (e: Event) => {
    const cell = this.#cellFor(e);
    if (!cell) return;

    const ctx = this.#context();
    if (!ctx.isDateDisallowed?.(toDate(cell.date_))) {
      this.emit_("selectday", cell.date_, dispatchOptions);
    }
    this.#focusDay_(cell.date_);
  };

  #onMouseOver = (e: Event) => {
    const cell = this.#cellFor(e);
    if (!cell) return;

    const ctx = this.#context();
    const isDisallowed = ctx.isDateDisallowed?.(toDate(cell.date_));
    const isDisabled = !inRange(cell.date_, ctx.min, ctx.max);
    if (!isDisallowed && !isDisabled) {
      this.emit_("hoverday", cell.date_, dispatchOptions);
    }
  };

  #onKeyDown = (e: KeyboardEvent) => {
    if (!this.#cellFor(e)) return;

    const { focusedDate, firstDayOfWeek } = this.#context();
    const forward = isLTR(e) ? 1 : -1;
    const byYear = e.shiftKey;

    const moves: Record<string, () => PlainDate> = {
      ArrowRight: () => focusedDate.add({ days: forward }),
      ArrowLeft: () => focusedDate.add({ days: -forward }),
      ArrowDown: () => focusedDate.add({ days: 7 }),
      ArrowUp: () => focusedDate.add({ days: -7 }),
      PageUp: () => focusedDate.add(byYear ? { years: -1 } : { months: -1 }),
      PageDown: () => focusedDate.add(byYear ? { years: 1 } : { months: 1 }),
      Home: () => startOfWeek(focusedDate, firstDayOfWeek),
      End: () => endOfWeek(focusedDate, firstDayOfWeek),
    };

    const date = moves[e.key]?.();
    if (!date) return;
    this.#focusDay_(date);
    e.preventDefault();
  };

  #render() {
    const ctx = this.#context();
    const offset = this.getProp_<number>("offset");

    const {
      firstDayOfWeek,
      isDateDisallowed,
      min,
      max,
      today,
      page,
      locale,
      focusedDate,
      formatWeekday,
      showWeekNumbers,
      showOutsideDays,
    } = ctx;

    const todaysDate = today ?? getToday();
    const yearMonth = page.start.add({ months: offset });
    const weeks = getViewOfMonth(yearMonth, firstDayOfWeek);

    const daysLong = getDayNames({ weekday: "long" }, firstDayOfWeek, locale);
    const daysVisible = getDayNames(
      { weekday: formatWeekday },
      firstDayOfWeek,
      locale,
    );
    const dayFormatter = dateFormatter(
      { month: "long", day: "numeric" },
      locale,
    );

    toggle(showWeekNumbers, this.#colWeekNumber, (node) =>
      this.#colGroup.prepend(node),
    );
    toggle(showWeekNumbers, this.#headWeekNumber, (node) =>
      this.#headRow.prepend(node),
    );

    this.#headDays.forEach((th, i) => {
      th.setAttribute("part", `th day day-${(i + firstDayOfWeek) % 7}`);
      th.children[0]!.textContent = daysLong[i]!;
      th.children[1]!.textContent = daysVisible[i]!;
    });

    this.#rows.forEach((row, i) => {
      const week = weeks[i];
      toggle(week, row.tr_, (node) => this.#tbody.append(node));
      if (!week) return;

      toggle(showWeekNumbers, row.weekNumber_, (node) => row.tr_.prepend(node));
      if (showWeekNumbers) {
        row.weekNumber_.textContent = `${getWeekNumber(week[0])}`;
      }

      row.cells_.forEach((cell, j) => {
        const date = week[j]!;
        cell.date_ = date;

        const { button_: button, td_: td } = cell;
        const isInMonth = yearMonth.equals(date);

        // days outside of month are only shown if `showOutsideDays` is true
        if (!showOutsideDays && !isInMonth) {
          button.remove();
          return;
        }
        if (!button.parentNode) td.append(button);

        const isFocusedDay = date.equals(focusedDate);
        const isToday = date.equals(todaysDate);
        const asDate = toDate(date);
        const isDisallowed = isDateDisallowed?.(asDate);
        const isDisabled = !inRange(date, min, max);

        let parts = "";
        let isSelected: boolean | undefined;

        if (ctx.type === "range") {
          const [start, end] = ctx.value;
          const isRangeStart = start?.equals(date);
          const isRangeEnd = end?.equals(date);
          isSelected = start && end && inRange(date, start, end);

          // prettier-ignore
          parts = `${
            isRangeStart ? "range-start" : ""
          } ${
            isRangeEnd ? "range-end" : ""
          } ${
            isSelected && !isRangeStart && !isRangeEnd ? "range-inner" : ""
          }`;
        } else if (ctx.type === "multi") {
          isSelected = ctx.value.some((d) => d.equals(date));
        } else {
          isSelected = ctx.value?.equals(date);
        }

        // prettier-ignore
        const commonParts = `button day day-${asDate.getUTCDay()} ${
          // we don't want outside days to ever be shown as selected
          isInMonth ? (isSelected ? "selected" : "") : "outside"
        } ${
          isDisallowed ? "disallowed" : ""
        } ${
          isToday ? "today" : ""
        } ${
          ctx.getDayParts?.(asDate) ?? ""
        }`;

        button.setAttribute("part", `${commonParts} ${parts}`);
        button.tabIndex = isInMonth && isFocusedDay ? 0 : -1;
        button.disabled = isDisabled;
        setAttr(button, "aria-disabled", isDisallowed ? "true" : undefined);
        setAttr(button, "aria-pressed", isInMonth && isSelected);
        setAttr(button, "aria-current", isToday ? "date" : undefined);
        setAttr(button, "aria-label", dayFormatter.format(asDate));
        button.textContent = `${date.day}`;
      });
    });
  }
}

define("calendar-month", CalendarMonth);
