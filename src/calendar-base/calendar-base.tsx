import { css, type Host } from "atomico";
import { CalendarMonthContext } from "../calendar-month/CalendarMonthContext.js";
import { reset } from "../utils/styles.js";
import type { DaysOfWeek } from "../utils/date.js";
import type { PlainDate } from "../utils/temporal.js";
import type { DateWindow } from "../utils/DateWindow.js";

interface CalendarBaseProps {
  firstDayOfWeek: DaysOfWeek;
  showOutsideDays: boolean;
  dateWindow: DateWindow;
  locale: string | undefined;
  formatter: Intl.DateTimeFormat;
  isDateDisallowed: (date: Date) => boolean;
  previous?: () => void;
  next?: () => void;
  onSelect: (e: CustomEvent<PlainDate>) => void;
  onFocus: (e: CustomEvent<PlainDate>) => void;
  onHover?: (e: CustomEvent<PlainDate>) => void;
}

interface CalendarRangeProps extends CalendarBaseProps {
  highlightedRange?: [PlainDate, PlainDate];
}

interface CalendarDateProps extends CalendarBaseProps {
  value?: PlainDate;
}

export function CalendarBase(props: CalendarDateProps | CalendarRangeProps) {
  return (
    <div role="group" aria-labelledby="heading" part="container">
      <div class="header" part="header">
        <button
          part={`button previous ${props.previous ? "" : "disabled"}`}
          onclick={props.previous}
          aria-disabled={props.previous ? null : "true"}
        >
          <slot name="button-previous">Previous</slot>
        </button>

        <div id="heading" part="heading" aria-live="polite" aria-atomic="true">
          {props.formatter.formatRange(
            props.dateWindow.start.toDate(),
            props.dateWindow.end.toDate()
          )}
        </div>

        <button
          part={`button next ${props.next ? "" : "disabled"}`}
          onclick={props.next}
          aria-disabled={props.next ? null : "true"}
        >
          <slot name="button-next">Next</slot>
        </button>
      </div>

      <CalendarMonthContext
        value={props}
        onselectday={props.onSelect}
        onfocusday={props.onFocus}
        onhoverday={props.onHover}
      >
        <slot></slot>
      </CalendarMonthContext>
    </div>
  );
}

export const props = {
  value: {
    type: String,
    value: "",
  },
  min: {
    type: String,
    value: "",
  },
  max: {
    type: String,
    value: "",
  },
  isDateDisallowed: {
    type: Function,
    value: (date: Date) => false,
  },
  firstDayOfWeek: {
    type: Number,
    value: (): DaysOfWeek => 1,
  },
  showOutsideDays: {
    type: Boolean,
    value: (): boolean => false,
  },
  locale: {
    type: String,
    value: (): string | undefined => undefined,
  },
  months: {
    type: Number,
    value: 1,
  },
};

export const styles = [
  reset,
  css`
    :host {
      display: block;
      inline-size: fit-content;
    }

    [role="group"] {
      display: flex;
      flex-direction: column;
      gap: 1em;
    }

    .header {
      display: flex;
      align-items: center;
      justify-content: space-between;
    }

    #heading {
      font-weight: bold;
      font-size: 1.25em;
    }

    button {
      cursor: pointer;
      user-select: none;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    button[aria-disabled] {
      cursor: default;
      opacity: 0.4;
    }
  `,
];
