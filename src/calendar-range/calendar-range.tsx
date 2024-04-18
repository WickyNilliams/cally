import { c, useState, type Host, useEvent } from "atomico";
import { PlainDate } from "../utils/temporal.js";
import { useDateProp, useDateRangeProp } from "../utils/hooks.js";
import { CalendarBase, styles, props } from "../calendar-base/calendar-base.js";
import { useCalendarBase } from "../calendar-base/useCalendarBase.js";

type Tentative = { first: PlainDate; second: PlainDate };

const sort = (a: PlainDate, b: PlainDate): [PlainDate, PlainDate] =>
  PlainDate.compare(a, b) < 0 ? [a, b] : [b, a];

export const CalendarRange = c(
  (
    props
  ): Host<{
    onChange: Event;
    onRangeStart: CustomEvent<Date>;
    onRangeEnd: CustomEvent<Date>;
    onFocusDay: CustomEvent<Date>;
    focusDate: (date: Date) => void;
  }> => {
    const [value, setValue] = useDateRangeProp("value");
    const [focusedDate = value[0], setFocusedDate] = useDateProp("focusedDate");
    const calendar = useCalendarBase({
      ...props,
      focusedDate,
      setFocusedDate,
    });
    const dispatchStart = useEvent<Date>("rangestart");
    const dispatchEnd = useEvent<Date>("rangeend");

    // tentative selection is not ordered, it is just a first selection and second selection
    // the second selection can come before or after the first selection for improved ux
    const [tentative, setTentative] = useState<Tentative | undefined>();

    async function handleFocus(e: CustomEvent<PlainDate>) {
      calendar.handleFocus(e);
      handleHover(e);
    }

    function handleHover(e: CustomEvent<PlainDate>) {
      e.stopPropagation();
      setTentative((t) => {
        return t ? { ...t, second: e.detail } : t;
      });
    }

    function handleSelect(e: CustomEvent<PlainDate>) {
      const detail = e.detail;
      e.stopPropagation();

      if (!tentative) {
        setTentative({ first: detail, second: detail });
        dispatchStart(detail.toDate());
      } else {
        setValue(sort(tentative.first, detail));
        setTentative(undefined);
        dispatchEnd(detail.toDate());
        calendar.dispatch();
      }
    }

    const highlightedRange = tentative
      ? sort(tentative.first, tentative.second)
      : value;

    return (
      <host shadowDom focus={calendar.focus}>
        <CalendarBase
          {...props}
          {...calendar}
          highlightedRange={highlightedRange}
          onFocus={handleFocus}
          onHover={handleHover}
          onSelect={handleSelect}
        />
      </host>
    );
  },

  { props, styles }
);

customElements.define("calendar-range", CalendarRange);
