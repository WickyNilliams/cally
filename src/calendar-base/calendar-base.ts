import { reset, vh } from "../utils/styles.js";
import { signal, batch, type Signal } from "../signal-element.js";
import { SignalElement } from "../signal-element.js";
import {
  CalendarCtx,
  type CalendarContextValue,
  type CalendarContextBase,
} from "../calendar-month/CalendarMonthContext.js";
import {
  createPage,
  diffInMonths,
  type Pagination,
  type CalendarFocusOptions,
} from "./useCalendarBase.js";
import { parseDateProp, makeDateFormatter } from "../utils/hooks.js";
import {
  clamp,
  endOfMonth,
  getToday,
  toDate,
  type DaysOfWeek,
} from "../utils/date.js";
import { PlainDate, PlainYearMonth } from "../utils/temporal.js";

export const BASE_STYLES = `
  ${reset}
  ${vh}

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

  [part~="button"][part~="disabled"] {
    cursor: default;
    opacity: 0.5;
  }
`;

export function createBaseTemplate(): string {
  return `
    <div class="vh" id="h" aria-live="polite" aria-atomic="true"></div>
    <div role="group" aria-labelledby="h" part="container">
      <div part="header">
        <button part="button previous">
          <slot name="previous">Previous</slot>
        </button>
        <slot part="heading" name="heading">
          <div aria-hidden="true"></div>
        </slot>
        <button part="button next">
          <slot name="next">Next</slot>
        </button>
      </div>
      <slot part="months"></slot>
    </div>
  `;
}

// Shared property definitions (mirrors the old `props` export shape for reference)
export const sharedProps = {
  value: { type: String, value: "" },
  min: { type: String, value: "" },
  max: { type: String, value: "" },
  today: { type: String, value: "" },
  isDateDisallowed: { type: Function, value: (_date: Date) => false },
  formatWeekday: { type: String, value: (): "narrow" | "short" => "narrow" },
  getDayParts: { type: Function, value: (_date: Date): string => "" },
  firstDayOfWeek: { type: Number, value: (): DaysOfWeek => 1 },
  showOutsideDays: { type: Boolean, value: false },
  locale: { type: String, value: (): string | undefined => undefined },
  months: { type: Number, value: 1 },
  focusedDate: { type: String, value: (): string | undefined => undefined },
  pageBy: { type: String, value: (): Pagination => "months" },
  showWeekNumbers: { type: Boolean, value: false },
} as const;

const formatOptions = { year: "numeric" } as const;
const formatVerboseOptions = { year: "numeric", month: "long" } as const;

type PageType = { start: PlainYearMonth; end: PlainYearMonth };

/**
 * Builds the shared context fields common to all three calendar types.
 * Each component's buildCtxValue callback spreads this and adds `type` + `value`.
 */
export function buildSharedCtx<P extends typeof sharedProps>(
  self: SignalElement<P>,
  focusedDate: PlainDate,
  page: PageType,
): CalendarContextBase {
  return {
    min: parseDateProp(self.$.min.value as string),
    max: parseDateProp(self.$.max.value as string),
    today: parseDateProp(self.$.today.value as string),
    firstDayOfWeek: self.$.firstDayOfWeek.value as DaysOfWeek,
    isDateDisallowed: self.$.isDateDisallowed.value as
      | ((d: Date) => boolean)
      | undefined,
    getDayParts: self.$.getDayParts.value as ((d: Date) => string) | undefined,
    formatWeekday: ((self.$.formatWeekday.value as string) || "narrow") as
      | "narrow"
      | "short",
    showOutsideDays: self.$.showOutsideDays.value as boolean,
    showWeekNumbers: self.$.showWeekNumbers.value as boolean,
    locale: (self.$.locale.value as string) || undefined,
    focusedDate,
    page,
  };
}

export function setPrevNext(btn: HTMLButtonElement, enabled: boolean) {
  const name = btn.part.contains("previous") ? "previous" : "next";
  btn.setAttribute("part", `button ${name}${enabled ? "" : " disabled"}`);
  btn.setAttribute("aria-disabled", enabled ? "false" : "true");
}

/**
 * Shared setup for calendar-date, calendar-range, and calendar-multi.
 *
 * @param self         - The host element (a SignalElement subclass)
 * @param initFd       - Initial focused date (already resolved from props by the caller)
 * @param buildCtxValue - Callback to build the context value from current signals
 * @param onFocusDay   - Optional extra handler called when a focusday event arrives
 *                       (used by calendar-range to update `hovered`)
 */
