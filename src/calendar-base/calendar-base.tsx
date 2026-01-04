import { css } from "atomico";
import {
  CalendarContext,
  type CalendarDateContext,
  type CalendarMultiContext,
  type CalendarRangeContext,
} from "../calendar-month/CalendarMonthContext.js";
import { CalendarHeadingContext } from "../calendar-heading/CalendarHeadingContext.js";
import { reset, vh } from "../utils/styles.js";
import { toDate, type DaysOfWeek } from "../utils/date.js";
import type { PlainDate } from "../utils/temporal.js";
import type { Pagination } from "./useCalendarBase.js";

interface CalendarBaseProps {
  format: Intl.DateTimeFormat;
  formatVerbose: Intl.DateTimeFormat;
  pageBy: Pagination;
  previous?: () => void;
  next?: () => void;
  onSelect: (e: CustomEvent<PlainDate>) => void;
  onFocus: (e: CustomEvent<PlainDate>) => void;
  onHover?: (e: CustomEvent<PlainDate>) => void;
}

interface CalendarRangeProps extends CalendarBaseProps, CalendarRangeContext {}
interface CalendarDateProps extends CalendarBaseProps, CalendarDateContext {}
interface CalendarMultiProps extends CalendarBaseProps, CalendarMultiContext {}

function Button(props: {
  name: string;
  onclick: (() => void) | undefined;
  children?: unknown;
}) {
  return (
    <button
      part={`button ${props.name} ${!props.onclick ? "disabled" : ""}`}
      onclick={props.onclick}
      aria-disabled={!props.onclick ? "true" : null}
    >
      <slot name={props.name}>{props.children}</slot>
    </button>
  );
}

export function CalendarBase(
  props: CalendarDateProps | CalendarRangeProps | CalendarMultiProps
) {
  const start = toDate(props.page.start);
  const end = toDate(props.page.end);

  return (
    <CalendarContext
      value={props}
      onselectday={props.onSelect}
      onfocusday={props.onFocus}
      onhoverday={props.onHover}
    >
      <CalendarHeadingContext
        value={{
          type: "range",
          value: [start, end],
          locale: props.locale,
        }}
      >
        <div role="group" aria-labelledby="h" part="container">
          <div id="h" class="vh" aria-live="polite" aria-atomic="true">
            {props.formatVerbose.formatRange(start, end)}
          </div>

          <div part="header">
            <Button name="previous" onclick={props.previous}>
              Previous
            </Button>

            <slot part="heading" name="heading">
              <calendar-heading year="numeric" aria-hidden="true" />
            </slot>

            <Button name="next" onclick={props.next}>
              Next
            </Button>
          </div>

          <slot part="months"></slot>
        </div>
      </CalendarHeadingContext>
    </CalendarContext>
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
  today: {
    type: String,
    value: "",
  },
  isDateDisallowed: {
    type: Function,
    value: (date: Date) => false,
  },
  formatWeekday: {
    type: String,
    value: (): "narrow" | "short" => "narrow",
  },
  getDayParts: {
    type: Function,
    value: (date: Date): string => "",
  },
  firstDayOfWeek: {
    type: Number,
    value: (): DaysOfWeek => 1,
  },
  showOutsideDays: {
    type: Boolean,
    value: false,
  },
  locale: {
    type: String,
    value: (): string | undefined => undefined,
  },
  months: {
    type: Number,
    value: 1,
  },
  focusedDate: {
    type: String,
    value: (): string | undefined => undefined,
  },
  pageBy: {
    type: String,
    value: (): Pagination => "months",
  },
  showWeekNumbers: {
    type: Boolean,
    value: false,
  },
};

export const styles = [
  reset,
  vh,
  css`
    :host {
      display: block;
      inline-size: fit-content;
    }

    :host::part(container) {
      display: flex;
      flex-direction: column;
      gap: 1em;
    }

    :host::part(header) {
      display: flex;
      align-items: center;
      justify-content: space-between;
    }

    :host::part(heading) {
      font-weight: bold;
      font-size: 1.25em;
    }

    :host::part(button) {
      display: flex;
      align-items: center;
      justify-content: center;
    }

    :host::part(button disabled) {
      cursor: default;
      opacity: 0.5;
    }
  `,
];
