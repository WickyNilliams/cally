import { c, type Host } from "atomico";
import { PlainDate } from "../utils/temporal.js";
import { useDateMultiProp, useDateProp } from "../utils/hooks.js";
import { CalendarBase, styles, props } from "../calendar-base/calendar-base.js";
import {
  useCalendarBase,
  type CalendarFocusOptions,
} from "../calendar-base/useCalendarBase.js";

export const CalendarMulti = c(
  (
    props
  ): Host<{
    onChange: Event;
    onFocusDay: CustomEvent<Date>;
    focus: (options?: CalendarFocusOptions) => void;
  }> => {
    const [value, setValue] = useDateMultiProp("value");
    const [focusedDate = value[0], setFocusedDate] = useDateProp("focusedDate");
    const calendar = useCalendarBase({
      ...props,
      focusedDate,
      setFocusedDate,
    });

    function handleSelect(e: CustomEvent<PlainDate>) {
      const newValues = [...value];

      const idx = value.findIndex((date) => date.equals(e.detail));
      idx < 0 ? newValues.push(e.detail) : newValues.splice(idx, 1);

      setValue(newValues);
      calendar.dispatch();
    }

    return (
      <host shadowDom focus={calendar.focus}>
        <CalendarBase
          {...props}
          {...calendar}
          type="multi"
          value={value}
          onSelect={handleSelect}
        />
      </host>
    );
  },

  { props, styles }
);

customElements.define("calendar-multi", CalendarMulti);
