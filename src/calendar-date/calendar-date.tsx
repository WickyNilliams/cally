import { c, type Host } from "atomico";
import type { PlainDate } from "../utils/temporal.js";
import { useDateProp } from "../utils/hooks.js";
import { CalendarBase, styles, props } from "../calendar-base/calendar-base.js";
import { useCalendarBase } from "../calendar-base/useCalendarBase.js";

export const CalendarDate = c(
  (
    props
  ): Host<{
    onChange: Event;
    onFocusDay: CustomEvent<Date>;
  }> => {
    const [value, setValue] = useDateProp("value");
    const [focusedDate = value, setFocusedDate] = useDateProp("focusedDate");
    const calendar = useCalendarBase({
      ...props,
      focusedDate,
      setFocusedDate,
    });

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
          onFocus={calendar.handleFocus}
          onSelect={handleSelect}
        />
      </host>
    );
  },

  { props, styles }
);

customElements.define("calendar-date", CalendarDate);
