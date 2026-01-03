import { describe, it, expect } from "vitest";
import { userEvent, page } from "vitest/browser";
import type { VNodeAny } from "atomico/types/vnode";
import {
  click,
  clickDay,
  createSpy,
  getDayButton,
  getMonth,
  getMonthHeading,
  getNextPageButton,
  getPrevPageButton,
  getSelectedDays,
  mount,
} from "../utils/test.js";

import { CalendarMonth } from "../calendar-month/calendar-month.js";
import { CalendarRange } from "./calendar-range.js";

type TestProps = {
  onchange: (e: Event) => void;
  onfocusday: (e: CustomEvent<Date>) => any;
  onrangestart: (e: CustomEvent<Date>) => any;
  onrangeend: (e: CustomEvent<Date>) => any;
  value: string;
  min: string;
  max: string;
  today: string;
  tentative?: string;
  focusedDate?: string;
  months?: number;
  children?: VNodeAny;
};

function Fixture({ children, ...props }: Partial<TestProps>): VNodeAny {
  return (
    <CalendarRange {...props} locale="en-GB">
      {children ?? <CalendarMonth />}
    </CalendarRange>
  );
}

describe("CalendarRange", () => {
  it("is defined", async () => {
    const calendar = await mount(<Fixture />);
    expect(calendar).toBeInstanceOf(CalendarRange);
  });

  describe("mouse interaction", () => {
    it("can select a range: start -> end", async () => {
      const spy = createSpy();
      const calendar = await mount(
        <Fixture value="2020-01-01/2020-01-01" onchange={spy} />
      );
      const month = getMonth(calendar);

      const nextMonth = getNextPageButton(calendar);

      // to april
      await click(nextMonth);
      await click(nextMonth);
      await click(nextMonth);

      await clickDay(month, "19 April");
      await clickDay(month, "22 April");

      expect(spy.count).toBe(1);
      expect(spy.last[0].target.value).toBe("2020-04-19/2020-04-22");
    });

    it("can select a range: end -> start", async () => {
      const spy = createSpy();
      const calendar = await mount(
        <Fixture value="2020-01-01/2020-01-01" onchange={spy} />
      );
      const month = getMonth(calendar);
      const nextMonth = getNextPageButton(calendar);

      // to april
      await click(nextMonth);
      await click(nextMonth);
      await click(nextMonth);

      await clickDay(month, "22 April");
      await clickDay(month, "19 April");

      expect(spy.count).toBe(1);
      expect(spy.last[0].target.value).toBe("2020-04-19/2020-04-22");
    });
  });

  describe("keyboard interaction", () => {
    it("can select a range: start -> end", async () => {
      const spy = createSpy();
      await mount(<Fixture value="2020-01-01/2020-01-01" onchange={spy} />);

      // tab to next page
      await userEvent.keyboard("{Tab}");
      await userEvent.keyboard("{Tab}");

      // set month to april
      await userEvent.keyboard("{Enter}");
      await userEvent.keyboard("{Enter}");
      await userEvent.keyboard("{Enter}");

      // tab to grid
      await userEvent.keyboard("{Tab}");

      // select 19th of month
      await userEvent.keyboard("{ArrowDown}");
      await userEvent.keyboard("{ArrowDown}");
      await userEvent.keyboard("{ArrowRight}");
      await userEvent.keyboard("{ArrowRight}");
      await userEvent.keyboard("{ArrowRight}");
      await userEvent.keyboard("{ArrowRight}");
      await userEvent.keyboard("{Enter}");

      // select 22nd of month
      await userEvent.keyboard("{ArrowRight}");
      await userEvent.keyboard("{ArrowRight}");
      await userEvent.keyboard("{ArrowRight}");
      await userEvent.keyboard("{Enter}");

      expect(spy.count).toBe(1);
      expect(spy.last[0].target.value).toBe("2020-04-19/2020-04-22");
    });

    it("can select a range: end -> start", async () => {
      const spy = createSpy();
      await mount(<Fixture value="2020-01-01/2020-01-01" onchange={spy} />);

      // tab to next page
      await userEvent.keyboard("{Tab}");
      await userEvent.keyboard("{Tab}");

      // set month to april
      await userEvent.keyboard("{Enter}");
      await userEvent.keyboard("{Enter}");
      await userEvent.keyboard("{Enter}");

      // tab to grid
      await userEvent.keyboard("{Tab}");

      // select 22nd of month
      await userEvent.keyboard("{ArrowDown}");
      await userEvent.keyboard("{ArrowDown}");
      await userEvent.keyboard("{ArrowDown}");
      await userEvent.keyboard("{Enter}");

      // select 19th of month
      await userEvent.keyboard("{ArrowLeft}");
      await userEvent.keyboard("{ArrowLeft}");
      await userEvent.keyboard("{ArrowLeft}");
      await userEvent.keyboard("{Enter}");

      expect(spy.count).toBe(1);
      expect(spy.last[0].target.value).toBe("2020-04-19/2020-04-22");
    });
  });

  describe("events", () => {
    it("raises a focusday event", async () => {
      const spy = createSpy<(e: CustomEvent<Date>) => void>();
      const calendar = await mount(
        <Fixture value="2022-01-01/2022-01-01" onfocusday={spy} />
      );

      // click next button
      await click(getNextPageButton(calendar));

      expect(spy.count).toBe(1);
      expect(spy.last[0].detail).toEqual(new Date("2022-02-01"));
    });

    it("raises a change event", async () => {
      const spy = createSpy<(e: Event) => void>();
      const calendar = await mount(
        <Fixture value="2022-01-01/2022-01-01" onchange={spy} />
      );

      const month = getMonth(calendar);
      await click(getPrevPageButton(calendar));

      await clickDay(month, "31 December");
      await clickDay(month, "30 December");

      expect(spy.count).toBe(1);
      const target = spy.last[0].target as InstanceType<typeof CalendarRange>;
      expect(target.value).toBe("2021-12-30/2021-12-31");
    });

    it("raises rangestart and rangeend events", async () => {
      const startSpy = createSpy<(e: CustomEvent<Date>) => void>();
      const endSpy = createSpy<(e: CustomEvent<Date>) => void>();

      const calendar = await mount(
        <Fixture
          value="2022-01-01/2022-01-01"
          onrangestart={startSpy}
          onrangeend={endSpy}
        />
      );

      const month = getMonth(calendar);
      await click(getPrevPageButton(calendar));

      await clickDay(month, "31 December");
      expect(startSpy.count).toBe(1);
      expect(startSpy.last[0].detail).toEqual(new Date("2021-12-31"));
      expect(endSpy.called).toBe(false);

      await clickDay(month, "30 December");
      expect(startSpy.count).toBe(1);
      expect(endSpy.count).toBe(1);
      expect(endSpy.last[0].detail).toEqual(new Date("2021-12-30"));
    });
  });

  describe("focused date", () => {
    it("defaults to the first date in the range if not set", async () => {
      const calendar = await mount(<Fixture value="2020-01-05/2020-01-10" />);
      const month = getMonth(calendar);

      const day = getDayButton(month, "5 January");
      await expect.element(page.elementLocator(day)).toHaveAttribute("tabindex", "0");
    });
  });

  describe("tentative date", () => {
    it("can be set", async () => {
      const calendar = await mount(
        <Fixture focusedDate="2024-04-01" tentative="2024-04-19" />
      );
      const month = getMonth(calendar);

      const day = getDayButton(month, "19 April");
      expect(day).toHavePart("selected");
      expect(day).toHavePart("range-start");
      expect(day).toHavePart("range-end");
    });

    it("can be cleared", async () => {
      const calendar = await mount<InstanceType<typeof CalendarRange>>(
        <Fixture focusedDate="2024-04-01" />
      );
      const month = getMonth(calendar);

      await clickDay(month, "19 April");
      expect(calendar.tentative).toBe("2024-04-19");
      await userEvent.keyboard("{ArrowRight}");

      const before = getSelectedDays(month);

      expect(before[0]!).toHavePart("selected");
      expect(before[0]!).toHavePart("range-start");
      expect(before[1]!).toHavePart("selected");
      expect(before[1]!).toHavePart("range-end");

      calendar.tentative = "";
      await calendar.updated;

      const after = getSelectedDays(month);
      expect(after.length).toBe(0);
    });
  });

  describe("grid", () => {
    it("allows arbitrary DOM structure", async () => {
      const calendar = await mount(
        <Fixture value="2020-01-05/2020-01-07">
          <div>
            <div>
              <div>
                <CalendarMonth />
              </div>
            </div>
          </div>
        </Fixture>
      );

      const month = getMonth(calendar);
      const fifth = getDayButton(month, "5 January");
      const sixth = getDayButton(month, "6 January");
      const seventh = getDayButton(month, "7 January");

      await expect.element(getMonthHeading(month)).toHaveTextContent("January");
      await expect.element(page.elementLocator(fifth)).toHaveAttribute("aria-pressed", "true");
      await expect.element(page.elementLocator(sixth)).toHaveAttribute("aria-pressed", "true");
      await expect.element(page.elementLocator(seventh)).toHaveAttribute("aria-pressed", "true");
    });
  });
});
