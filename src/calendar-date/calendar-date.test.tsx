import { expect } from "@open-wc/testing";
import { sendKeys } from "@web/test-runner-commands";
import type { VNodeAny } from "atomico/types/vnode.js";
import {
  click,
  clickDay,
  createSpy,
  getDayButton,
  getMonth,
  getNextPageButton,
  getPrevPageButton,
  mount,
} from "../utils/test.js";

import { CalendarMonth } from "../calendar-month/calendar-month.js";
import { CalendarDate } from "./calendar-date.js";
import type { PlainDate } from "../utils/PlainDate.js";

type TestProps = {
  onchange: (e: Event) => void;
  onfocusday: (e: CustomEvent<PlainDate>) => void;
  value: string;
  min: string;
  max: string;
  children?: VNodeAny;
  showOutsideDays?: boolean;
};

function Fixture({ children, ...props }: Partial<TestProps>): VNodeAny {
  return (
    <CalendarDate {...props} locale="en-GB">
      {children ?? <CalendarMonth />}
    </CalendarDate>
  );
}

describe("CalendarDate", () => {
  it("is defined", async () => {
    const calendar = await mount(<Fixture />);
    expect(calendar).to.be.instanceOf(CalendarDate);
  });

  describe("a11y", () => {
    describe("controls", () => {
      it("has a label for next page button", async () => {
        const calendar = await mount(<Fixture />);
        expect(getNextPageButton(calendar)).to.have.text("Next");
      });

      it("has a label for previous page button", async () => {
        const calendar = await mount(<Fixture />);
        expect(getPrevPageButton(calendar)).to.have.text("Previous");
      });
    });
  });

  describe("mouse interaction", () => {
    it("can select a date in the future", async () => {
      const spy = createSpy();
      const calendar = await mount(
        <Fixture value="2020-01-01" onchange={spy} />
      );
      const month = getMonth(calendar);
      const nextMonth = getNextPageButton(calendar);

      await click(nextMonth);
      await click(nextMonth);
      await click(nextMonth);
      await clickDay(month, "19 April");

      expect(spy.count).to.eq(1);
      expect(calendar.value).to.eq("2020-04-19");
    });

    it("can select a date in the past", async () => {
      const spy = createSpy();
      const calendar = await mount(
        <Fixture value="2020-01-01" onchange={spy} />
      );
      const month = getMonth(calendar);

      await click(getPrevPageButton(calendar));
      await click(getPrevPageButton(calendar));
      await clickDay(month, "19 November");

      expect(spy.count).to.eq(1);
      expect(calendar.value).to.eq("2019-11-19");
    });
  });

  describe.skip("keyboard interaction", () => {
    it("can select a date in the future", async () => {
      const spy = createSpy();
      await mount(<Fixture value="2020-01-01" onchange={spy} />);

      // tab to next page
      await sendKeys({ press: "Tab" });
      await sendKeys({ press: "Tab" });

      // set month to april
      await sendKeys({ press: "Enter" });
      await sendKeys({ press: "Enter" });
      await sendKeys({ press: "Enter" });

      // tab to grid
      await sendKeys({ press: "Tab" });

      // tab to grid, select 19th of month
      await sendKeys({ press: "ArrowDown" });
      await sendKeys({ press: "ArrowDown" });
      await sendKeys({ press: "ArrowRight" });
      await sendKeys({ press: "ArrowRight" });
      await sendKeys({ press: "ArrowRight" });
      await sendKeys({ press: "ArrowRight" });
      await sendKeys({ press: "Enter" });

      expect(spy.count).to.eq(1);
      expect(spy.last[0].target.value).to.eq("2020-04-19");
    });

    it("can select a date in the past", async () => {
      const spy = createSpy();
      await mount(<Fixture value="2019-05-01" onchange={spy} />);

      await sendKeys({ press: "Tab" });

      // set month to April
      await sendKeys({ press: "Enter" });

      // tab to grid
      await sendKeys({ press: "Tab" });
      await sendKeys({ press: "Tab" });

      // select date 19th of month
      await sendKeys({ press: "ArrowDown" });
      await sendKeys({ press: "ArrowDown" });
      await sendKeys({ press: "ArrowRight" });
      await sendKeys({ press: "ArrowRight" });
      await sendKeys({ press: "ArrowRight" });
      await sendKeys({ press: "ArrowRight" });
      await sendKeys({ press: "Enter" });

      expect(spy.count).to.eq(1);
      expect(spy.last[0].target.value).to.eq("2019-04-19");
    });

    it("supports navigating to disabled dates", async () => {
      const spy = createSpy();
      const calendar = await mount(
        <Fixture value="2020-01-01" onchange={spy} />
      );

      // disable weekends
      calendar.isDateDisallowed = function isWeekend(date) {
        return date.getDay() === 0 || date.getDay() === 6;
      };

      // tab to next page button
      await sendKeys({ press: "Tab" });
      await sendKeys({ press: "Tab" });

      // set month to april
      await sendKeys({ press: "Enter" });
      await sendKeys({ press: "Enter" });
      await sendKeys({ press: "Enter" });

      // tab to grid
      await sendKeys({ press: "Tab" });

      // navigate to 2. april thursday
      await sendKeys({ press: "ArrowRight" });
      // navigate to 3. april friday
      await sendKeys({ press: "ArrowRight" });
      // navigate to 4. april saturday
      await sendKeys({ press: "ArrowRight" });

      await sendKeys({ press: "Enter" });
      expect(spy.called).to.eq(false);

      // navigate to 5. april sunday
      await sendKeys({ press: "ArrowRight" });

      await sendKeys({ press: "Enter" });
      expect(spy.called).to.eq(false);

      // navigate to 6. april monday
      await sendKeys({ press: "ArrowRight" });

      await sendKeys({ press: "Enter" });

      expect(spy.count).to.eq(1);
      expect(calendar.value).to.eq("2020-04-06");
    });
  });

  describe("events", () => {
    it("raises a focusday event", async () => {
      const spy = createSpy<(e: CustomEvent<PlainDate>) => void>();
      const calendar = await mount(
        <Fixture value="2022-01-01" onfocusday={spy} />
      );

      // click next button
      await click(getNextPageButton(calendar));

      expect(spy.count).to.eq(1);
      expect(spy.last[0].detail.toString()).to.eq("2022-02-01");
    });

    it("raises a change event", async () => {
      const spy = createSpy<(e: Event) => void>();
      const calendar = await mount(
        <Fixture value="2022-01-01" onchange={spy} />
      );
      const month = getMonth(calendar);

      await click(getPrevPageButton(calendar));
      await clickDay(month, "31 December");

      expect(spy.count).to.eq(1);
      const target = spy.last[0].target as InstanceType<typeof CalendarDate>;
      expect(target.value).to.eq("2021-12-31");
    });
  });

  describe("focus management", () => {
    it("doesn't shift focus when interacting with next/prev buttons", async () => {
      const calendar = await mount(
        <Fixture value="2020-01-01">
          <CalendarMonth />
        </Fixture>
      );

      // tab to next page, click
      await sendKeys({ press: "Tab" });
      await sendKeys({ press: "Tab" });
      await sendKeys({ press: "Enter" });

      expect(getNextPageButton(calendar)).to.match(":focus-within");
    });

    it("moves focus to the selected date when clicking outside of the month", async () => {
      const spy = createSpy();
      const calendar = await mount(
        <Fixture value="2020-01-01" onchange={spy} showOutsideDays>
          <CalendarMonth />
        </Fixture>
      );
      const month = getMonth(calendar);

      // try clicking a day outside the range
      await clickDay(month, "1 February");
      await calendar.updated;

      expect(spy.count).to.eq(1);
      expect(calendar.value).to.eq("2020-02-01");

      // get the clicked day
      const button = getDayButton(month, "1 February");
      expect(button).to.match(":focus-within");
      expect(button.tabIndex).to.eq(0);
    });
  });

  describe("min/max support", () => {
    it("disables prev month button if same month and year as min", async () => {
      const calendar = await mount(
        <Fixture value="2020-04-19" min="2020-04-01" />
      );

      const prevMonthButton = getPrevPageButton(calendar);
      expect(prevMonthButton).to.have.attribute("aria-disabled");
    });

    it("disables next month button if same month and year as max", async () => {
      const calendar = await mount(
        <Fixture value="2020-04-19" max="2020-04-30" />
      );

      const nextMonthButton = getNextPageButton(calendar);
      expect(nextMonthButton).to.have.attribute("aria-disabled");
    });
  });

  describe("multiple months", () => {
    it("supports multiple months");
    it("supports a year");
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
