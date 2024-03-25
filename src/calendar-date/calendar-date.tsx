import { c, useEffect, useEvent } from "atomico";
import type { PlainDate } from "../utils/temporal.js";
import { useDateProp } from "../utils/hooks.js";
import { CalendarBase, styles, props } from "../calendar-base/calendar-base.js";
import { useCalendarBase } from "../calendar-base/useCalendarBase.js";

export const CalendarDate = c(
  (props) => {
    const [value, setValue] = useDateProp("value");
    const calendar = useCalendarBase(props);

    useEffect(() => {
      if (value) {
        calendar.setFocusedDate(value);
      }
    }, [value]);

    async function handleFocus(e: CustomEvent<PlainDate>) {
      calendar.setFocusedDate(e.detail);
      setTimeout(() => calendar.focus());
    }

    function handleSelect(e: CustomEvent<PlainDate>) {
      setValue(e.detail);
      calendar.dispatch();
    }

    return (
      <host shadowDom focus={calendar.focus}>
        <CalendarBase
          {...props}
          {...calendar}
          value={value}
          onFocus={handleFocus}
          onSelect={handleSelect}
        />
      </host>
    );
  },
  { props, styles }
);
customElements.define("calendar-date", CalendarDate);
