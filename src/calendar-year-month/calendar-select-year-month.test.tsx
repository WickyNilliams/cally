import type { VNodeAny } from "atomico/types/vnode";
import { describe, it, expect } from "vitest";
import { userEvent } from "vitest/browser";
import { CalendarDate } from "../calendar-date/calendar-date";
import { CalendarMonth } from "../calendar-month/calendar-month";
import { CalendarSelectMonth } from "./calendar-select-month";
import { CalendarSelectYear } from "./calendar-select-year";
import {
  click,
  getCalendarHeading,
  getNextPageButton,
  mount,
  type CalendarInstance,
} from "../utils/test";

type TestProps = {
  min: string;
  max: string;
  value: string;
  maxYears: number;
  formatMonth: "long" | "short";
};

function Fixture({
  value,
  min,
  max,
  maxYears,
  formatMonth,
}: Partial<TestProps>): VNodeAny {
  return (
    <CalendarDate value={value} min={min} max={max} locale="en-GB">
      <CalendarSelectMonth formatMonth={formatMonth} />
      <CalendarSelectYear maxYears={maxYears} />
      <CalendarMonth />
    </CalendarDate>
  );
}

function getMonthSelect(calendar: CalendarInstance): HTMLSelectElement {
  return calendar
    .querySelector("calendar-select-month")!
    .shadowRoot!.querySelector("select")!;
}

function getYearSelect(calendar: CalendarInstance): HTMLSelectElement {
  return calendar
    .querySelector("calendar-select-year")!
    .shadowRoot!.querySelector("select")!;
}

