import { SignalElement, fire } from "../signal-element.js";
import { CalendarCtx } from "./CalendarMonthContext.js";
import {
  clamp,
  endOfWeek,
  getToday,
  getViewOfMonth,
  getWeekNumber,
  startOfWeek,
  toDate,
} from "../utils/date.js";
import { getDayNames, makeDateFormatter } from "../utils/hooks.js";
import { reset, vh } from "../utils/styles.js";
import type { CalendarFocusOptions } from "../calendar-base/useCalendarBase.js";
import { PlainDate } from "../utils/temporal.js";

const ROWS = 6;
const COLS = 7;

/** Build static template — NO weeknumber cells here; those are created once in setup() */
function buildTemplate(): string {
  const th = `<th scope=col><span class=vh></span><span aria-hidden=true></span></th>`;
  const td = `<td part=td><button class=num type=button tabindex=-1></button></td>`;
  const tr = `<tr part="tr week">${td.repeat(COLS)}</tr>`;
  let cols = "";
  for (let i = 1; i <= COLS; i++) cols += `<col part=col-${i}>`;
  return `<div id=h part=heading></div><table aria-labelledby=h part=table><colgroup>${cols}</colgroup><thead><tr part="tr head">${th.repeat(COLS)}</tr></thead><tbody>${tr.repeat(ROWS)}</tbody></table>`;
}

const MONTH_STYLES = `${reset}${vh}:host{--color-accent:black;--color-text-on-accent:white;display:flex;flex-direction:column;gap:.25rem;text-align:center;inline-size:fit-content}table{border-collapse:collapse;font-size:.875rem}th{inline-size:2.25rem;block-size:2.25rem}td{padding:0}.num{font-variant-numeric:tabular-nums}button{color:inherit;font-size:inherit;background:#0000;border:0;block-size:2.25rem;inline-size:2.25rem}button:hover:where(:not(:disabled,[aria-disabled])){background:#0000000d}button:is([aria-pressed=true],:focus-visible){background:var(--color-accent);color:var(--color-text-on-accent)}button:focus-visible{outline:1px solid var(--color-text-on-accent);outline-offset:-2px}button:disabled,:host::part(outside),:host::part(disallowed){cursor:default;opacity:.5}`;


