import { Base } from "../utils/base.js";
import {
  CalendarContext,
  type CalendarContextValue,
  type DayEvents,
} from "../calendar-month/CalendarMonthContext.js";
import reset from "../utils/reset.css?inline";

export const selectTemplate = (label: string) => (
  <>
    <label part="label" for="s">
      <slot name="label">{label}</slot>
    </label>
    <select id="s" part="select" />
  </>
);

export interface Option {
  label: string;
  value: string;
  disabled?: boolean;
}

/**
 * A select for changing one part of the date focused by a calendar
 */
export abstract class SelectBase<Props> extends Base<
  Props,
  {},
  Pick<DayEvents, "focusday">
> {
  static styles = reset;

  /** The part of the focused date which is chosen with the select */
  protected abstract unit: "month" | "year";

  /** The options to show, given the calendar's context */
  protected abstract getOptions(context: CalendarContextValue): Option[];

  constructor() {
    super();
    const context = this.consume(CalendarContext);
    const select = this.query<HTMLSelectElement>("select");
    const { options } = select;

    this.effect(() => {
      const items = this.getOptions(context.value);

      // the number of options can vary, so top up or trim as necessary
      while (options.length < items.length) {
        const option = document.createElement("option");
        option.setAttribute("part", "option");
        select.append(option);
      }
      while (options.length > items.length) {
        select.lastChild!.remove();
      }

      // each has the same properties as an <option>
      items.forEach((item, i) => Object.assign(options[i]!, item));

      select.value = `${context.value.focusedDate.value[this.unit]}`;
    });

    select.addEventListener("change", () => {
      const { unit } = this;
      const focused = context.value.focusedDate.value;
      const diff = +select.value - focused[unit];

      // e.g. { months: 3 }
      this.emit("focusday", focused.add({ [`${unit}s`]: diff } as never), true);
    });
  }
}
