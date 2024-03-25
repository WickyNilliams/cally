import { c, useEffect, useEvent, useMemo, useState } from "atomico";
import { PlainDate } from "../utils/temporal.js";
import { inRange } from "../utils/utils.js";
import { useDateRangeProp } from "../utils/hooks.js";
import { CalendarBase, styles, props } from "../calendar-base/calendar-base.js";
import { useCalendarBase } from "../calendar-base/useCalendarBase.js";

type Tentative = { first: PlainDate; second: PlainDate };

export const CalendarRange = c(
  (props) => {
    const [value, setValue] = useDateRangeProp("value");

    const calendar = useCalendarBase(props);

    // tentative selection is not ordered, it is just a first selection and second selection
    // the second selection can come before or after the first selection for improved ux
    const [tentative, setTentative] = useState<Tentative | undefined>();
    // but we need to sort the tentative selection to be able to display it
    const sorted = useMemo(() => {
      if (tentative) {
        return [tentative.first, tentative.second].sort(PlainDate.compare);
      }
    }, [tentative]);

    // TODO: really we should have focusedDate in the deps array but it breaks the logic then
    useEffect(() => {
      if (
        value.end &&
        !inRange(calendar.dateWindow.focusedDate, value.start, value.end)
      ) {
        calendar.setFocusedDate(value.end);
      }
    }, [value]);

    async function handleFocus(e: CustomEvent<PlainDate>) {
      calendar.setFocusedDate(e.detail);
      handleHover(e);
      setTimeout(() => calendar.focus());
    }

    function handleHover(e: CustomEvent<PlainDate>) {
      setTentative((t) => {
        return t ? { ...t, second: e.detail } : t;
      });
    }

    function handleSelect(e: CustomEvent<PlainDate>) {
      if (!sorted) {
        setTentative({ first: e.detail, second: e.detail });
      } else {
        setValue(sorted[0]!, sorted[1]!);
        setTentative(undefined);
        calendar.dispatch();
      }
    }

    const highlightedRange = sorted
      ? { start: sorted[0], end: sorted[1] }
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
