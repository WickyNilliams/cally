import { createContext } from "atomico";
import { PlainYearMonth } from "../utils/temporal.js";

export interface HeadingRangeContext {
  type: "range";
  value: { start: PlainYearMonth; end: PlainYearMonth };
  locale?: string;
}

export interface HeadingDateContext {
  type: "date";
  value: PlainYearMonth;
  locale?: string;
}

export type HeadingContextValue = HeadingRangeContext | HeadingDateContext;

const now = new Date();

export const CalendarHeadingContext = createContext<HeadingContextValue>({
  type: "date",
  value: new PlainYearMonth(now.getUTCFullYear(), now.getUTCMonth() + 1),
});

customElements.define("calendar-heading-ctx", CalendarHeadingContext);
