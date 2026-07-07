import { BaseElement, template } from "../core/element.js";
import { effect } from "../core/signals.js";
import { consumeContext } from "../core/context.js";
import {
  CalendarContext,
  type CalendarContextValue,
} from "../calendar-month/CalendarMonthContext.js";
import { reset, vh } from "../utils/styles.js";
import type { PlainDate } from "../utils/temporal.js";

export type MonthOption = {
  label: string;
  value: string;
  disabled: boolean;
  selected: boolean;
};

export type YearOption = {
  label: string;
  value: string;
  selected: boolean;
};

export const selectTemplate = (label: string) =>
  template(
    `<label part="label" for="s"><slot name="label">${label}</slot></label>` +
      `<select id="s" part="select"></select>`,
  );

export abstract class SelectBase extends BaseElement {
  static styles = [reset, vh];

  #select: HTMLSelectElement;
  protected context: () => CalendarContextValue;

  protected abstract getOptions(
    context: CalendarContextValue,
  ): MonthOption[] | YearOption[];

  protected abstract onChange(value: number): void;

  constructor() {
    super();

    this.context = consumeContext(this, CalendarContext);

    this.#select = this.shadowRoot!.querySelector("select")!;
    this.#select.addEventListener("change", () => {
      this.onChange(parseInt(this.#select.value));
    });

    this.onConnect(() =>
      effect(() => {
        this.#select.replaceChildren(
          ...this.getOptions(this.context()).map((option) => {
            const el = document.createElement("option");
            el.setAttribute("part", "option");
            el.label = option.label;
            el.value = option.value;
            el.selected = option.selected;
            if ("disabled" in option) el.disabled = option.disabled;
            return el;
          }),
        );
      }),
    );
  }

  protected focusDay(date: PlainDate) {
    this.emit("focusday", date, { bubbles: true });
  }
}