export function setupCalendarBase<P extends typeof sharedProps>(
  self: SignalElement<P>,
  initFd: PlainDate,
  buildCtxValue: (fd: PlainDate, page: PageType) => CalendarContextValue,
  onFocusDay?: (date: PlainDate) => void,
): {
  focusedDate: Signal<PlainDate>;
  page: Signal<PageType>;
  containsDate: (d: PlainDate) => boolean;
  registerEffects: () => void;
} {
  const root = self.shadowRoot!;
  const hiddenHeading = root.querySelector<HTMLElement>("#h")!;
  const visibleHeading = root.querySelector<HTMLElement>(
    '[part="heading"] [aria-hidden]',
  )!;
  const prevBtn = root.querySelector<HTMLButtonElement>("[part~='previous']")!;
  const nextBtn = root.querySelector<HTMLButtonElement>("[part~='next']")!;

  const focusedDate = signal<PlainDate>(
    clamp(
      initFd,
      parseDateProp(self.$.min.value as string),
      parseDateProp(self.$.max.value as string),
    ),
  );
  const page = signal<PageType>(
    createPage(
      focusedDate.value.toPlainYearMonth(),
      (self.$.months.value as number) || 1,
      (self.$.pageBy.value as Pagination) || "months",
    ),
  );

  Object.defineProperty(self, "focusedDate", {
    get: () => focusedDate.value.toString(),
    set: (v: string) => {
      self.$.focusedDate.value = v;
    },
    enumerable: true,
    configurable: true,
  });

  const getStep = () =>
    (self.$.pageBy.value as Pagination) === "single"
      ? 1
      : (self.$.months.value as number);

  const updatePage = (by: number) => {
    const months = self.$.months.value as number;
    const pageBy = self.$.pageBy.value as Pagination;
    const newPage = createPage(
      page.value.start.add({ months: by }),
      months,
      pageBy,
    );
    const fd = focusedDate.value;
    const diff = diffInMonths(newPage.start, fd.toPlainYearMonth());
    let newFd = fd;
    if (diff < 0 || diff >= months) {
      const targetMonth = newPage.start;
      const maxDay = endOfMonth(targetMonth).day;
      const day = Math.min(fd.day, maxDay);
      const min = parseDateProp(self.$.min.value as string);
      const max = parseDateProp(self.$.max.value as string);
      newFd = clamp(
        new PlainDate(targetMonth.year, targetMonth.month, day),
        min,
        max,
      );
    }
    batch(() => {
      page.value = newPage;
      focusedDate.value = newFd;
    });
    self.dispatchEvent(
      new CustomEvent("focusday", { bubbles: true, detail: toDate(newFd) }),
    );
  };

  const containsDate = (d: PlainDate) => {
    const diff = diffInMonths(page.value.start, d.toPlainYearMonth());
    return diff >= 0 && diff < (self.$.months.value as number);
  };

  const ctxSignal = signal(buildCtxValue(focusedDate.value, page.value));
  CalendarCtx.provide(self, ctxSignal);

  prevBtn.addEventListener("click", () => updatePage(-getStep()));
  nextBtn.addEventListener("click", () => updatePage(getStep()));

  self.addEventListener("focusday", (e) => {
    const detail = (e as CustomEvent).detail;
    if (!(detail instanceof PlainDate)) return;
    e.stopPropagation();
    focusedDate.value = detail;
    onFocusDay?.(detail);
    self.dispatchEvent(
      new CustomEvent("focusday", { bubbles: true, detail: toDate(detail) }),
    );
    setTimeout(() => (self as unknown as { focus(): void }).focus());
  });

  const registerEffects = () => {
    // Keep context signal in sync with page, focusedDate, and all reactive props
    self.createEffect(() => {
      ctxSignal.value = buildCtxValue(focusedDate.value, page.value);
    });

    // Sync focusedDate from prop when it changes
    self.createEffect(() => {
      const fd = parseDateProp(self.$.focusedDate.value as string);
      if (fd)
        focusedDate.value = clamp(
          fd,
          parseDateProp(self.$.min.value as string),
          parseDateProp(self.$.max.value as string),
        );
    });

    // Clamp focused date to min/max
    self.createEffect(() => {
      const min = parseDateProp(self.$.min.value as string);
      const max = parseDateProp(self.$.max.value as string);
      focusedDate.value = clamp(focusedDate.value, min, max);
    });

    // Sync page when focusedDate moves outside the current page
    self.createEffect(() => {
      const fd = focusedDate.value;
      const months = self.$.months.value as number;
      const snap = page.peek();
      const diff = diffInMonths(snap.start, fd.toPlainYearMonth());
      if (diff >= 0 && diff < months) return;
      if (diff === -1) updatePage(-getStep());
      else if (diff === months) updatePage(getStep());
      else updatePage(Math.floor(diff / months) * months);
    });

    // Update headings and prev/next button states
    self.createEffect(() => {
      const ctx = ctxSignal.value;
      const locale = (self.$.locale.value as string) || undefined;
      const format = makeDateFormatter(formatOptions, locale);
      const formatVerbose = makeDateFormatter(formatVerboseOptions, locale);
      const start = toDate(ctx.page.start);
      const end = toDate(ctx.page.end);
      hiddenHeading.textContent = formatVerbose.formatRange(start, end);
      visibleHeading.textContent = format.formatRange(start, end);
      const min = parseDateProp(self.$.min.value as string);
      const max = parseDateProp(self.$.max.value as string);
      setPrevNext(prevBtn, !min || !containsDate(min));
      setPrevNext(nextBtn, !max || !containsDate(max));
    });
  };

  return { focusedDate, page, containsDate, registerEffects };
}

export class CalendarBaseElement<
  T extends typeof sharedProps = typeof sharedProps,
> extends SignalElement<T> {
  override focus(options?: CalendarFocusOptions) {
    const target = options?.target ?? "day";
    if (target === "day") {
      this.querySelectorAll<HTMLElement>("calendar-month").forEach((m) =>
        m.focus(options),
      );
    } else {
      this.shadowRoot!.querySelector<HTMLButtonElement>(
        `[part~='${target}']`,
      )!.focus(options);
    }
  }
}
