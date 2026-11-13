import {
  Base,
  css,
  setAttr,
  setText,
  template,
  type PropDefs,
} from "../utils/base.js";
import { computed } from "../utils/signals.js";
import {
  clamp,
  endOfWeek,
  getDayNames,
  getFormatter,
  getToday,
  getViewOfMonth,
  getWeekNumber,
  startOfWeek,
  toDate,
} from "../utils/date.js";
import type { PlainDate } from "../utils/temporal.js";
import { CalendarHeadingContext } from "../calendar-heading/CalendarHeadingContext.js";
import "../calendar-heading/calendar-heading.js";
import { CalendarContext, type DayEvents } from "./CalendarMonthContext.js";
import reset from "../utils/reset.css?inline";
import styles from "./calendar-month.css?inline";

interface MonthProps {
  offset: number;
}

const inRange = (date: PlainDate, min?: PlainDate, max?: PlainDate) =>
  clamp(date, min, max) === date;

const day = (
  <td part="td">
    <button class="num" />
  </td>
);

const week = (
  <tr part="tr week">
    <th class="num" part="th weeknumber" scope="row" />
    {day.repeat(7)}
  </tr>
);

const weekday = (
  <th scope="col">
    <span class="vh" />
    <span aria-hidden="true" />
  </th>
);

/**
 * Connects or disconnects a node that was rendered up front
 */
function toggle(
  parent: Element,
  node: Element,
  show: unknown,
  first?: boolean,
) {
  if (!show) {
    node.remove();
  } else if (!node.parentNode) {
    first ? parent.prepend(node) : parent.append(node);
  }
}

export interface CalendarMonth extends MonthProps {}

export class CalendarMonth extends Base<MonthProps, {}, DayEvents> {
  static props: PropDefs<MonthProps> = {
    offset: [Number, 0],
  };

  // everything that could be shown is rendered once, up front.
  // what is not needed (e.g. a sixth week) is taken out of the tree until it is.
  static template = template(
    <>
      <calendar-heading month="long" id="h" class="vh" />

      <slot name="heading" part="heading">
        <calendar-heading month="long" aria-hidden="true" />
      </slot>

      <table aria-labelledby="h" part="table">
        <colgroup>
          <col part="col-weeknumber" />
          <col part="col-1" />
          <col part="col-2" />
          <col part="col-3" />
          <col part="col-4" />
          <col part="col-5" />
          <col part="col-6" />
          <col part="col-7" />
        </colgroup>
        <thead>
          <tr part="tr head">
            <th part="th weeknumber">
              <slot name="weeknumber">
                <span class="vh">Week</span>
                <span aria-hidden="true">#</span>
              </slot>
            </th>
            {weekday.repeat(7)}
          </tr>
        </thead>
        <tbody>{week.repeat(6)}</tbody>
      </table>
    </>,
  );

  static styles = css(reset, styles);

  #table = this.query<HTMLTableElement>("table");

