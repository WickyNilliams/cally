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

export abstract class SelectBase extends BaseElement {
  static styles_ = [reset, vh];

  #select: HTMLSelectElement;
  protected context_: () => CalendarContextValue;

  protected abstract getOptions_(
    context: CalendarContextValue,
  ): MonthOption[] | YearOption[];

  protected abstract onChange_(value: number): void;

  constructor() {
    super();

    this.context_ = consumeContext(this, CalendarContext);

    this.#select = this.shadowRoot!.querySelector("select")!;
    this.#select.addEventListener("change", () => {
      this.onChange_(parseInt(this.#select.value));
    });

    this.onConnect_(() =>
      effect(() => {
        this.#select.replaceChildren(
          ...this.getOptions_(this.context_()).map((option) => {
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

  protected focusDay_(date: PlainDate) {
    this.emit_("focusday", date, { bubbles: true });
  }
}
