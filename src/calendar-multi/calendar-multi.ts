import { BASE_STYLES, BASE_TEMPLATE, sharedProps, setupCalendarBase, buildSharedCtx, CalendarBaseElement } from "../calendar-base/calendar-base.js";
import { parseDateProp, parseDateMultiProp } from "../utils/hooks.js";
import { getToday } from "../utils/date.js";
import { PlainDate } from "../utils/temporal.js";

export class CalendarMulti extends CalendarBaseElement {
  static properties = sharedProps;
  static styles = BASE_STYLES;
  static template = BASE_TEMPLATE;

  setup() {
    const initFd =
      parseDateProp(this.$.focusedDate.value as string) ??
      parseDateMultiProp(this.$.value.value as string)[0] ??
      getToday();

    const registerEffects = setupCalendarBase(
      this,
      initFd,
      (fd, page) => ({
        type: "multi" as const,
        value: parseDateMultiProp(this.$.value.value as string),
        ...buildSharedCtx(this, fd, page),
      })
    );

    this.addEventListener("selectday", (e) => {
      const date = (e as CustomEvent<PlainDate>).detail;
      e.stopPropagation();
      const multi = parseDateMultiProp(this.$.value.value as string);
      const toggled = multi.filter((d) => ""+d !== ""+date);
      if (toggled.length === multi.length) toggled.push(date);
      this.$.value.value = toggled.join(" ");
      this.dispatchEvent(new Event("change", { bubbles: true }));
    });

    return registerEffects;
  }
}

customElements.define("calendar-multi", CalendarMulti);
