import { c, useState, type Host, useEvent, useEffect } from "atomico";
import { PlainDate } from "../utils/temporal.js";
import { useDateProp, useDateRangeProp } from "../utils/hooks.js";
import { CalendarBase, styles, props } from "../calendar-base/calendar-base.js";
import {
  useCalendarBase,
  type CalendarFocusOptions,
} from "../calendar-base/useCalendarBase.js";
import { toDate } from "../utils/date.js";

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
    focus: (options?: CalendarFocusOptions) => void;
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

    const [tentative, setTentative] = useDateProp<PlainDate | undefined>(
      "tentative"
    );
    const [hovered, setHovered] = useState<PlainDate | undefined>();

    // reset whenever tentative changes
    useEffect(() => setHovered(undefined), [tentative]);

    function handleFocus(e: CustomEvent<PlainDate>) {
      calendar.onFocus(e);
      handleHover(e);
    }

    function handleHover(e: CustomEvent<PlainDate>) {
      e.stopPropagation();
      if (tentative) {
        setHovered(e.detail);
      }
    }

    function handleSelect(e: CustomEvent<PlainDate>) {
      const detail = e.detail;
      e.stopPropagation();

      if (!tentative) {
        setTentative(detail);
        dispatchStart(toDate(detail));
      } else {
        setValue(sort(tentative, detail));
        setTentative(undefined);
        dispatchEnd(toDate(detail));
        calendar.dispatch();
      }
    }

    const range = tentative ? sort(tentative, hovered ?? tentative) : value;

    return (
      <host shadowDom focus={calendar.focus}>
        <CalendarBase
          {...props}
          {...calendar}
          type="range"
          value={range}
          onFocus={handleFocus}
          onHover={handleHover}
          onSelect={handleSelect}
        />
      </host>
    );
  },

  {
    props: {
      ...props,
      tentative: {
        type: String,
        value: "",
      },
    },
    styles,
  }
);

customElements.define("calendar-range", CalendarRange);