export class CalendarMonth extends SignalElement<{
  offset: { type: typeof Number };
}> {
  static properties = {
    offset: { type: Number },
  };

  static styles = MONTH_STYLES;
  static template = buildTemplate();

  setup() {
    const root = this.shadowRoot!;
    const heading = root.querySelector<HTMLElement>('[part="heading"]')!;
    const table = root.querySelector<HTMLTableElement>('[part="table"]')!;
    const colgroup = table.querySelector("colgroup")!;
    const theadRow = table.tHead!.rows[0];
    const tbody = table.tBodies[0];

    // ── Pre-create weeknumber cells once (NOT in effects) ─────────────────
    // Created in setup, inserted/removed by effect when showWeekNumbers changes
    const wnCol = document.createElement("col");
    wnCol.part.add("col-weeknumber");

    const wnHeadTh = document.createElement("th");
    wnHeadTh.part.value = "th weeknumber";
    wnHeadTh.scope = "col";
    wnHeadTh.innerHTML = `<slot name=weeknumber><span class=vh>Week</span><span aria-hidden=true>#</span></slot>`;

    const wnBodyThs: HTMLTableCellElement[] = [];
    for (let r = 0; r < ROWS; r++) {
      const th = document.createElement("th");
      th.className = "num";
      th.part.value = "th weeknumber";
      th.scope = "row";
      wnBodyThs.push(th);
    }

    let weekNumbersShown = false;

    return () => {
      const ctxSig = CalendarCtx.consume(this);
      if (!ctxSig) return;

      // ── Event delegation ──────────────────────────────────────────────────
      table.addEventListener("click", (e) => {
        const btn = (e.target as HTMLElement).closest<HTMLButtonElement>("button");
        if (!btn) return;
        const date = getDateFromButton(btn);
        if (!date) return;
        const ctx = ctxSig.value;
        const isDisallowed = ctx.isDateDisallowed?.(toDate(date));
        if (!isDisallowed) {
          fire(this, "selectday", date);
        }
        fire(this, "focusday", clamp(date, ctx.min, ctx.max));
      });

      table.addEventListener("keydown", (e) => {
        const { focusedDate, min, max, firstDayOfWeek } = ctxSig.value;
        const ltr = (e.target as HTMLElement).matches(":dir(ltr)");
        let date: PlainDate;
        switch (e.key) {
          case "ArrowRight": date = focusedDate.add("d", ltr ? 1 : -1); break;
          case "ArrowLeft":  date = focusedDate.add("d", ltr ? -1 : 1); break;
          case "ArrowDown":  date = focusedDate.add("d", 7); break;
          case "ArrowUp":    date = focusedDate.add("d", -7); break;
          case "PageUp":     date = focusedDate.add(e.shiftKey ? "y" : "m", -1); break;
          case "PageDown":   date = focusedDate.add(e.shiftKey ? "y" : "m", 1); break;
          case "Home":       date = startOfWeek(focusedDate, firstDayOfWeek); break;
          case "End":        date = endOfWeek(focusedDate, firstDayOfWeek); break;
          default: return;
        }
        fire(this, "focusday", clamp(date, min, max));
        e.preventDefault();
      });

      table.addEventListener("mouseover", (e) => {
        const btn = (e.target as HTMLElement).closest<HTMLButtonElement>("button");
        if (!btn) return;
        const date = getDateFromButton(btn);
        if (!date) return;
        const ctx = ctxSig.value;
        if (!ctx.isDateDisallowed?.(toDate(date)) && clamp(date, ctx.min, ctx.max) === date) {
          fire(this, "hoverday", date);
        }
      });

      this.fx(() => {
        const ctx = ctxSig.value;
        const { min, max, today, focusedDate, firstDayOfWeek, locale, formatWeekday,
                isDateDisallowed, getDayParts, showOutsideDays } = ctx;
        const offset = this.$.offset.value as number;

        const todaysDate = today ?? getToday();
        const yearMonth = ctx.page.start.add(offset);
        const weeks = getViewOfMonth(yearMonth, firstDayOfWeek);

        // ── Heading ───────────────────────────────────────────────────────
        heading.textContent = makeDateFormatter({ month: "long" }, locale).format(toDate(yearMonth));

        // ── Week numbers column (header) ──────────────────────────────────
        if (ctx.showWeekNumbers && !weekNumbersShown) {
          colgroup.prepend(wnCol);
          theadRow.prepend(wnHeadTh);
          weekNumbersShown = true;
        } else if (!ctx.showWeekNumbers && weekNumbersShown) {
          wnCol.remove();
          wnHeadTh.remove();
          for (const cell of wnBodyThs) cell.remove();
          weekNumbersShown = false;
        }

        // ── Thead day names ───────────────────────────────────────────────
        const daysLong = getDayNames({ weekday: "long" }, firstDayOfWeek, locale);
        const daysVisible = getDayNames({ weekday: formatWeekday }, firstDayOfWeek, locale);
        for (let c = 0; c < COLS; c++) {
          const th = theadRow.cells[weekNumbersShown ? c + 1 : c] as HTMLTableCellElement;
          const dayIndex = (c + firstDayOfWeek) % 7;
          th.part.value = `th day day-${dayIndex}`;
          th.querySelector<HTMLElement>(".vh")!.textContent = daysLong[c];
          th.querySelector<HTMLElement>("[aria-hidden]")!.textContent = daysVisible[c];
        }

        // ── Tbody rows ────────────────────────────────────────────────────
        const dayFormatter = makeDateFormatter({ month: "long", day: "numeric" }, locale);
        for (let r = 0; r < ROWS; r++) {
          const row = tbody.rows[r];
          const week = weeks[r];

          row.hidden = !week;

          if (weekNumbersShown) {
            if (week) {
              if (wnBodyThs[r].parentNode !== row) row.prepend(wnBodyThs[r]);
              wnBodyThs[r].textContent = ""+getWeekNumber(week[0]);
            } else if (wnBodyThs[r].parentNode === row) {
              wnBodyThs[r].remove();
            }
          }

          const dayOffset = weekNumbersShown && !!week ? 1 : 0;
          for (let c = 0; c < COLS; c++) {
            const btn = row.cells[c + dayOffset].querySelector<HTMLButtonElement>("button")!;
            const date = week?.[c];
            const isInMonth = date && yearMonth.year === date.year && yearMonth.month === date.month;

            if (!date || (!showOutsideDays && !isInMonth)) {
              btn.part.value = "button day";
              btn.ariaLabel = "";
              btn.tabIndex = -1;
              btn.disabled = false;
              btn.ariaDisabled = null;
              btn.ariaPressed = "false";
              btn.ariaCurrent = null;
              btn.textContent = "";
              delete btn.dataset.date;
              continue;
            }

            const isFocused = ""+date === ""+focusedDate;
            const isToday = ""+date === ""+todaysDate;
            const asDate = toDate(date);
            const isDisallowed = isDateDisallowed?.(asDate);
            const isDisabled = clamp(date, min, max) !== date;

            let isSelected: boolean | undefined;
            let rangeParts = "";
            if (ctx.type === "range") {
              const [start, end] = ctx.value;
              const isRangeStart = start && ""+start === ""+date;
              const isRangeEnd = end && ""+end === ""+date;
              isSelected = !!(start && end && clamp(date, start, end) === date);
              // prettier-ignore
              rangeParts = `${isRangeStart ? "range-start" : ""} ${isRangeEnd ? "range-end" : ""} ${isSelected && !isRangeStart && !isRangeEnd ? "range-inner" : ""}`;
            } else if (ctx.type === "multi") {
              isSelected = ctx.value.some((d) => ""+d === ""+date);
            } else {
              isSelected = ctx.value && ""+ctx.value === ""+date;
            }

            // prettier-ignore
            const part = `button day day-${asDate.getUTCDay()} ${
              isInMonth ? (isSelected ? "selected" : "") : "outside"
            } ${isDisallowed ? "disallowed" : ""} ${isToday ? "today" : ""} ${
              getDayParts?.(asDate) ?? ""
            } ${rangeParts}`.replace(/\s+/g, " ").trim();

            btn.part.value = part;
            btn.ariaLabel = dayFormatter.format(asDate);
            btn.tabIndex = isInMonth && isFocused ? 0 : -1;
            btn.disabled = isDisabled;
            btn.ariaDisabled = isDisallowed ? "true" : null;
            btn.ariaPressed = ""+!!(isInMonth && isSelected);
            btn.ariaCurrent = isToday ? "date" : null;
            btn.textContent = ""+date.day;
            btn.dataset.date = date.toString();
          }
        }
      });
    };
  }

  override focus(options?: CalendarFocusOptions) {
    this.shadowRoot!
      .querySelector<HTMLButtonElement>("button[tabindex='0']")
      ?.focus(options);
  }
}

customElements.define("calendar-month", CalendarMonth);

function getDateFromButton(btn: HTMLButtonElement): PlainDate | undefined {
  const s = btn.dataset.date;
  return s ? PlainDate.from(s) : undefined;
}
