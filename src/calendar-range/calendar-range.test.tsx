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
      const spy = createSpy<(e: CustomEvent<Date>) => void>();
      const calendar = await mount(
        <Fixture value="2022-01-01/2022-01-01" onfocusday={spy} />
      );

      // click next button
      await click(getNextPageButton(calendar));

      expect(spy.count).to.eq(1);
      expect(spy.last[0].detail).to.eql(new Date("2022-02-01"));
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
      expect(startSpy.count).to.eq(1);
      expect(startSpy.last[0].detail).to.eql(new Date("2021-12-31"));
      expect(endSpy.called).to.eq(false);

      await clickDay(month, "30 December");
      expect(startSpy.count).to.eq(1);
      expect(endSpy.count).to.eq(1);
      expect(endSpy.last[0].detail).to.eql(new Date("2021-12-30"));
    });
  });

  describe("focused date", () => {
    it("defaults to the first date in the range if not set", async () => {
      const calendar = await mount(<Fixture value="2020-01-05/2020-01-10" />);
      const month = getMonth(calendar);

      const day = getDayButton(month, "5 January");
      expect(day).to.have.attribute("tabindex", "0");
    });
  });

  describe("tentative date", () => {
    it("can be set", async () => {
      const calendar = await mount(
        <Fixture focusedDate="2024-04-01" tentative="2024-04-19" />
      );
      const month = getMonth(calendar);

      const day = getDayButton(month, "19 April");
      expect(day.part.contains("selected")).to.eq(true);
      expect(day.part.contains("range-start")).to.eq(true);
      expect(day.part.contains("range-end")).to.eq(true);
    });

    it("can be cleared", async () => {
      const calendar = await mount<InstanceType<typeof CalendarRange>>(
        <Fixture focusedDate="2024-04-01" />
      );
      const month = getMonth(calendar);

      await clickDay(month, "19 April");
      expect(calendar.tentative).to.eq("2024-04-19");
      await sendKeys({ press: "ArrowRight" });

      const before = getSelectedDays(month);

      expect(before[0]!.part.contains("selected")).to.eq(true);
      expect(before[0]!.part.contains("range-start")).to.eq(true);
      expect(before[1]!.part.contains("selected")).to.eq(true);
      expect(before[1]!.part.contains("range-end")).to.eq(true);

      calendar.tentative = "";
      await calendar.updated;

      const after = getSelectedDays(month);
      expect(after).to.have.length(0);
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

      expect(getMonthHeading(month)).to.have.text("January");
      expect(fifth).to.have.attribute("aria-pressed", "true");
      expect(sixth).to.have.attribute("aria-pressed", "true");
      expect(seventh).to.have.attribute("aria-pressed", "true");
    });
  });
});
