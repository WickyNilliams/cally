import { expect } from "@open-wc/testing";
import { sendKeys } from "@web/test-runner-commands";
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
  mount,
} from "../utils/test.js";

import { CalendarMonth } from "../calendar-month/calendar-month.js";
import { CalendarMulti } from "./calendar-multi.js";

type TestProps = {
  onchange: (e: Event) => void;
  onfocusday: (e: CustomEvent<Date>) => any;
  value: string;
  min: string;
  max: string;
  months?: number;
  children?: VNodeAny;
};

function Fixture({ children, ...props }: Partial<TestProps>): VNodeAny {
  return (
    <CalendarMulti {...props} locale="en-GB">
      {children ?? <CalendarMonth />}
    </CalendarMulti>
  );
}

describe("CalendarMulti", () => {
  it("is defined", async () => {
    const calendar = await mount(<Fixture />);
    expect(calendar).to.be.instanceOf(CalendarMulti);
  });

  describe("mouse interaction", () => {
    it("can select a multiple days", async () => {
      const spy = createSpy<(e: Event) => void>();
      const calendar = await mount(
        <Fixture value="2020-01-01 2020-01-03" onchange={spy} />
      );

      const month = getMonth(calendar);
      const nextMonth = getNextPageButton(calendar);

      // to april
      await click(nextMonth);
      await click(nextMonth);
      await click(nextMonth);

      await clickDay(month, "19 April");
      expect(spy.count).to.eq(1);
      expect(calendar.value).to.eq("2020-01-01 2020-01-03 2020-04-19");

      await clickDay(month, "22 April");
      expect(spy.count).to.eq(2);
      expect(calendar.value).to.eq(
        "2020-01-01 2020-01-03 2020-04-19 2020-04-22"
      );

      // deselect
      await clickDay(month, "22 April");
      expect(spy.count).to.eq(3);
      expect(calendar.value).to.eq("2020-01-01 2020-01-03 2020-04-19");
    });
  });

  describe("keyboard interaction", () => {
    it("can select multiple days", async () => {
      const spy = createSpy();
      await mount(<Fixture value="2020-01-01 2020-01-03" onchange={spy} />);

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

      expect(spy.count).to.eq(1);
      expect(spy.last[0].target.value).to.eq(
        "2020-01-01 2020-01-03 2020-04-19"
      );

      // select 22nd of month
      await sendKeys({ press: "ArrowRight" });
      await sendKeys({ press: "ArrowRight" });
      await sendKeys({ press: "ArrowRight" });
      await sendKeys({ press: "Enter" });

      expect(spy.count).to.eq(2);
      expect(spy.last[0].target.value).to.eq(
        "2020-01-01 2020-01-03 2020-04-19 2020-04-22"
      );

      // deselect 22nd of month
      await sendKeys({ press: "Enter" });
      expect(spy.count).to.eq(3);
      expect(spy.last[0].target.value).to.eq(
        "2020-01-01 2020-01-03 2020-04-19"
      );
    });
  });

  describe("events", () => {
    it("raises a change event", async () => {
      const spy = createSpy<(e: Event) => void>();
      const calendar = await mount(
        <Fixture value="2022-01-01 2022-01-03" onchange={spy} />
      );

      const month = getMonth(calendar);
      await click(getPrevPageButton(calendar));

      await clickDay(month, "31 December");
      expect(spy.count).to.eq(1);
      expect(calendar.value).to.eq("2022-01-01 2022-01-03 2021-12-31");

      await clickDay(month, "30 December");
      expect(spy.count).to.eq(2);
      expect(calendar.value).to.eq(
        "2022-01-01 2022-01-03 2021-12-31 2021-12-30"
      );
    });
  });

  describe("focused date", () => {
    it("defaults to the first date in the list if not set", async () => {
      const calendar = await mount(<Fixture value="2020-01-05 2020-01-10" />);
      const month = getMonth(calendar);

      const day = getDayButton(month, "5 January");
      expect(day).to.have.attribute("tabindex", "0");
    });
  });

  describe("grid", () => {
    it("allows arbitrary DOM structure", async () => {
      const calendar = await mount(
        <Fixture value="2020-01-05 2020-01-10">
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
      const tenth = getDayButton(month, "10 January");

      expect(getMonthHeading(month)).to.have.text("January");
      expect(fifth).to.have.attribute("aria-pressed", "true");
      expect(tenth).to.have.attribute("aria-pressed", "true");
    });
  });
});
