import { Base, css, template } from "../utils/base.js";
import type { PlainDate } from "../utils/temporal.js";
import {
  CalendarContext,
  type DayEvents,
} from "../calendar-month/CalendarMonthContext.js";
import reset from "../utils/reset.css?inline";

export const option = <option part="option" />;

export const selectTemplate = (label: string, options = "") =>
  template(
    <>
      <label part="label" for="s">
        <slot name="label">{label}</slot>
      </label>
      <select id="s" part="select">
        {options}
      </select>
    </>,
  );

export abstract class SelectBase<Props> extends Base<
  Props,
  Pick<DayEvents, "focusday">
> {
  static styles = css(reset);

  protected context = this.consume(CalendarContext);
  protected select = this.query<HTMLSelectElement>("select");

  /** Given the chosen value, returns the date that should be focused */
  protected abstract getDate(value: number, focusedDate: PlainDate): PlainDate;

  constructor() {
    super();

    this.select.addEventListener("change", () => {
      const date = this.getDate(
        parseInt(this.select.value),
        this.context.value.focusedDate.value,
      );

      this.emit("focusday", date, true);
    });
  }
}
