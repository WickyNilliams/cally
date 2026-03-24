import { SignalElement, signal, computed, batch } from "../signal-element.js";
import { CalendarCtx } from "../calendar-month/CalendarMonthContext.js";
import { BASE_STYLES, createBaseTemplate, sharedProps } from "../calendar-base/calendar-base.js";
import {
  createPage,
  diffInMonths,
  type Pagination,
  type CalendarFocusOptions,
} from "../calendar-base/useCalendarBase.js";
import { parseDateProp, parseDateRangeProp, makeDateFormatter } from "../utils/hooks.js";
import { clamp, endOfMonth, getToday, toDate } from "../utils/date.js";
import { PlainDate, PlainYearMonth } from "../utils/temporal.js";
import type { DaysOfWeek } from "../utils/date.js";

const formatOptions = { year: "numeric" } as const;
const formatVerboseOptions = { year: "numeric", month: "long" } as const;

const sort = (a: PlainDate, b: PlainDate): [PlainDate, PlainDate] =>
  PlainDate.compare(a, b) < 0 ? [a, b] : [b, a];

const rangeProps = {
  ...sharedProps,
  tentative: { type: String, value: "" },
} as const;

export class CalendarRange extends SignalElement<typeof rangeProps> {
  static properties = rangeProps;
  static styles = BASE_STYLES;
  static template = createBaseTemplate();

  setup() {
    const root = this.shadowRoot!;
    const hiddenHeading = root.querySelector<HTMLElement>("#h")!;
    const visibleHeading = root.querySelector<HTMLElement>(
      '[part="heading"] [aria-hidden]'
    )!;
    const prevBtn = root.querySelector<HTMLButtonElement>("[part~='previous']")!;
    const nextBtn = root.querySelector<HTMLButtonElement>("[part~='next']")!;

    // Initialize from props if available
    const rangeInit = parseDateRangeProp(this.$.value.value as string);
    const initFd =
      parseDateProp(this.$.focusedDate.value as string) ??
      rangeInit[0] ??
      getToday();

    const focusedDate = signal<PlainDate>(
      clamp(initFd, parseDateProp(this.$.min.value as string), parseDateProp(this.$.max.value as string))
    );
    const page = signal(
      createPage(
        focusedDate.value.toPlainYearMonth(),
        (this.$.months.value as number) || 1,
        (this.$.pageBy.value as Pagination) || "months"
      )
    );
    const hovered = signal<PlainDate | undefined>(undefined);

    // Override focusedDate property to reflect internal signal
    Object.defineProperty(this, "focusedDate", {
      get: () => focusedDate.value.toString(),
      set: (v: string) => { this.$.focusedDate.value = v; },
      enumerable: true,
      configurable: true,
    });

    const getStep = () =>
      (this.$.pageBy.value as Pagination) === "single"
        ? 1
        : (this.$.months.value as number);

    const updatePage = (by: number) => {
      const months = this.$.months.value as number;
      const pageBy = this.$.pageBy.value as Pagination;
      const newPage = createPage(
        page.value.start.add({ months: by }),
        months,
        pageBy
      );
      const fd = focusedDate.value;
      const diff = diffInMonths(newPage.start, fd.toPlainYearMonth());
      let newFd = fd;
      if (diff < 0 || diff >= months) {
        const targetMonth = newPage.start;
        const maxDay = endOfMonth(targetMonth).day;
        const day = Math.min(fd.day, maxDay);
        const min = parseDateProp(this.$.min.value as string);
        const max = parseDateProp(this.$.max.value as string);
        newFd = clamp(new PlainDate(targetMonth.year, targetMonth.month, day), min, max);
      }
      batch(() => {
        page.value = newPage;
        focusedDate.value = newFd;
      });
      this.dispatchEvent(new CustomEvent("focusday", { bubbles: true, detail: toDate(newFd) }));
    };

    const containsDate = (d: PlainDate) => {
      const diff = diffInMonths(page.value.start, d.toPlainYearMonth());
      return diff >= 0 && diff < (this.$.months.value as number);
    };

    const ctxSignal = computed(() => {
      const tentative = parseDateProp((this.$.tentative as any).value as string);
      const rangeValue = parseDateRangeProp(this.$.value.value as string);
      const effectiveValue = tentative
        ? sort(tentative, hovered.value ?? tentative)
        : rangeValue;
      return buildContext(this, focusedDate.value, page.value, effectiveValue);
    });
    CalendarCtx.provide(this, ctxSignal);

    prevBtn.addEventListener("click", () => updatePage(-getStep()));
    nextBtn.addEventListener("click", () => updatePage(getStep()));

    this.addEventListener("selectday", (e) => {
      const date = (e as CustomEvent<PlainDate>).detail;
      e.stopPropagation();
      const tentative = parseDateProp((this.$.tentative as any).value as string);
      if (!tentative) {
        (this.$ as any).tentative.value = date.toString();
        hovered.value = undefined;
        this.dispatchEvent(
          new CustomEvent("rangestart", { bubbles: true, detail: toDate(date) })
        );
      } else {
        const [start, end] = sort(tentative, date);
        batch(() => {
          this.$.value.value = `${start}/${end}`;
          (this.$ as any).tentative.value = "";
          hovered.value = undefined;
        });
        this.dispatchEvent(
          new CustomEvent("rangeend", { bubbles: true, detail: toDate(date) })
        );
        this.dispatchEvent(new Event("change", { bubbles: true }));
      }
    });

    this.addEventListener("focusday", (e) => {
      const detail = (e as CustomEvent).detail;
      if (!(detail instanceof PlainDate)) return;
      e.stopPropagation();
      focusedDate.value = detail;
      const tentative = parseDateProp((this.$.tentative as any).value as string);
      if (tentative) hovered.value = detail;
      this.dispatchEvent(
        new CustomEvent("focusday", { bubbles: true, detail: toDate(detail) })
      );
      setTimeout(() => this.focus());
    });

    this.addEventListener("hoverday", (e) => {
      e.stopPropagation();
      const tentative = parseDateProp((this.$.tentative as any).value as string);
      if (tentative) {
        hovered.value = (e as CustomEvent<PlainDate>).detail;
      }
    });

    return () => {
      this.createEffect(() => {
        const fd = parseDateProp(this.$.focusedDate.value as string);
        if (fd) focusedDate.value = clamp(fd, parseDateProp(this.$.min.value as string), parseDateProp(this.$.max.value as string));
      });

      this.createEffect(() => {
        const min = parseDateProp(this.$.min.value as string);
        const max = parseDateProp(this.$.max.value as string);
        focusedDate.value = clamp(focusedDate.value, min, max);
      });

      // Reset hovered when tentative changes
      this.createEffect(() => {
        void (this.$ as any).tentative.value;
        hovered.value = undefined;
      });

      this.createEffect(() => {
        const fd = focusedDate.value;
        const months = this.$.months.value as number;

        const snap = page.peek();
        const diff = diffInMonths(snap.start, fd.toPlainYearMonth());
        if (diff >= 0 && diff < months) return;
        if (diff === -1) updatePage(-getStep());
        else if (diff === months) updatePage(getStep());
        else updatePage(Math.floor(diff / months) * months);
      });

      this.createEffect(() => {
        const ctx = ctxSignal.value;
        const locale = (this.$.locale.value as string) || undefined;
        const format = makeDateFormatter(formatOptions, locale);
        const formatVerbose = makeDateFormatter(formatVerboseOptions, locale);
        const start = toDate(ctx.page.start);
        const end = toDate(ctx.page.end);

        hiddenHeading.textContent = formatVerbose.formatRange(start, end);
        visibleHeading.textContent = format.formatRange(start, end);

        const min = parseDateProp(this.$.min.value as string);
        const max = parseDateProp(this.$.max.value as string);
        setPrevNext(prevBtn, !min || !containsDate(min));
        setPrevNext(nextBtn, !max || !containsDate(max));
      });
    };
  }

