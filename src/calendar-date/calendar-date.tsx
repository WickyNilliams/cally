import { c, type Host } from "atomico";
import type { PlainDate } from "../utils/temporal.js";
import { useDateProp } from "../utils/hooks.js";
import { CalendarBase, styles, props } from "../calendar-base/calendar-base.js";
import {
  useCalendarBase,
  type CalendarFocusOptions,
} from "../calendar-base/useCalendarBase.js";

export const CalendarDate = c(
  (
    props
  ): Host<{
    onChange: Event;
    onFocusDay: CustomEvent<Date>;
    focus: (options?: CalendarFocusOptions) => void;
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
          type="date"
          value={value}
          onSelect={handleSelect}
        />
      </host>
    );
  },

  { props, styles }
);

customElements.define("calendar-date", CalendarDate);
