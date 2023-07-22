import { expect } from "@open-wc/testing";
import { sendKeys } from "@web/test-runner-commands";
import type { VNodeAny } from "atomico/types/vnode.js";
import {
  click,
  clickDay,
  createSpy,
  getMonth,
  getNextPageButton,
  getPrevPageButton,
  mount,
} from "../utils/test.js";

import { CalendarMonth } from "../calendar-month/calendar-month.js";
import { CalendarRange } from "./calendar-range.js";

type TestProps = {
  onchange: (e: Event) => void;
  onfocusday: (e: CustomEvent<string>) => void;
  value: string;
  min: string;
  max: string;
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
    expect(calendar).to.be.instanceOf(CalendarRange);
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

      expect(spy.count).to.eq(1);
      expect(spy.last[0].target.value).to.eq("2020-04-19/2020-04-22");
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

      expect(spy.count).to.eq(1);
      expect(spy.last[0].target.value).to.eq("2020-04-19/2020-04-22");
    });
  });

  describe("keyboard interaction", () => {
    it("can select a range: start -> end", async () => {
      const spy = createSpy();
      await mount(<Fixture value="2020-01-01/2020-01-01" onchange={spy} />);

      // tab to next page
      await sendKeys({ press: "Tab" });
      await sendKeys({ press: "Tab" });

      // set month to april
      await sendKeys({ press: "Enter" });
      await sendKeys({ press: "Enter" });
      await sendKeys({ press: "Enter" });

      // tab to grid
      await sendKeys({ press: "Tab" });

      // select 19th of month
      await sendKeys({ press: "ArrowDown" });
      await sendKeys({ press: "ArrowDown" });
      await sendKeys({ press: "ArrowRight" });
      await sendKeys({ press: "ArrowRight" });
      await sendKeys({ press: "ArrowRight" });
      await sendKeys({ press: "ArrowRight" });
      await sendKeys({ press: "Enter" });

      // select 22nd of month
      await sendKeys({ press: "ArrowRight" });
      await sendKeys({ press: "ArrowRight" });
      await sendKeys({ press: "ArrowRight" });
      await sendKeys({ press: "Enter" });

      expect(spy.count).to.eq(1);
      expect(spy.last[0].target.value).to.eq("2020-04-19/2020-04-22");
    });

    it("can select a range: end -> start", async () => {
      const spy = createSpy();
      await mount(<Fixture value="2020-01-01/2020-01-01" onchange={spy} />);

      // tab to next page
      await sendKeys({ press: "Tab" });
      await sendKeys({ press: "Tab" });

      // set month to april
      await sendKeys({ press: "Enter" });
      await sendKeys({ press: "Enter" });
      await sendKeys({ press: "Enter" });

      // tab to grid
      await sendKeys({ press: "Tab" });

      // select 22nd of month
      await sendKeys({ press: "ArrowDown" });
      await sendKeys({ press: "ArrowDown" });
      await sendKeys({ press: "ArrowDown" });
      await sendKeys({ press: "Enter" });

      // select 19th of month
      await sendKeys({ press: "ArrowLeft" });
      await sendKeys({ press: "ArrowLeft" });
      await sendKeys({ press: "ArrowLeft" });
      await sendKeys({ press: "Enter" });

      expect(spy.count).to.eq(1);
      expect(spy.last[0].target.value).to.eq("2020-04-19/2020-04-22");
    });
  });

  describe("events", () => {
    it("raises a focusday event", async () => {
      const spy = createSpy<(e: CustomEvent<string>) => void>();
      const calendar = await mount(
        <Fixture value="2022-01-01/2022-01-01" onfocusday={spy} />
      );

      // click next button
      await click(getNextPageButton(calendar));

      expect(spy.count).to.eq(1);
      expect(spy.last[0].detail).to.eq("2022-02-01");
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

      expect(spy.count).to.eq(1);
      const target = spy.last[0].target as InstanceType<typeof CalendarRange>;
      expect(target.value).to.eq("2021-12-30/2021-12-31");
    });

    it("raises a selectionstart event");
    it("raises a selectionend event");
  });

  describe("multiple months", () => {
    it("supports multiple months", async () => {
      // ...
    });
    it("supports a year", async () => {
      // ...
    });
    it("paginates with respect to duration", async () => {
      // ...
    });
  });

  describe("localization", () => {
    it("localizes all days, months, years");
  });

  describe("methods", () => {
    it("allows focusing today");
    it("allows setting a month");
    it("allows setting a year");
  });

  describe("custom layout", () => {
    describe("header", () => {
      it("allows arbitrary DOM structure");
      it("allow configurable formatting options");
    });

    describe("grid", () => {
      it("allows arbitrary DOM structure");
    });
  });
});