  constructor() {
    super();
    const context = this.consume(CalendarContext);
    const tbody = this.#table.tBodies[0]!;
    const weeks = [...tbody.rows];
    const weekNumbers = weeks.map((week) => week.cells[0]!);
    const buttons = [...tbody.querySelectorAll("button")];
    const cells = buttons.map((button) => button.parentElement!);
    const weekdays = this.#table.querySelectorAll("th[scope=col]");
    // every cell in the week number column, paired with its parent
    const weekNumberColumn = [
      ...this.#table.querySelectorAll("[part*=weeknumber]"),
    ].map((cell) => [cell.parentElement!, cell] as const);

    // the date each button currently represents
    let dates: PlainDate[] = [];

    const yearMonth = computed(() =>
      context.value.page.value.start.add({ months: this.offset }),
    );

    const view = computed(() =>
      getViewOfMonth(yearMonth.value, context.value.firstDayOfWeek.value),
    );

    const dayFormatter = computed(() =>
      getFormatter(
        { month: "long", day: "numeric" },
        context.value.locale.value,
      ),
    );

    this.provide(CalendarHeadingContext, {
      page: computed(() => ({ start: yearMonth.value, end: yearMonth.value })),
      locale: computed(() => context.value.locale.value),
    });

    // week number column
    this.effect(() => {
      for (const [parent, cell] of weekNumberColumn) {
        toggle(parent, cell, context.value.showWeekNumbers.value, true);
      }
    });

    // days of the week
    this.effect(() => {
      const { firstDayOfWeek, formatWeekday, locale } = context.value;
      const first = firstDayOfWeek.value;
      const long = getDayNames("long", first, locale.value);
      const visible = getDayNames(formatWeekday.value, first, locale.value);

      weekdays.forEach((th, i) => {
        setAttr(th, "part", `th day day-${(i + first) % 7}`);
        setText(th.children[0]!, long[i]!);
        setText(th.children[1]!, visible[i]!);
      });
    });

    // weeks and days
    this.effect(() => {
      const ctx = context.value;
      const min = ctx.min.value;
      const max = ctx.max.value;
      const today = ctx.today.value ?? getToday();
      const focusedDate = ctx.focusedDate.value;
      const isDateDisallowed = ctx.isDateDisallowed.value;
      const getDayParts = ctx.getDayParts.value;
      const showOutsideDays = ctx.showOutsideDays.value;
      const [start, end] = ctx.value.value;

      dates = view.value.flat();

      weeks.forEach((week, i) => {
        const date = dates[i * 7];
        toggle(tbody, week, date);
        if (date) setText(weekNumbers[i]!, getWeekNumber(date));
      });

      buttons.forEach((button, i) => {
        const date = dates[i];
        const isInMonth = !!date && yearMonth.value.equals(date);

        // days outside of month are only shown if `showOutsideDays` is true
        const isShown = date && (isInMonth || showOutsideDays);
        toggle(cells[i]!, button, isShown);
        if (!isShown) return;

        const isToday = date.equals(today);
        const asDate = toDate(date);
        const isDisallowed = isDateDisallowed?.(asDate);

        const isRange = ctx.type === "range";
        const isRangeStart = isRange && start?.equals(date);
        const isRangeEnd = isRange && end?.equals(date);
        let isSelected: boolean | undefined;

        if (isRange) {
          isSelected = start && end && inRange(date, start, end);
        } else if (ctx.type === "multi" || start) {
          isSelected = ctx.value.value.some((d) => d.equals(date));
        }

        setAttr(
          button,
          "part",
          [
            "button day",
            `day-${asDate.getUTCDay()}`,
            // we don't want outside days to ever be shown as selected
            isInMonth ? isSelected && "selected" : "outside",
            isDisallowed && "disallowed",
            isToday && "today",
            getDayParts?.(asDate),
            isRangeStart && "range-start",
            isRangeEnd && "range-end",
            isRange &&
              isSelected &&
              !isRangeStart &&
              !isRangeEnd &&
              "range-inner",
          ]
            .filter(Boolean)
            .join(" "),
        );
        setAttr(
          button,
          "tabindex",
          isInMonth && date.equals(focusedDate) ? 0 : -1,
        );
        setAttr(button, "aria-disabled", isDisallowed ? "true" : null);
        // note: this is intentionally absent for an in-month day when nothing is selected
        setAttr(button, "aria-pressed", isInMonth && isSelected);
        setAttr(button, "aria-current", isToday ? "date" : null);
        setAttr(button, "aria-label", dayFormatter.value.format(asDate));
        setText(button, date.day);
        button.disabled = !inRange(date, min, max);
      });
    });

    //
    // events are delegated, since the buttons are static
    //

    const getDate = (e: Event) =>
      dates[buttons.indexOf((e.target as Element).closest("button")!)];

    const isDisallowed = (date: PlainDate) =>
      context.value.isDateDisallowed.value?.(toDate(date));

    const focusDay = (date: PlainDate) => {
      const { min, max } = context.value;
      this.emit("focusday", clamp(date, min.value, max.value), true);
    };

    tbody.addEventListener("click", (e) => {
      const date = getDate(e);

      if (date) {
        if (!isDisallowed(date)) {
          this.emit("selectday", date, true);
        }
        focusDay(date);
      }
    });

    tbody.addEventListener("mouseover", (e) => {
      const date = getDate(e);
      const { min, max } = context.value;

      if (date && !isDisallowed(date) && inRange(date, min.value, max.value)) {
        this.emit("hoverday", date, true);
      }
    });

    tbody.addEventListener("keydown", (e) => {
      const focusedDate = context.value.focusedDate.value;
      const firstDayOfWeek = context.value.firstDayOfWeek.value;
      const direction = (e.target as Element).matches(":dir(ltr)") ? 1 : -1;
      let date: PlainDate;

      switch (e.key) {
        case "ArrowRight":
          date = focusedDate.add({ days: direction });
          break;
        case "ArrowLeft":
          date = focusedDate.add({ days: -direction });
          break;
        case "ArrowDown":
          date = focusedDate.add({ days: 7 });
          break;
        case "ArrowUp":
          date = focusedDate.add({ days: -7 });
          break;
        case "PageUp":
          date = focusedDate.add(e.shiftKey ? { years: -1 } : { months: -1 });
          break;
        case "PageDown":
          date = focusedDate.add(e.shiftKey ? { years: 1 } : { months: 1 });
          break;
        case "Home":
          date = startOfWeek(focusedDate, firstDayOfWeek);
          break;
        case "End":
          date = endOfWeek(focusedDate, firstDayOfWeek);
          break;
        default:
          return;
      }

      focusDay(date);
      e.preventDefault();
    });
  }

  focus() {
    this.#table.querySelector<HTMLElement>("button[tabindex='0']")?.focus();
  }
}

CalendarMonth.define("calendar-month");

declare global {
  interface HTMLElementTagNameMap {
    "calendar-month": CalendarMonth;
  }
}
