import { reset, vh } from "../utils/styles.js";
import type { DaysOfWeek } from "../utils/date.js";
import type { Pagination } from "./useCalendarBase.js";

export const BASE_STYLES = `
  ${reset}
  ${vh}

  :host {
    display: block;
    inline-size: fit-content;
  }

  [part~="container"] {
    display: flex;
    flex-direction: column;
    gap: 1em;
  }

  [part~="header"] {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  [part~="heading"] {
    font-weight: bold;
    font-size: 1.25em;
  }

  [part~="button"] {
    display: flex;
    align-items: center;
    justify-content: center;
  }

  [part~="button"][part~="disabled"] {
    cursor: default;
    opacity: 0.5;
  }
`;

export function createBaseTemplate(): string {
  return `
    <div class="vh" id="h" aria-live="polite" aria-atomic="true"></div>
    <div role="group" aria-labelledby="h" part="container">
      <div part="header">
        <button part="button previous">
          <slot name="previous">Previous</slot>
        </button>
        <slot part="heading" name="heading">
          <div aria-hidden="true"></div>
        </slot>
        <button part="button next">
          <slot name="next">Next</slot>
        </button>
      </div>
      <slot part="months"></slot>
    </div>
  `;
}

// Shared property definitions (mirrors the old `props` export shape for reference)
export const sharedProps = {
  value: { type: String, value: "" },
  min: { type: String, value: "" },
  max: { type: String, value: "" },
  today: { type: String, value: "" },
  isDateDisallowed: { type: Function, value: (_date: Date) => false },
  formatWeekday: { type: String, value: (): "narrow" | "short" => "narrow" },
  getDayParts: { type: Function, value: (_date: Date): string => "" },
  firstDayOfWeek: { type: Number, value: (): DaysOfWeek => 1 },
  showOutsideDays: { type: Boolean, value: false },
  locale: { type: String, value: (): string | undefined => undefined },
  months: { type: Number, value: 1 },
  focusedDate: { type: String, value: (): string | undefined => undefined },
  pageBy: { type: String, value: (): Pagination => "months" },
  showWeekNumbers: { type: Boolean, value: false },
} as const;
