import { SignalElement } from "../signal-element.js";
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
  // thead: 7 day th cells (no weeknumber)
  let theadCells = "";
  for (let c = 0; c < COLS; c++) {
    theadCells += `<th scope="col"><span class="vh"></span><span aria-hidden="true"></span></th>`;
  }

  // tbody: 6 rows × 7 td with button (no weeknumber cells)
  let tbodyRows = "";
  for (let r = 0; r < ROWS; r++) {
    let cells = "";
    for (let c = 0; c < COLS; c++) {
      cells += `<td part="td"><button class="num" type="button" tabindex="-1"></button></td>`;
    }
    tbodyRows += `<tr part="tr week">${cells}</tr>`;
  }

  return `
    <div id="h" part="heading"></div>
    <table aria-labelledby="h" part="table">
      <colgroup>
        <col part="col-1" />
        <col part="col-2" />
        <col part="col-3" />
        <col part="col-4" />
        <col part="col-5" />
        <col part="col-6" />
        <col part="col-7" />
      </colgroup>
      <thead>
        <tr part="tr head">${theadCells}</tr>
      </thead>
      <tbody>${tbodyRows}</tbody>
    </table>
  `;
}

const MONTH_STYLES = `
  ${reset}
  ${vh}

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
  :host::part(outside),
  :host::part(disallowed) {
    cursor: default;
    opacity: 0.5;
  }
`;

const longDayOptions = { weekday: "long" } as const;
const monthOptions = { month: "long" } as const;
const dayOptions = { month: "long", day: "numeric" } as const;

