import { signal, batch, fire } from "../signal-element.js";
import { BASE_STYLES, BASE_TEMPLATE, sharedProps, setupCalendarBase, buildSharedCtx, CalendarBaseElement } from "../calendar-base/calendar-base.js";
import { parseDateProp, parseDateRangeProp } from "../utils/hooks.js";
import { getToday, toDate } from "../utils/date.js";
import { PlainDate } from "../utils/temporal.js";

const sort = (a: PlainDate, b: PlainDate): [PlainDate, PlainDate] =>
  ""+a < ""+b ? [a, b] : [b, a];

const rangeProps = {
  ...sharedProps,
  tentative: { type: String },
} as const;

export class CalendarRange extends CalendarBaseElement<typeof rangeProps> {
  static properties = rangeProps;
  static styles = BASE_STYLES;
  static template = BASE_TEMPLATE;

  setup() {
    const rangeInit = parseDateRangeProp(this.$.value.value as string);
    const initFd =
      parseDateProp(this.$.focusedDate.value as string) ??
      rangeInit[0] ??
      getToday();

    const hovered = signal<PlainDate | undefined>(undefined);
    const getTentative = () => parseDateProp((this.$ as any).tentative.value as string);

    const registerEffects = setupCalendarBase(
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
        fire(this, "rangestart", toDate(date));
      } else {
        const [start, end] = sort(tentative, date);
        batch(() => {
          this.$.value.value = `${start}/${end}`;
          (this.$ as any).tentative.value = "";
          hovered.value = undefined;
        });
        fire(this, "rangeend", toDate(date));
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
      this.fx(() => {
        void (this.$ as any).tentative.value;
        hovered.value = undefined;
      });
    };
  }

}

customElements.define("calendar-range", CalendarRange);
