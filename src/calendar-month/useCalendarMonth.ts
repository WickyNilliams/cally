import { getDayNames, makeDateFormatter } from "../utils/hooks.js";
import {
  clamp,
  endOfWeek,
  getViewOfMonth,
  startOfWeek,
  toDate,
  getToday,
} from "../utils/date.js";
import type { PlainDate } from "../utils/temporal.js";
import type { CalendarContextValue } from "./CalendarMonthContext.js";

const dayOptions = { month: "long", day: "numeric" } as const;
const monthOptions = { month: "long" } as const;
const longDayOptions = { weekday: "long" } as const;

const inRange = (date: PlainDate, min?: PlainDate, max?: PlainDate) =>
  clamp(date, min, max) === date;

export const isLTR = (e: Event) =>
  (e.target as HTMLElement).matches(":dir(ltr)");

export function getCalendarMonthData(context: CalendarContextValue, offset: number) {
  const {
    firstDayOfWeek,
    isDateDisallowed,
    min,
    max,
    today,
    page,
    locale,
    focusedDate,
    formatWeekday,
  } = context;

  const todaysDate = today ?? getToday();
  const daysLong = getDayNames(longDayOptions, firstDayOfWeek, locale);
  const daysVisible = getDayNames({ weekday: formatWeekday }, firstDayOfWeek, locale);
  const dayFormatter = makeDateFormatter(dayOptions, locale);
  const formatter = makeDateFormatter(monthOptions, locale);
  const yearMonth = page.start.add({ months: offset });
  const weeks = getViewOfMonth(yearMonth, firstDayOfWeek);

  function getDayPart(date: PlainDate): string | undefined {
    const isInMonth = yearMonth.equals(date);

    if (!context.showOutsideDays && !isInMonth) {
      return undefined;
    }

    const isFocusedDay = date.equals(focusedDate);
    const isToday = date.equals(todaysDate);
    const asDate = toDate(date);
    const isDisallowed = isDateDisallowed?.(asDate);
    const isDisabled = !inRange(date, min, max);

    let rangeParts = "";
    let isSelected: boolean | undefined;

    if (context.type === "range") {
      const [start, end] = context.value;
      const isRangeStart = start?.equals(date);
      const isRangeEnd = end?.equals(date);
      isSelected = start && end && inRange(date, start, end);
      // prettier-ignore
      rangeParts = `${isRangeStart ? "range-start" : ""} ${isRangeEnd ? "range-end" : ""} ${isSelected && !isRangeStart && !isRangeEnd ? "range-inner" : ""}`;
    } else if (context.type === "multi") {
      isSelected = context.value.some((d) => d.equals(date));
    } else {
      isSelected = context.value?.equals(date);
    }

    // prettier-ignore
    const part = `button day day-${asDate.getUTCDay()} ${
      isInMonth ? (isSelected ? "selected" : "") : "outside"
    } ${isDisallowed ? "disallowed" : ""} ${isToday ? "today" : ""} ${
      context.getDayParts?.(asDate) ?? ""
    } ${rangeParts}`;

    return {
      part: part.replace(/\s+/g, " ").trim(),
      tabindex: isInMonth && isFocusedDay ? 0 : -1,
      disabled: isDisabled,
      ariaDisabled: isDisallowed ? "true" : null,
      ariaPressed: isInMonth && isSelected ? "true" : "false",
      ariaCurrent: isToday ? "date" : null,
      ariaLabel: dayFormatter.format(asDate),
      day: date.day,
    } as DayProps;
  }

  return { weeks, yearMonth, daysLong, daysVisible, formatter, getDayPart };
}

export type DayProps = {
  part: string;
  tabindex: number;
  disabled: boolean;
  ariaDisabled: string | null;
  ariaPressed: string;
  ariaCurrent: string | null;
  ariaLabel: string;
  day: number;
};

export function handleKeyDown(
  e: KeyboardEvent,
  context: CalendarContextValue,
  dispatchFocusDay: (date: PlainDate) => void
) {
  const { focusedDate, min, max, firstDayOfWeek } = context;
  let date: PlainDate;

  switch (e.key) {
    case "ArrowRight":
      date = focusedDate.add({ days: isLTR(e) ? 1 : -1 });
      break;
    case "ArrowLeft":
      date = focusedDate.add({ days: isLTR(e) ? -1 : 1 });
      break;
    case "ArrowDown":
      date = focusedDate.add({ days: 7 });
      break;
    case "ArrowUp":
      date = focusedDate.add({ days: -7 });
      break;
    case "PageUp":
      date = focusedDate.add(e.shiftKey ? { years: -1 } : { months: -1 });
      break;
    case "PageDown":
      date = focusedDate.add(e.shiftKey ? { years: 1 } : { months: 1 });
      break;
    case "Home":
      date = startOfWeek(focusedDate, firstDayOfWeek);
      break;
    case "End":
      date = endOfWeek(focusedDate, firstDayOfWeek);
      break;
    default:
      return;
  }

  dispatchFocusDay(clamp(date, min, max));
  e.preventDefault();
}