describe("CalendarSelectMonth / CalendarSelectYear", () => {
  it("updates as the calendar changes", async () => {
    const calendar = await mount(<Fixture value="2025-12-15" />);
    const monthSelect = getMonthSelect(calendar);
    const yearSelect = getYearSelect(calendar);

    expect(monthSelect.value).toBe("12");
    expect(yearSelect.value).toBe("2025");

    const nextPage = getNextPageButton(calendar);
    await click(nextPage);

    expect(monthSelect.value).toBe("1");
    expect(yearSelect.value).toBe("2026");
  });

  it("can change the month", async () => {
    const calendar = await mount(<Fixture value="2025-12-15" />);
    const monthSelect = getMonthSelect(calendar);
    const heading = getCalendarHeading(calendar);

    expect(monthSelect.value).toBe("12");
    expect(heading.textContent).toBe("December 2025");

    await userEvent.selectOptions(monthSelect, "11");

    expect(monthSelect.value).toBe("11");
    expect(heading.textContent).toBe("November 2025");
  });

  it("can change the year", async () => {
    const calendar = await mount(<Fixture value="2025-12-15" />);
    const yearSelect = getYearSelect(calendar);
    const heading = getCalendarHeading(calendar);

    expect(yearSelect.value).toBe("2025");
    expect(heading.textContent).toBe("December 2025");

    await userEvent.selectOptions(yearSelect, "2026");

    expect(yearSelect.value).toBe("2026");
    expect(heading.textContent).toBe("December 2026");
  });

  it("handles min and max dates", async () => {
    const calendar = await mount(
      <Fixture value="2025-06-01" min="2024-06-01" max="2026-02-01" />
    );

    const monthSelect = getMonthSelect(calendar);
    const yearSelect = getYearSelect(calendar);

    expect([...yearSelect.options].map((o) => o.label)).toEqual([
      "2024",
      "2025",
      "2026",
    ]);

    // all months will be enabled because this year is not min/max
    expect(
      [...monthSelect.options].map((o) => ({
        label: o.label,
        disabled: o.disabled,
      }))
    ).toEqual([
      { label: "January", disabled: false },
      { label: "February", disabled: false },
      { label: "March", disabled: false },
      { label: "April", disabled: false },
      { label: "May", disabled: false },
      { label: "June", disabled: false },
      { label: "July", disabled: false },
      { label: "August", disabled: false },
      { label: "September", disabled: false },
      { label: "October", disabled: false },
      { label: "November", disabled: false },
      { label: "December", disabled: false },
    ]);

    // go back to 2024, which is the min year
    await userEvent.selectOptions(yearSelect, "2024");

    // months before min will be disabled
    expect(
      [...monthSelect.options].map((o) => ({
        label: o.label,
        disabled: o.disabled,
      }))
    ).toEqual([
      { label: "January", disabled: true },
      { label: "February", disabled: true },
      { label: "March", disabled: true },
      { label: "April", disabled: true },
      { label: "May", disabled: true },
      { label: "June", disabled: false },
      { label: "July", disabled: false },
      { label: "August", disabled: false },
      { label: "September", disabled: false },
      { label: "October", disabled: false },
      { label: "November", disabled: false },
      { label: "December", disabled: false },
    ]);
  });

  it("can render month names in long format", async () => {
    const calendar = await mount(
      <Fixture value="2025-12-15" formatMonth="long" />
    );

    const monthSelect = getMonthSelect(calendar);
    expect([...monthSelect.options].map((o) => o.label)).toEqual([
      "January",
      "February",
      "March",
      "April",
      "May",
      "June",
      "July",
      "August",
      "September",
      "October",
      "November",
      "December",
    ]);
  });

  it("can render month names in short format", async () => {
    const calendar = await mount(
      <Fixture value="2025-12-15" formatMonth="short" />
    );

    const monthSelect = getMonthSelect(calendar);
    expect([...monthSelect.options].map((o) => o.label)).toEqual([
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sept",
      "Oct",
      "Nov",
      "Dec",
    ]);
  });

  it("respects maxYears prop", async () => {
    const calendar = await mount(
      <Fixture value="2025-12-15" maxYears={6} />
    );

    const yearSelect = getYearSelect(calendar);
    expect([...yearSelect.options].map((o) => o.label)).toEqual([
      "2022",
      "2023",
      "2024",
      "2025",
      "2026",
      "2027",
    ]);
  });

  it("centers years around current year when no min/max", async () => {
    const calendar = await mount(
      <Fixture value="2025-12-15" maxYears={10} />
    );

    const yearSelect = getYearSelect(calendar);
    expect([...yearSelect.options].map((o) => o.label)).toEqual([
      "2020",
      "2021",
      "2022",
      "2023",
      "2024",
      "2025",
      "2026",
      "2027",
      "2028",
      "2029",
    ]);
  });

  it("respects min/max range when smaller than maxYears", async () => {
    const calendar = await mount(
      <Fixture value="2025-06-01" min="2024-01-01" max="2026-12-31" maxYears={20} />
    );

    const yearSelect = getYearSelect(calendar);
    expect([...yearSelect.options].map((o) => o.label)).toEqual([
      "2024",
      "2025",
      "2026",
    ]);
  });

  it("constrains centered range when min is set", async () => {
    const calendar = await mount(
      <Fixture value="2025-01-01" min="2023-01-01" maxYears={10} />
    );

    const yearSelect = getYearSelect(calendar);
    // Would normally show 2020-2029, but min constrains to 2023-2029
    expect([...yearSelect.options].map((o) => o.label)).toEqual([
      "2023",
      "2024",
      "2025",
      "2026",
      "2027",
      "2028",
      "2029",
    ]);
  });

  it("constrains centered range when max is set", async () => {
    const calendar = await mount(
      <Fixture value="2025-12-31" max="2027-12-31" maxYears={10} />
    );

    const yearSelect = getYearSelect(calendar);
    // Would normally show 2020-2029, but max constrains to 2020-2027
    expect([...yearSelect.options].map((o) => o.label)).toEqual([
      "2020",
      "2021",
      "2022",
      "2023",
      "2024",
      "2025",
      "2026",
      "2027",
    ]);
  });
});
