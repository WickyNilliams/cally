import { SignalElement, signal, batch } from "../signal-element.js";
import { BASE_STYLES, createBaseTemplate, sharedProps, setupCalendarBase, buildSharedCtx } from "../calendar-base/calendar-base.js";
import { parseDateProp, parseDateRangeProp } from "../utils/hooks.js";
import { getToday, toDate } from "../utils/date.js";
import { PlainDate } from "../utils/temporal.js";
import type { CalendarFocusOptions } from "../calendar-base/useCalendarBase.js";

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
    const rangeInit = parseDateRangeProp(this.$.value.value as string);
    const initFd =
      parseDateProp(this.$.focusedDate.value as string) ??
      rangeInit[0] ??
      getToday();

    const hovered = signal<PlainDate | undefined>(undefined);
    const getTentative = () => parseDateProp((this.$ as any).tentative.value as string);

    const { registerEffects } = setupCalendarBase(
      this,
      initFd,
      (fd, page) => {
        const tentative = getTentative();
        const effectiveValue = tentative
          ? sort(tentative, hovered.value ?? tentative)
          : parseDateRangeProp(this.$.value.value as string);
        return {
          type: "range" as const,
          value: effectiveValue,
          ...buildSharedCtx(this, fd, page),
        };
      },
      (date) => {
        if (getTentative()) hovered.value = date;
      }
    );

    this.addEventListener("selectday", (e) => {
      const date = (e as CustomEvent<PlainDate>).detail;
      e.stopPropagation();
      const tentative = getTentative();
      if (!tentative) {
        (this.$ as any).tentative.value = date.toString();
        hovered.value = undefined;
        this.dispatchEvent(new CustomEvent("rangestart", { bubbles: true, detail: toDate(date) }));
      } else {
        const [start, end] = sort(tentative, date);
        batch(() => {
          this.$.value.value = `${start}/${end}`;
          (this.$ as any).tentative.value = "";
          hovered.value = undefined;
        });
        this.dispatchEvent(new CustomEvent("rangeend", { bubbles: true, detail: toDate(date) }));
        this.dispatchEvent(new Event("change", { bubbles: true }));
      }
    });

    this.addEventListener("hoverday", (e) => {
      e.stopPropagation();
      if (getTentative()) hovered.value = (e as CustomEvent<PlainDate>).detail;
    });

    return () => {
      registerEffects();
      // Reset hovered when tentative is cleared
      this.createEffect(() => {
        void (this.$ as any).tentative.value;
        hovered.value = undefined;
      });
    };
  }

  override focus(options?: CalendarFocusOptions) {
    const target = options?.target ?? "day";
    if (target === "day") {
      this.querySelectorAll<HTMLElement>("calendar-month").forEach((m) => m.focus(options));
    } else {
      this.shadowRoot!.querySelector<HTMLButtonElement>(`[part~='${target}']`)!.focus(options);
    }
  }
}

customElements.define("calendar-range", CalendarRange);
