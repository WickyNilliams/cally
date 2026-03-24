import { batch } from "../signal-element.js";
import { BASE_STYLES, createBaseTemplate, sharedProps, setupCalendarBase, buildSharedCtx, CalendarBaseElement } from "../calendar-base/calendar-base.js";
import { parseDateProp } from "../utils/hooks.js";
import { getToday } from "../utils/date.js";
import { PlainDate } from "../utils/temporal.js";

export class CalendarDate extends CalendarBaseElement {
  static properties = sharedProps;
  static styles = BASE_STYLES;
  static template = createBaseTemplate();

  setup() {
    const initFd =
      parseDateProp(this.$.focusedDate.value as string) ??
      parseDateProp(this.$.value.value as string) ??
      getToday();

    const { registerEffects } = setupCalendarBase(
      this,
      initFd,
      (fd, page) => ({
        type: "date" as const,
        value: parseDateProp(this.$.value.value as string),
        ...buildSharedCtx(this, fd, page),
      })
    );

    this.addEventListener("selectday", (e) => {
      const date = (e as CustomEvent<PlainDate>).detail;
      e.stopPropagation();
      batch(() => { this.$.value.value = date.toString(); });
      this.dispatchEvent(new Event("change", { bubbles: true }));
    });

    return registerEffects;
  }
}

customElements.define("calendar-date", CalendarDate);
