import { createContext } from "atomico";

export interface HeadingRangeContext {
  type: "range";
  value: [Date, Date];
  locale?: string;
}

export interface HeadingDateContext {
  type: "date";
  value: Date;
  locale?: string;
}

export type HeadingContextValue = HeadingRangeContext | HeadingDateContext;

const now = new Date();

export const CalendarHeadingContext = createContext<HeadingContextValue>({
  type: "date",
  value: now,
} as HeadingContextValue);

customElements.define("calendar-heading-ctx", CalendarHeadingContext);
