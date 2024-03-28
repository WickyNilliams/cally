import { c, useEffect, useMemo, useState, type Host } from "atomico";
import { PlainDate } from "../utils/temporal.js";
import { inRange } from "../utils/date.js";
import { useDateRangeProp } from "../utils/hooks.js";
import { CalendarBase, styles, props } from "../calendar-base/calendar-base.js";
import { useCalendarBase } from "../calendar-base/useCalendarBase.js";

type Tentative = { first: PlainDate; second: PlainDate };

const sort = (a: PlainDate, b: PlainDate): [PlainDate, PlainDate] =>
  PlainDate.compare(a, b) < 0 ? [a, b] : [b, a];

export const CalendarRange = c(
  (props): Host<{ onChange: Event }> => {
    const [value, setValue] = useDateRangeProp("value");
    const calendar = useCalendarBase(props);

    // tentative selection is not ordered, it is just a first selection and second selection
    // the second selection can come before or after the first selection for improved ux
    const [tentative, setTentative] = useState<Tentative | undefined>();

    // TODO: really we should have focusedDate in the deps array but it breaks the logic then
    useEffect(() => {
      if (
        value &&
        !inRange(calendar.dateWindow.focusedDate, value[0], value[1])
      ) {
        calendar.setFocusedDate(value[1]);
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
      const detail = e.detail;
      if (!tentative) {
        setTentative({ first: detail, second: detail });
      } else {
        setValue(sort(tentative.first, detail));
        setTentative(undefined);
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
