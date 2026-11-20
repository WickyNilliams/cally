/** @jsxImportSource test-jsx */
import { describe, it, expect } from "vitest";
import { CalendarDate } from "../calendar-date/calendar-date.js";
import { CalendarMonth } from "../calendar-month/calendar-month.js";
import { CalendarHeading } from "../calendar-heading/calendar-heading.js";
import { CalendarRange } from "../calendar-range/calendar-range.js";
import {
  fixture,
  getCalendarHeading,
  getMonthHeading,
  getMonths,
  nextFrame,
  type CalendarInstance,
  type MonthInstance,
} from "./test.js";

const text = (heading: Element) => heading.shadowRoot!.textContent;

// each definition needs a name of its own
let id = 0;
const uniqueTag = (name: string) => `${name}-${id++}`;

describe("context", () => {
  // elements are upgraded in a different order depending on how they came to
  // be, which must have no bearing on which provider they end up with.
  describe("finds the nearest provider, however the elements were created", () => {
    const markup = `
      <calendar-range locale="en-GB" months="2" value="2024-03-05/2024-03-09">
        <calendar-month>
          <calendar-heading slot="heading" month="short"></calendar-heading>
        </calendar-month>
        <calendar-month offset="1"></calendar-month>
      </calendar-range>
    `;

    const cases: Record<string, (host: Element) => void> = {
      innerHTML: (host) => {
        host.innerHTML = markup;
      },
      insertAdjacentHTML: (host) => {
        host.insertAdjacentHTML("beforeend", markup);
      },
      "a cloned template": (host) => {
        const template = document.createElement("template");
        template.innerHTML = markup;
        host.append(template.content.cloneNode(true));
      },
      "detached html": (host) => {
        const div = document.createElement("div");
        div.innerHTML = markup;
        host.append(div);
      },
    };

    for (const [name, render] of Object.entries(cases)) {
      it(`via ${name}`, async () => {
        const host = fixture(<div />);
        render(host);
        await nextFrame();

        const calendar =
          host.querySelector<CalendarInstance>("calendar-range")!;
        const [first, second] = getMonths(calendar);
        const slotted = first!.querySelector("calendar-heading")!;

        expect(calendar).toBeInstanceOf(CalendarRange);
        expect(getCalendarHeading(calendar)).toEqual("March – April 2024");

        // headings within a month describe that month, not the calendar
        expect(getMonthHeading(first!)).toEqual("March");
        expect(getMonthHeading(second!)).toEqual("April");
        expect(text(slotted)).toEqual("Mar");
      });
    }
  });

  // as happens when components are imported individually, in any order
  describe("when a provider is defined after its consumers", () => {
    it("finds a calendar that is defined later", async () => {
      // any month but the current one, which is what is shown by default
      const today = new Date();
      const monthName = (month: number) =>
        new Date(Date.UTC(2020, month, 1)).toLocaleDateString("en-GB", {
          month: "long",
          timeZone: "UTC",
        });
      const other = (today.getMonth() + 6) % 12;

      const tag = uniqueTag("late-calendar");
      const calendar = document.createElement(tag);
      const month = <CalendarMonth />;
      calendar.setAttribute("locale", "en-GB");
      calendar.setAttribute(
        "value",
        `2020-${String(other + 1).padStart(2, "0")}-15`,
      );
      calendar.append(month);
      fixture(calendar);
      await nextFrame();

      // nothing to go on yet
      expect(getMonthHeading(month as MonthInstance)).toEqual(
        monthName(today.getMonth()),
      );

      class LateCalendar extends CalendarDate {}
      LateCalendar.define(tag);
      await nextFrame();

      expect(getMonthHeading(month as MonthInstance)).toEqual(monthName(other));
    });

    it("prefers a nearer provider that is defined later", async () => {
      const tag = uniqueTag("late-month");
      const month = document.createElement(tag);
      const heading = <CalendarHeading slot="heading" month="long" />;
      month.append(heading);

      fixture(
        <CalendarDate locale="en-GB" months={2} value="2020-01-15">
          {month}
        </CalendarDate>,
      );
      await nextFrame();

      // the calendar is the only provider there is, so far
      expect(text(heading)).toEqual("January – February");

      class LateMonth extends CalendarMonth {}
      LateMonth.define(tag);
      await nextFrame();

      expect(text(heading)).toEqual("January");
      expect(getMonthHeading(month as MonthInstance)).toEqual("January");
    });
  });

  describe("when moved", () => {
    it("finds its new provider", async () => {
      const month = <CalendarMonth />;
      fixture(
        <CalendarDate locale="en-GB" value="2020-01-15">
          {month}
        </CalendarDate>,
      );
      const other = fixture(<CalendarDate locale="en-GB" value="2021-06-15" />);
      await nextFrame();
      expect(getMonthHeading(month as MonthInstance)).toEqual("January");

      other.append(month);
      await nextFrame();
      expect(getMonthHeading(month as MonthInstance)).toEqual("June");
    });

    it("no longer uses a provider it has been moved out of", async () => {
      const heading = <CalendarHeading slot="heading" year="numeric" />;
      const host = fixture(
        <div>
          <CalendarDate locale="en-GB" value="2001-01-15">
            {heading}
            <CalendarMonth />
          </CalendarDate>
        </div>,
      );
      await nextFrame();
      expect(text(heading)).toEqual("2001");

      host.append(heading);
      await nextFrame();
      expect(text(heading)).toEqual(`${new Date().getUTCFullYear()}`);
    });
  });
});
