import { describe, it, expect } from "vitest";
import type { VNodeAny } from "atomico/types/vnode";
import { mount, getMonth, type CalendarInstance, type MonthInstance } from "../utils/test.js";
import { CalendarMonth } from "../calendar-month/calendar-month.js";
import { CalendarDate } from "../calendar-date/calendar-date.js";
import { CalendarHeading } from "./calendar-heading.js";
import { PlainYearMonth } from "../utils/temporal.js";
import { toDate } from "../utils/date.js";

function Fixture({ children, ...props }: Record<string, any>): VNodeAny {
  return (
    <CalendarDate locale="en-GB" {...props}>
      {children ?? <CalendarMonth />}
    </CalendarDate>
  );
}

function getSlottedHeadingText(root: CalendarInstance | MonthInstance) {
  const heading = root.querySelector<HTMLElement>("calendar-heading");

  if (!heading) {
    throw new Error("Could not find slotted calendar-heading");
  }

  return () => heading.shadowRoot?.textContent ?? heading.textContent ?? "";
}

describe("CalendarHeading", () => {
  it("formats using the provided month and year options", async () => {
    const calendar = await mount(
      <Fixture value="2024-03-15">
        <CalendarHeading slot="heading" month="short" year="2-digit" />
        <CalendarMonth />
      </Fixture>
    );

    const headingText = getSlottedHeadingText(calendar);
    const formatter = new Intl.DateTimeFormat("en-GB", { timeZone: "UTC",
      month: "short",
      year: "2-digit",
    });
    const expected = formatter.format(toDate(new PlainYearMonth(2024, 3)));

    await expect.poll(headingText).toBe(expected);
  });

  it("only includes options that are set", async () => {
    const calendar = await mount(
      <Fixture value="2024-09-01">
        <CalendarHeading slot="heading" month="long" />
        <CalendarMonth />
      </Fixture>
    );

    const headingText = getSlottedHeadingText(calendar);
    const formatter = new Intl.DateTimeFormat("en-GB", { timeZone: "UTC", month: "long" });
    const expected = formatter.format(toDate(new PlainYearMonth(2024, 9)));

    await expect.poll(headingText).toBe(expected);
  });

  it("formats a range when showing multiple months", async () => {
    const calendar = await mount(
      <Fixture months={2} value="2023-12-01">
        <CalendarHeading slot="heading" month="long" year="numeric" />
        <CalendarMonth />
        <CalendarMonth offset={1} />
      </Fixture>
    );

    const headingText = getSlottedHeadingText(calendar);
    const start = toDate(new PlainYearMonth(2023, 12));
    const end = toDate(new PlainYearMonth(2024, 1));
    const formatter = new Intl.DateTimeFormat("en-GB", { timeZone: "UTC",
      month: "long",
      year: "numeric",
    });

    await expect.poll(headingText).toBe(formatter.formatRange(start, end));
  });

  it("can customise the month heading via slot", async () => {
    const calendar = await mount(
      <Fixture value="2024-07-10">
        <CalendarMonth>
          <CalendarHeading slot="heading" month="short" year="numeric" />
        </CalendarMonth>
      </Fixture>
    );

    const month = getMonth(calendar);
    const headingText = getSlottedHeadingText(month);

    const formatter = new Intl.DateTimeFormat("en-GB", { timeZone: "UTC",
      month: "short",
      year: "numeric",
    });
    const expected = formatter.format(toDate(new PlainYearMonth(2024, 7)));

    await expect.poll(headingText).toBe(expected);
  });

  it("respects the locale", async () => {
    const calendar = await mount(
      <Fixture value="2024-03-15" locale="de-DE">
        <CalendarHeading slot="heading" month="long" year="numeric" />
        <CalendarMonth />
      </Fixture>
    );

    const headingText = getSlottedHeadingText(calendar);
    const formatter = new Intl.DateTimeFormat("de-DE", { timeZone: "UTC",
      month: "long",
      year: "numeric",
    });
    const expected = formatter.format(toDate(new PlainYearMonth(2024, 3)));

    await expect.poll(headingText).toBe(expected);
  });
});
