import { reset, vh } from "../utils/styles.js";
import { signal, batch, fire, SignalElement } from "../signal-element.js";
import { CalendarCtx, type CalendarContextValue, type CalendarContextBase } from "../calendar-month/CalendarMonthContext.js";
import { createPage, diffInMonths, type Pagination, type CalendarFocusOptions } from "./useCalendarBase.js";
import { parseDateProp, makeDateFormatter } from "../utils/hooks.js";
import { clamp, endOfMonth, getToday, toDate, type DaysOfWeek } from "../utils/date.js";
import { PlainDate, PlainYearMonth } from "../utils/temporal.js";

export const BASE_STYLES = `${reset}${vh}:host{display:block;width:fit-content}[part=container]{display:flex;flex-direction:column;gap:1em}[part=header]{display:flex;align-items:center;justify-content:space-between}[part=heading]{font-weight:bold;font-size:1.25em}[part~=button]{display:flex;align-items:center;justify-content:center}[part~=button][part~=disabled]{cursor:default;opacity:.5}`;

export const BASE_TEMPLATE = `<div class=vh id=h aria-live=polite aria-atomic=true></div><div role=group aria-labelledby=h part=container><div part=header><button part="button previous"><slot name=previous>Previous</slot></button><slot part=heading name=heading><div aria-hidden=true></div></slot><button part="button next"><slot name=next>Next</slot></button></div><slot part=months></slot></div>`;

// Shared property definitions (mirrors the old `props` export shape for reference)
export const sharedProps = {
  value: { type: String },
  min: { type: String },
  max: { type: String },
  today: { type: String },
  isDateDisallowed: { type: Function },
  formatWeekday: { type: String },
  getDayParts: { type: Function },
  firstDayOfWeek: { type: Number, value: 1 },
  showOutsideDays: { type: Boolean },
  locale: { type: String },
  months: { type: Number, value: 1 },
  focusedDate: { type: String },
  pageBy: { type: String },
  showWeekNumbers: { type: Boolean },
} as const;

type PageType = { start: PlainYearMonth; end: PlainYearMonth };

/**
 * Builds the shared context fields common to all three calendar types.
 * Each component's buildCtxValue callback spreads this and adds `type` + `value`.
 */
export function buildSharedCtx<P extends typeof sharedProps>(
  self: SignalElement<P>,
  focusedDate: PlainDate,
  page: PageType
): CalendarContextBase {
  return {
    min: parseDateProp(self.$.min.value as string),
    max: parseDateProp(self.$.max.value as string),
    today: parseDateProp(self.$.today.value as string),
    firstDayOfWeek: self.$.firstDayOfWeek.value as DaysOfWeek,
    isDateDisallowed: self.$.isDateDisallowed.value as ((d: Date) => boolean) | undefined,
    getDayParts: self.$.getDayParts.value as ((d: Date) => string) | undefined,
    formatWeekday: ((self.$.formatWeekday.value as string) || "narrow") as "narrow" | "short",
    showOutsideDays: self.$.showOutsideDays.value as boolean,
    showWeekNumbers: self.$.showWeekNumbers.value as boolean,
    locale: (self.$.locale.value as string) || undefined,
    focusedDate,
    page,
  };
}

export function setPrevNext(btn: HTMLButtonElement, enabled: boolean) {
  btn.part.toggle("disabled", !enabled);
  btn.ariaDisabled = ""+!enabled;
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
  onFocusDay?: (date: PlainDate) => void
): () => void {
  const root = self.shadowRoot!;
  const hiddenHeading = root.children[1] as HTMLElement;
  const visibleHeading = root.querySelector<HTMLElement>("[aria-hidden]")!;
  const [prevBtn, nextBtn] = root.querySelectorAll<HTMLButtonElement>("button");

  const clampToSelf = (d: PlainDate) =>
    clamp(d, parseDateProp(self.$.min.value as string), parseDateProp(self.$.max.value as string));

  const focusedDate = signal<PlainDate>(clampToSelf(initFd));
  const page = signal<PageType>(
    createPage(
      focusedDate.value.toPlainYearMonth(),
      (self.$.months.value as number) || 1,
      (self.$.pageBy.value as Pagination) || "months"
    )
  );

  Object.defineProperty(self, "focusedDate", {
    get: () => focusedDate.value.toString(),
    set: (v: string) => { (self.$.focusedDate as unknown as { value: string }).value = v; },
  });

  const getStep = () =>
    (self.$.pageBy.value as Pagination) === "single" ? 1 : (self.$.months.value as number);

  const updatePage = (by: number) => {
    const months = self.$.months.value as number;
    const pageBy = self.$.pageBy.value as Pagination;
    const newPage = createPage(page.value.start.add({ months: by }), months, pageBy);
    const fd = focusedDate.value;
    const diff = diffInMonths(newPage.start, fd.toPlainYearMonth());
    let newFd = fd;
    if (diff < 0 || diff >= months) {
      const targetMonth = newPage.start;
      const day = Math.min(fd.day, endOfMonth(targetMonth).day);
      newFd = clampToSelf(new PlainDate(targetMonth.year, targetMonth.month, day));
    }
    batch(() => {
      page.value = newPage;
      focusedDate.value = newFd;
    });
    fire(self, "focusday", toDate(newFd));
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
    if (!detail?.day) return;
    e.stopPropagation();
    focusedDate.value = detail;
    onFocusDay?.(detail);
    fire(self, "focusday", toDate(detail));
    setTimeout(() => (self as unknown as { focus(): void }).focus());
  });

  const registerEffects = () => {
    // Keep context signal in sync and update headings/prev/next
    self.fx(() => {
      const ctx = buildCtxValue(focusedDate.value, page.value);
      ctxSignal.value = ctx;
      const format = makeDateFormatter({ year: "numeric" }, ctx.locale);
      const formatVerbose = makeDateFormatter({ year: "numeric", month: "long" }, ctx.locale);
      const start = toDate(ctx.page.start);
      const end = toDate(ctx.page.end);
      hiddenHeading.textContent = formatVerbose.formatRange(start, end);
      visibleHeading.textContent = format.formatRange(start, end);
      setPrevNext(prevBtn, !ctx.min || !containsDate(ctx.min));
      setPrevNext(nextBtn, !ctx.max || !containsDate(ctx.max));
    });

    // Sync focusedDate from prop and clamp to min/max
    self.fx(() => {
      focusedDate.value = clampToSelf(parseDateProp(self.$.focusedDate.value as string) ?? focusedDate.value);
    });

    // Sync page when focusedDate moves outside the current page
    self.fx(() => {
      const fd = focusedDate.value;
      const months = self.$.months.value as number;
      const snap = page.peek();
      const diff = diffInMonths(snap.start, fd.toPlainYearMonth());
      if (diff >= 0 && diff < months) return;
      updatePage(diff === -1 ? -getStep() : diff === months ? getStep() : Math.floor(diff / months) * months);
    });

  };

  return registerEffects;
}

export class CalendarBaseElement<
  T extends typeof sharedProps = typeof sharedProps,
> extends SignalElement<T> {
  override focus(options?: CalendarFocusOptions) {
    const target = options?.target ?? "day";
    if (target === "day") {
      this.querySelectorAll<HTMLElement>("calendar-month").forEach((m) => m.focus(options));
    } else {
      this.shadowRoot!.querySelector<HTMLButtonElement>(`[part~='${target}']`)!.focus(options);
    }
  }
}
