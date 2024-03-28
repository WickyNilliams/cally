import { useEvent, useMemo } from "atomico";
import { useDayNames, useDateFormatter } from "../utils/hooks.js";
import {
  clamp,
  endOfWeek,
  getViewOfMonth,
  inRange,
  startOfWeek,
  today,
} from "../utils/date.js";
import type { PlainDate } from "../utils/temporal.js";
import type { CalendarMonthContextValue } from "./CalendarMonthContext.js";

function cx(map: Record<string, boolean | null | undefined>) {
  let result = "";

  for (const key in map) {
    if (map[key]) {
      result += ` ${key}`;
    }
  }

  return result;
}

const dayFormatOptions = { month: "long", day: "numeric" } as const;
const dispatchOptions = { bubbles: true };

type UseCalendarMonthOptions = {
  props: { offset: number };
  context: CalendarMonthContextValue;
};

export function useCalendarMonth({ props, context }: UseCalendarMonthOptions) {
  const { offset } = props;
  const { firstDayOfWeek, isDateDisallowed, min, max, dateWindow, locale } =
    context;

  const todaysDate = today();
  const dayNamesLong = useDayNames("long", firstDayOfWeek, locale);
  const dayNamesShort = useDayNames("narrow", firstDayOfWeek, locale);
  const dayFormatter = useDateFormatter(locale, dayFormatOptions);

  const { focusedDate } = dateWindow;
  const yearMonth = useMemo(
    () => dateWindow.start.add({ months: offset }),
    [dateWindow, offset]
  );

  const weeks = useMemo(
    () => getViewOfMonth(yearMonth, firstDayOfWeek),
    [yearMonth, firstDayOfWeek]
  );

  const dispatchFocusDay = useEvent<PlainDate>("focusday", dispatchOptions);
  const dispatchSelectDay = useEvent<PlainDate>("selectday", dispatchOptions);
  const dispatchHoverDay = useEvent<PlainDate>("hoverday", dispatchOptions);

  function focusDay(date: PlainDate) {
    dispatchFocusDay(clamp(date, min, max));
  }

  function onKeyDown(e: KeyboardEvent) {
    const isLTR = (e.target as HTMLElement).matches(":dir(ltr)");
    let date: PlainDate;

    switch (e.key) {
      case "ArrowRight":
        date = focusedDate.add({ days: isLTR ? 1 : -1 });
        break;
      case "ArrowLeft":
        date = focusedDate.add({ days: isLTR ? -1 : 1 });
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

    focusDay(date);
    e.preventDefault();
  }

  function getDayProps(date: PlainDate) {
    const isInMonth = yearMonth.equals(date);
    const isFocusedDay = date.equals(focusedDate);
    const isToday = date.equals(todaysDate);
    const asDate = date.toDate();
    const isDisallowed = isDateDisallowed?.(asDate);
    const isDisabled = !inRange(date, min, max);

    let isSelected = false;
    let isRange = false;
    let isRangeStart = false;
    let isRangeEnd = false;

    // range
    if ("highlightedRange" in context) {
      const [start, end] = context.highlightedRange ?? [];
      isRange = true;
      isRangeStart = start?.equals(date) ?? false;
      isRangeEnd = end?.equals(date) ?? false;
      isSelected = start && end ? inRange(date, start, end) : false;
    }
    // date
    else if ("value" in context) {
      isSelected = context.value?.equals(date) ?? false;
    }

    return {
      part: cx({
        button: true,
        day: true,
        selected: isInMonth && isSelected,
        today: isToday,
        disallowed: isDisallowed,
        outside: !isInMonth,
        "range-start": isRangeStart,
        "range-end": isRangeEnd,
        "range-inner": isRange && isSelected && !isRangeStart && !isRangeEnd,
      }),
      tabindex: isInMonth && isFocusedDay ? 0 : -1,
      disabled: isDisabled,
      "aria-disabled": isDisallowed ? "true" : undefined,
      "aria-pressed": isInMonth && isSelected,
      "aria-current": isToday ? "date" : undefined,
      "aria-label": dayFormatter.format(asDate),
      onkeydown: onKeyDown,
      onclick() {
        if (!isDisallowed) {
          dispatchSelectDay(date);
        }
        focusDay(date);
      },
      onmouseover() {
        if (!isDisallowed && !isDisabled) {
          dispatchHoverDay(date);
        }
      },
    };
  }

  return {
    weeks,
    yearMonth,
    dayNamesLong,
    dayNamesShort,
    getDayProps,
  };
}