  override focus(options?: CalendarFocusOptions) {
    const target = options?.target ?? "day";
    if (target === "day") {
      this.querySelectorAll<HTMLElement>("calendar-month").forEach((m) =>
        m.focus(options)
      );
    } else {
      this.shadowRoot!
        .querySelector<HTMLButtonElement>(`[part~='${target}']`)!
        .focus(options);
    }
  }
}

customElements.define("calendar-range", CalendarRange);

function setPrevNext(btn: HTMLButtonElement, enabled: boolean) {
  const name = btn.part.contains("previous") ? "previous" : "next";
  btn.setAttribute("part", `button ${name}${enabled ? "" : " disabled"}`);
  btn.setAttribute("aria-disabled", enabled ? "false" : "true");
}

function buildContext(
  host: CalendarRange,
  focusedDate: PlainDate,
  page: { start: PlainYearMonth; end: PlainYearMonth },
  value: [PlainDate, PlainDate] | []
) {
  return {
    type: "range" as const,
    value,
    min: parseDateProp(host.$.min.value as string),
    max: parseDateProp(host.$.max.value as string),
    today: parseDateProp(host.$.today.value as string),
    firstDayOfWeek: host.$.firstDayOfWeek.value as DaysOfWeek,
    isDateDisallowed: host.$.isDateDisallowed.value as ((d: Date) => boolean) | undefined,
    getDayParts: host.$.getDayParts.value as ((d: Date) => string) | undefined,
    formatWeekday: ((host.$.formatWeekday.value as string) || "narrow") as "narrow" | "short",
    showOutsideDays: host.$.showOutsideDays.value as boolean,
    showWeekNumbers: host.$.showWeekNumbers.value as boolean,
    locale: (host.$.locale.value as string) || undefined,
    focusedDate,
    page,
  };
}
