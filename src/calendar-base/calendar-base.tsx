import { css } from "atomico";
import { CalendarMonthContext } from "../calendar-month/CalendarMonthContext.js";
import { reset } from "../utils/styles.js";
import type { DaysOfWeek } from "../utils/utils.js";
import type { PlainDate } from "../utils/temporal.js";
import type { DateWindow } from "../utils/DateWindow.js";

type CalendarBaseProps = {
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
};

interface CalendarRangeProps extends CalendarBaseProps {
  highlightedRange: { start?: PlainDate; end?: PlainDate };
}

interface CalendarDateProps extends CalendarBaseProps {
  value?: PlainDate;
}

export function CalendarBase(props: CalendarDateProps | CalendarRangeProps) {
  return (
    <>
      <div class="header">
        <button
          part={`button previous ${props.previous ? "" : "disabled"}`}
          onclick={props.previous}
          aria-disabled={props.previous ? null : "true"}
        >
          <slot name="button-previous">Previous</slot>
        </button>

        <h2 part="heading" aria-live="polite" aria-atomic="true">
          {props.formatter.formatRange(
            props.dateWindow.start.toDate(),
            props.dateWindow.end.toDate()
          )}
        </h2>

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
    </>
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
    value: (): DaysOfWeek => 0,
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
      display: flex;
      flex-direction: column;
      gap: 1em;
    }

    .header {
      display: flex;
      align-items: center;
      justify-content: space-between;
    }

    h2 {
      margin: 0;
      font-size: 1.25em;
      text-align: center;
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