export class CalendarMonth extends SignalElement<{
  offset: { type: typeof Number };
}> {
  static properties = {
    offset: { type: Number, value: 0 },
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
    wnCol.setAttribute("part", "col-weeknumber");

    const wnHeadTh = document.createElement("th");
    wnHeadTh.setAttribute("part", "th weeknumber");
    wnHeadTh.setAttribute("scope", "col");
    wnHeadTh.innerHTML = `<slot name="weeknumber"><span class="vh">Week</span><span aria-hidden="true">#</span></slot>`;

    const wnBodyThs: HTMLTableCellElement[] = [];
    for (let r = 0; r < ROWS; r++) {
      const th = document.createElement("th");
      th.className = "num";
      th.setAttribute("part", "th weeknumber");
      th.setAttribute("scope", "row");
      wnBodyThs.push(th);
    }

    let weekNumbersShown = false;

    // ── Event delegation ──────────────────────────────────────────────────
    table.addEventListener("click", (e) => {
      const btn = (e.target as HTMLElement).closest<HTMLButtonElement>("button");
      if (!btn) return;
      const date = getDateFromButton(btn);
      if (!date) return;
      const ctxSig = CalendarCtx.consume(this);
      if (!ctxSig) return;
      const ctx = ctxSig.value;
      const isDisallowed = ctx.isDateDisallowed?.(toDate(date));
      if (!isDisallowed) {
        this.dispatchEvent(new CustomEvent("selectday", { bubbles: true, detail: date }));
      }
      this.dispatchEvent(
        new CustomEvent("focusday", { bubbles: true, detail: clamp(date, ctx.min, ctx.max) })
      );
    });

    table.addEventListener("keydown", (e) => {
      const ctxSig = CalendarCtx.consume(this);
      if (!ctxSig) return;
      const { focusedDate, min, max, firstDayOfWeek } = ctxSig.value;
      const ltr = (e.target as HTMLElement).matches(":dir(ltr)");
      let date: PlainDate;
      switch (e.key) {
        case "ArrowRight": date = focusedDate.add({ days: ltr ? 1 : -1 }); break;
        case "ArrowLeft":  date = focusedDate.add({ days: ltr ? -1 : 1 }); break;
        case "ArrowDown":  date = focusedDate.add({ days: 7 }); break;
        case "ArrowUp":    date = focusedDate.add({ days: -7 }); break;
        case "PageUp":     date = focusedDate.add(e.shiftKey ? { years: -1 } : { months: -1 }); break;
        case "PageDown":   date = focusedDate.add(e.shiftKey ? { years: 1 } : { months: 1 }); break;
        case "Home":       date = startOfWeek(focusedDate, firstDayOfWeek); break;
        case "End":        date = endOfWeek(focusedDate, firstDayOfWeek); break;
        default: return;
      }
      this.dispatchEvent(new CustomEvent("focusday", { bubbles: true, detail: clamp(date, min, max) }));
      e.preventDefault();
    });

    table.addEventListener("mouseover", (e) => {
      const btn = (e.target as HTMLElement).closest<HTMLButtonElement>("button");
      if (!btn) return;
      const date = getDateFromButton(btn);
      if (!date) return;
      const ctxSig = CalendarCtx.consume(this);
      if (!ctxSig) return;
      const ctx = ctxSig.value;
      if (!ctx.isDateDisallowed?.(toDate(date)) && clamp(date, ctx.min, ctx.max) === date) {
        this.dispatchEvent(new CustomEvent("hoverday", { bubbles: true, detail: date }));
      }
    });

    return () => {
      const ctxSig = CalendarCtx.consume(this);
      if (!ctxSig) return;

      this.createEffect(() => {
        const ctx = ctxSig.value;
        const { min, max, today, focusedDate, firstDayOfWeek, locale, formatWeekday,
                isDateDisallowed, getDayParts, showOutsideDays } = ctx;
        const offset = this.$.offset.value as number;

        const todaysDate = today ?? getToday();
        const yearMonth = ctx.page.start.add({ months: offset });
        const weeks = getViewOfMonth(yearMonth, firstDayOfWeek);

        // ── Heading ───────────────────────────────────────────────────────
        heading.textContent = makeDateFormatter(monthOptions, locale).format(toDate(yearMonth));

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
        const daysLong = getDayNames(longDayOptions, firstDayOfWeek, locale);
        const daysVisible = getDayNames({ weekday: formatWeekday }, firstDayOfWeek, locale);
        for (let c = 0; c < COLS; c++) {
          const th = theadRow.cells[weekNumbersShown ? c + 1 : c] as HTMLTableCellElement;
          const dayIndex = (c + firstDayOfWeek) % 7;
          th.setAttribute("part", `th day day-${dayIndex}`);
          th.querySelector<HTMLElement>(".vh")!.textContent = daysLong[c];
          th.querySelector<HTMLElement>("[aria-hidden]")!.textContent = daysVisible[c];
        }

        // ── Tbody rows ────────────────────────────────────────────────────
        const dayFormatter = makeDateFormatter(dayOptions, locale);
        for (let r = 0; r < ROWS; r++) {
          const row = tbody.rows[r];
          const week = weeks[r];

          row.hidden = !week;

          if (weekNumbersShown) {
            if (week) {
              if (wnBodyThs[r].parentNode !== row) row.prepend(wnBodyThs[r]);
              wnBodyThs[r].textContent = String(getWeekNumber(week[0]));
            } else if (wnBodyThs[r].parentNode === row) {
              wnBodyThs[r].remove();
            }
          }

          const dayOffset = weekNumbersShown && !!week ? 1 : 0;
          for (let c = 0; c < COLS; c++) {
            const btn = row.cells[c + dayOffset].querySelector<HTMLButtonElement>("button")!;
            const date = week?.[c];
            const isInMonth = date ? yearMonth.equals(date) : false;

            if (!date || (!showOutsideDays && !isInMonth)) {
              btn.setAttribute("part", "button day");
              btn.setAttribute("aria-label", "");
              btn.tabIndex = -1;
              btn.disabled = false;
              btn.removeAttribute("aria-disabled");
              btn.setAttribute("aria-pressed", "false");
              btn.removeAttribute("aria-current");
              btn.textContent = "";
              btn.removeAttribute("data-date");
              continue;
            }

            const isFocused = date.equals(focusedDate);
            const isToday = date.equals(todaysDate);
            const asDate = toDate(date);
            const isDisallowed = isDateDisallowed?.(asDate);
            const isDisabled = clamp(date, min, max) !== date;

            let isSelected: boolean | undefined;
            let rangeParts = "";
            if (ctx.type === "range") {
              const [start, end] = ctx.value;
              const isRangeStart = start?.equals(date);
              const isRangeEnd = end?.equals(date);
              isSelected = !!(start && end && clamp(date, start, end) === date);
              // prettier-ignore
              rangeParts = `${isRangeStart ? "range-start" : ""} ${isRangeEnd ? "range-end" : ""} ${isSelected && !isRangeStart && !isRangeEnd ? "range-inner" : ""}`;
            } else if (ctx.type === "multi") {
              isSelected = ctx.value.some((d) => d.equals(date));
            } else {
              isSelected = ctx.value?.equals(date);
            }

            // prettier-ignore
            const part = `button day day-${asDate.getUTCDay()} ${
              isInMonth ? (isSelected ? "selected" : "") : "outside"
            } ${isDisallowed ? "disallowed" : ""} ${isToday ? "today" : ""} ${
              getDayParts?.(asDate) ?? ""
            } ${rangeParts}`.replace(/\s+/g, " ").trim();

            btn.setAttribute("part", part);
            btn.setAttribute("aria-label", dayFormatter.format(asDate));
            btn.tabIndex = isInMonth && isFocused ? 0 : -1;
            btn.disabled = isDisabled;
            if (isDisallowed) btn.setAttribute("aria-disabled", "true");
            else btn.removeAttribute("aria-disabled");
            btn.setAttribute("aria-pressed", String(!!(isInMonth && isSelected)));
            if (isToday) btn.setAttribute("aria-current", "date");
            else btn.removeAttribute("aria-current");
            btn.textContent = String(date.day);
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
  if (!s) return undefined;
  try {
    return PlainDate.from(s);
  } catch {
    return undefined;
  }
}
