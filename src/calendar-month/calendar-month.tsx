import { c, css, useContext, useRef, type Host } from "atomico";
import { reset, vh } from "../utils/styles.js";
import { useCalendarMonth } from "./useCalendarMonth.js";
import { CalendarContext } from "./CalendarMonthContext.js";
import { toDate } from "../utils/date.js";

const mapToDayNumber = (firstDayOfWeek: number, i: number) =>
  (i + firstDayOfWeek) % 7;

export const CalendarMonth = c(
  (
    props
  ): Host<{
    onSelectDay: CustomEvent<string>;
    onFocusDay: CustomEvent<string>;
    onHoverDay: CustomEvent<string>;
  }> => {
    const context = useContext(CalendarContext);
    const table = useRef<HTMLTableElement>();
    const calendar = useCalendarMonth({ props, context });

    function focus() {
      table.current.querySelector<HTMLElement>("button[tabindex='0']")?.focus();
    }

    return (
      <host shadowDom focus={focus}>
        <div id="h" part="heading">
          {calendar.formatter.format(toDate(calendar.yearMonth))}
        </div>

        <table ref={table} aria-labelledby="h" part="table">
          <thead>
            <tr part="tr head">
              {calendar.daysLong.map((dayName, i) => (
                <th
                  part={`th day day-${mapToDayNumber(context.firstDayOfWeek, i)}`}
                  scope="col"
                >
                  <span class="vh">{dayName}</span>
                  <span aria-hidden="true">{calendar.daysVisible[i]}</span>
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {calendar.weeks.map((week, i) => (
              <tr key={i} part="tr week">
                {week.map((date, j) => {
                  const props = calendar.getDayProps(date);

                  return (
                    <td part="td" key={j}>
                      {props && <button {...props}>{date.day}</button>}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </host>
    );
  },

  {
    props: {
      offset: {
        type: Number,
        value: 0,
      },
    },

    styles: [
      reset,
      vh,
      css`
        :host {
          --color-accent: black;
          --color-text-on-accent: white;

          display: flex;
          flex-direction: column;
          gap: 0.25rem;
          text-align: center;
          inline-size: fit-content;
        }

        table {
          border-collapse: collapse;
          font-size: 0.875rem;
        }

        th {
          font-weight: bold;
          block-size: 2.25rem;
        }

        td {
          padding-inline: 0;
        }

        button {
          color: inherit;
          font-size: inherit;
          background: transparent;
          border: 0;
          font-variant-numeric: tabular-nums;
          block-size: 2.25rem;
          inline-size: 2.25rem;
        }

        button:hover:where(:not(:disabled, [aria-disabled])) {
          background: #0000000d;
        }

        button:is([aria-pressed="true"], :focus-visible) {
          background: var(--color-accent);
          color: var(--color-text-on-accent);
        }

        button:focus-visible {
          outline: 1px solid var(--color-text-on-accent);
          outline-offset: -2px;
        }

        button:disabled,
        :host::part(outside),
        :host::part(disallowed) {
          cursor: default;
          opacity: 0.5;
        }
      `,
    ],
  }
);
customElements.define("calendar-month", CalendarMonth);
