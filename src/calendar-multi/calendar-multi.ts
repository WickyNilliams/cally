import { SignalElement, batch } from "../signal-element.js";
import { BASE_STYLES, createBaseTemplate, sharedProps, setupCalendarBase, buildSharedCtx } from "../calendar-base/calendar-base.js";
import { parseDateProp, parseDateMultiProp } from "../utils/hooks.js";
import { getToday } from "../utils/date.js";
import { PlainDate } from "../utils/temporal.js";
import type { CalendarFocusOptions } from "../calendar-base/useCalendarBase.js";

export class CalendarMulti extends SignalElement<typeof sharedProps> {
  static properties = sharedProps;
  static styles = BASE_STYLES;
  static template = createBaseTemplate();

  setup() {
    const initFd =
      parseDateProp(this.$.focusedDate.value as string) ??
      parseDateMultiProp(this.$.value.value as string)[0] ??
      getToday();

    const { registerEffects } = setupCalendarBase(
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
      const idx = multi.findIndex((d) => d.equals(date));
      const newValues = [...multi];
      if (idx < 0) newValues.push(date);
      else newValues.splice(idx, 1);
      batch(() => { this.$.value.value = newValues.join(" "); });
      this.dispatchEvent(new Event("change", { bubbles: true }));
    });

    return registerEffects;
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

customElements.define("calendar-multi", CalendarMulti);
