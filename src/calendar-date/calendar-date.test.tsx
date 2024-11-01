import { expect, nextFrame } from "@open-wc/testing";
import { sendKeys } from "@web/test-runner-commands";
import type { VNodeAny } from "atomico/types/vnode";
import {
  click,
  clickDay,
  createSpy,
  getActiveElement,
  getDayButton,
  getMonthHeading,
  getMonth,
  getMonths,
  getNextPageButton,
  getPrevPageButton,
  mount,
  getCalendarHeading,
  type MonthInstance,
  sendShiftPress,
  getCalendarVisibleHeading,
} from "../utils/test.js";
import { CalendarMonth } from "../calendar-month/calendar-month.js";
import type { Pagination } from "../calendar-base/useCalendarBase.js";
import { CalendarDate } from "./calendar-date.js";
import { PlainYearMonth } from "../utils/temporal.js";
import { today, toDate } from "../utils/date.js";

type TestProps = {
  onchange: (e: Event) => void;
  onfocusday: (e: CustomEvent<Date>) => void;
  value: string;
  min: string;
  max: string;
  children: VNodeAny;
  showOutsideDays: boolean;
  months: number;
  locale: string;
  focusedDate: string;
  pageBy: Pagination;
};

function Fixture({ children, ...props }: Partial<TestProps>): VNodeAny {
  return (
    <CalendarDate locale="en-GB" {...props}>
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

    it("has a label for the group", async () => {
      const calendar = await mount(<Fixture value="2020-01-01" />);
      const group = calendar.shadowRoot!.querySelector("[role='group']");
      expect(group).to.have.attribute("aria-labelledby");

      const yearMonth = toDate(new PlainYearMonth(2020, 1));
      const formatter = new Intl.DateTimeFormat("en-GB", {
        month: "long",
        year: "numeric",
      });

      const heading = getCalendarHeading(calendar);
      expect(heading).to.have.text(formatter.format(yearMonth));
    });

    it("correctly labels a range of months", async () => {
      const calendar = await mount(
        <Fixture months={2} value="2023-12-01">
          <CalendarMonth />
          <CalendarMonth offset={1} />
        </Fixture>
      );

      const start = new PlainYearMonth(2023, 12);
      const end = new PlainYearMonth(2024, 1);
      const formatter = new Intl.DateTimeFormat("en-GB", {
        month: "long",
        year: "numeric",
      });

      const heading = getCalendarHeading(calendar);
      expect(heading).to.have.text(
        formatter.formatRange(toDate(start), toDate(end))
      );
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

  describe("keyboard interaction", () => {
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

  describe("page by", () => {
    describe("months", () => {
      it("can page by months", async () => {
        const calendar = await mount(
          <Fixture value="2020-01-01" months={2}>
            <CalendarMonth />
            <CalendarMonth offset={1} />
          </Fixture>
        );
        const [first, second] = getMonths(calendar) as [
          MonthInstance,
          MonthInstance,
        ];

        await click(getNextPageButton(calendar));
        expect(getMonthHeading(first!)).to.have.text("March");
        expect(getMonthHeading(second!)).to.have.text("April");
      });

      it("updates page as user navigates dates", async () => {
        const calendar = await mount(
          <Fixture value="2020-01-01" months={2}>
            <CalendarMonth />
            <CalendarMonth offset={1} />
          </Fixture>
        );
        const [first, second] = getMonths(calendar) as [
          MonthInstance,
          MonthInstance,
        ];

        // tab to grid
        await sendKeys({ press: "Tab" });
        await sendKeys({ press: "Tab" });
        await sendKeys({ press: "Tab" });

        // move to feb, within page
        await sendKeys({ press: "PageDown" });
        expect(getMonthHeading(first)).to.have.text("January");
        expect(getMonthHeading(second)).to.have.text("February");

        // move to march, out of page
        await sendKeys({ press: "PageDown" });
        expect(getMonthHeading(first)).to.have.text("March");
        expect(getMonthHeading(second)).to.have.text("April");

        // move to april, should be on same page
        await sendKeys({ press: "PageDown" });
        expect(getMonthHeading(first)).to.have.text("March");
        expect(getMonthHeading(second)).to.have.text("April");

        // move to march, within page
        await sendKeys({ press: "PageUp" });
        expect(getMonthHeading(first)).to.have.text("March");
        expect(getMonthHeading(second)).to.have.text("April");

        // move to feb, out of page
        await sendKeys({ press: "PageUp" });
        expect(getMonthHeading(first)).to.have.text("January");
        expect(getMonthHeading(second)).to.have.text("February");

        // move to jan, within page
        await sendKeys({ press: "PageUp" });
        expect(getMonthHeading(first)).to.have.text("January");
        expect(getMonthHeading(second)).to.have.text("February");

        // move to dec, out of page
        await sendKeys({ press: "PageUp" });
        expect(getMonthHeading(first)).to.have.text("November");
        expect(getMonthHeading(second)).to.have.text("December");

        // sanity check
        expect(calendar.focusedDate).to.eq("2019-12-01");

        // move one year ahead
        await sendShiftPress("PageDown");
        expect(getCalendarVisibleHeading(calendar)).to.have.text("2020");
        expect(getMonthHeading(first)).to.have.text("November");
        expect(getMonthHeading(second)).to.have.text("December");

        // move one year back
        await sendShiftPress("PageUp");
        expect(getCalendarVisibleHeading(calendar)).to.have.text("2019");
        expect(getMonthHeading(first)).to.have.text("November");
        expect(getMonthHeading(second)).to.have.text("December");
      });

      it("pages by number of months", async () => {
        const calendar = await mount(
          <Fixture value="2020-01-01" months={2}>
            <CalendarMonth />
            <CalendarMonth offset={1} />
          </Fixture>
        );

        const next = getNextPageButton(calendar);
        const prev = getPrevPageButton(calendar);
        const [first, second] = getMonths(calendar) as [
          MonthInstance,
          MonthInstance,
        ];

        await click(next);
        expect(getMonthHeading(first)).to.have.text("March");
        expect(getMonthHeading(second)).to.have.text("April");

        await click(next);
        expect(getMonthHeading(first)).to.have.text("May");
        expect(getMonthHeading(second)).to.have.text("June");

        await click(prev);
        expect(getMonthHeading(first)).to.have.text("March");
        expect(getMonthHeading(second)).to.have.text("April");

        await click(prev);
        expect(getMonthHeading(first)).to.have.text("January");
        expect(getMonthHeading(second)).to.have.text("February");

        await click(prev);
        expect(getMonthHeading(first)).to.have.text("November");
        expect(getMonthHeading(second)).to.have.text("December");
      });

      it("handles focused date prop changing", async () => {
        const calendar = await mount(
          <Fixture value="2020-01-01" months={2}>
            <CalendarMonth />
            <CalendarMonth offset={1} />
          </Fixture>
        );
        const [first, second] = getMonths(calendar) as [
          MonthInstance,
          MonthInstance,
        ];

        // one year ahead
        calendar.focusedDate = "2021-01-01";
        await nextFrame();
        expect(getMonthHeading(first)).to.have.text("January");
        expect(getMonthHeading(second)).to.have.text("February");
        expect(getCalendarVisibleHeading(calendar)).to.have.text("2021");

        // one month outside of page
        calendar.focusedDate = "2021-03-01";
        await nextFrame();
        expect(getMonthHeading(first)).to.have.text("March");
        expect(getMonthHeading(second)).to.have.text("April");
        expect(getCalendarVisibleHeading(calendar)).to.have.text("2021");

        // a few months ahead
        calendar.focusedDate = "2021-05-01";
        await nextFrame();
        expect(getMonthHeading(first)).to.have.text("May");
        expect(getMonthHeading(second)).to.have.text("June");
        expect(getCalendarVisibleHeading(calendar)).to.have.text("2021");

        // a few months back
        calendar.focusedDate = "2020-12-01";
        await nextFrame();
        expect(getMonthHeading(first)).to.have.text("November");
        expect(getMonthHeading(second)).to.have.text("December");
        expect(getCalendarVisibleHeading(calendar)).to.have.text("2020");
      });
    });

    describe("single", () => {
      it("updates page as user navigates dates", async () => {
        const calendar = await mount(
          <Fixture value="2020-01-01" months={2} pageBy="single">
            <CalendarMonth />
            <CalendarMonth offset={1} />
          </Fixture>
        );

        const [first, second] = getMonths(calendar) as [
          MonthInstance,
          MonthInstance,
        ];

        // tab to grid
        await sendKeys({ press: "Tab" });
        await sendKeys({ press: "Tab" });
        await sendKeys({ press: "Tab" });

        // move to feb, within page
        await sendKeys({ press: "PageDown" });
        expect(getMonthHeading(first)).to.have.text("January");
        expect(getMonthHeading(second)).to.have.text("February");

        // move to march, out of page
        await sendKeys({ press: "PageDown" });
        expect(getMonthHeading(first)).to.have.text("February");
        expect(getMonthHeading(second)).to.have.text("March");

        // move to april, should be on same page
        await sendKeys({ press: "PageDown" });
        expect(getMonthHeading(first)).to.have.text("March");
        expect(getMonthHeading(second)).to.have.text("April");

        // move to march, within page
        await sendKeys({ press: "PageUp" });
        expect(getMonthHeading(first)).to.have.text("March");
        expect(getMonthHeading(second)).to.have.text("April");

        // move to feb, out of page
        await sendKeys({ press: "PageUp" });
        expect(getMonthHeading(first)).to.have.text("February");
        expect(getMonthHeading(second)).to.have.text("March");

        // move to jan, within page
        await sendKeys({ press: "PageUp" });
        expect(getMonthHeading(first)).to.have.text("January");
        expect(getMonthHeading(second)).to.have.text("February");

        // move to dec, out of page
        await sendKeys({ press: "PageUp" });
        expect(getMonthHeading(first)).to.have.text("December");
        expect(getMonthHeading(second)).to.have.text("January");

        // sanity check
        expect(calendar.focusedDate).to.eq("2019-12-01");

        // move one year ahead
        await sendShiftPress("PageDown");
        expect(getCalendarVisibleHeading(calendar)).to.have.text("2020–2021");
        expect(getMonthHeading(first)).to.have.text("December");
        expect(getMonthHeading(second)).to.have.text("January");

        // move one year back
        await sendShiftPress("PageUp");
        expect(getMonthHeading(first)).to.have.text("December");
        expect(getCalendarVisibleHeading(calendar)).to.have.text("2019–2020");
        expect(getMonthHeading(second)).to.have.text("January");
      });

      it("pages by single month", async () => {
        const calendar = await mount(
          <Fixture value="2020-01-01" months={2} pageBy="single">
            <CalendarMonth />
            <CalendarMonth offset={1} />
          </Fixture>
        );
        const [first, second] = getMonths(calendar) as [
          MonthInstance,
          MonthInstance,
        ];

        const next = getNextPageButton(calendar);
        const prev = getPrevPageButton(calendar);

        await click(next);
        expect(getMonthHeading(first)).to.have.text("February");
        expect(getMonthHeading(second)).to.have.text("March");

        await click(next);
        expect(getMonthHeading(first)).to.have.text("March");
        expect(getMonthHeading(second)).to.have.text("April");

        await click(prev);
        expect(getMonthHeading(first)).to.have.text("February");
        expect(getMonthHeading(second)).to.have.text("March");

        await click(prev);
        expect(getMonthHeading(first)).to.have.text("January");
        expect(getMonthHeading(second)).to.have.text("February");

        await click(prev);
        expect(getMonthHeading(first)).to.have.text("December");
        expect(getMonthHeading(second)).to.have.text("January");
      });

      it("handles focused date prop changing", async () => {
        const calendar = await mount(
          <Fixture value="2020-01-01" months={2} pageBy="single">
            <CalendarMonth />
            <CalendarMonth offset={1} />
          </Fixture>
        );
        const [first, second] = getMonths(calendar) as [
          MonthInstance,
          MonthInstance,
        ];

        // one year ahead
        calendar.focusedDate = "2021-01-01";
        await nextFrame();
        expect(getMonthHeading(first)).to.have.text("January");
        expect(getMonthHeading(second)).to.have.text("February");
        expect(getCalendarVisibleHeading(calendar)).to.have.text("2021");

        // one month outside of page
        calendar.focusedDate = "2021-03-01";
        await nextFrame();
        expect(getMonthHeading(first)).to.have.text("February");
        expect(getMonthHeading(second)).to.have.text("March");
        expect(getCalendarVisibleHeading(calendar)).to.have.text("2021");

        // a few months ahead
        calendar.focusedDate = "2021-05-01";
        await nextFrame();
        expect(getMonthHeading(first)).to.have.text("April");
        expect(getMonthHeading(second)).to.have.text("May");
        expect(getCalendarVisibleHeading(calendar)).to.have.text("2021");

        // a few months back
        calendar.focusedDate = "2020-12-01";
        await nextFrame();
        expect(getMonthHeading(first)).to.have.text("December");
        expect(getMonthHeading(second)).to.have.text("January");
        expect(getCalendarVisibleHeading(calendar)).to.have.text("2020–2021");
      });
    });
  });

  describe("events", () => {
    it("raises a focusday event", async () => {
      const spy = createSpy<(e: CustomEvent<Date>) => void>();
      const calendar = await mount(
        <Fixture value="2022-01-01" onfocusday={spy} />
      );

      // click next button
      await click(getNextPageButton(calendar));

      expect(spy.count).to.eq(1);
      expect(spy.last[0].detail).to.eql(new Date("2022-02-01"));
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

      expect(getActiveElement()).to.eq(getNextPageButton(calendar));
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
      await nextFrame();

      expect(spy.count).to.eq(1);
      expect(calendar.value).to.eq("2020-02-01");

      // get the clicked day
      const button = getDayButton(month, "1 February");
      expect(getActiveElement()).to.eq(button);
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
    it("supports multiple months", async () => {
      const calendar = await mount(
        <Fixture value="2020-01-01" months={2}>
          <CalendarMonth />
          <CalendarMonth offset={1} />
        </Fixture>
      );

      const [first, second] = getMonths(calendar);
      expect(getMonthHeading(first!)).to.have.text("January");
      expect(getMonthHeading(second!)).to.have.text("February");
    });

    it("respects `months` when paginating", async () => {
      const calendar = await mount(
        <Fixture value="2020-01-01" months={2}>
          <CalendarMonth />
          <CalendarMonth offset={1} />
        </Fixture>
      );

      const [first, second] = getMonths(calendar);

      await click(getNextPageButton(calendar));
      expect(getMonthHeading(first!)).to.have.text("March");
      expect(getMonthHeading(second!)).to.have.text("April");

      await click(getPrevPageButton(calendar));
      expect(getMonthHeading(first!)).to.have.text("January");
      expect(getMonthHeading(second!)).to.have.text("February");
    });
  });

  describe("focused date", () => {
    it("defaults to `value` if not set", async () => {
      const calendar = await mount(<Fixture value="2020-01-01" />);
      const day = getDayButton(getMonth(calendar), "1 January");
      expect(day).to.have.attribute("tabindex", "0");
    });

    it("defaults to today if no value set", async () => {
      const calendar = await mount(<Fixture />);
      const todaysDate = toDate(today());
      const month = getMonth(calendar);

      const heading = getMonthHeading(month);
      expect(heading).to.have.text(
        todaysDate.toLocaleDateString("en-GB", {
          month: "long",
        })
      );

      const button = getDayButton(
        month,
        todaysDate.toLocaleDateString("en-GB", {
          month: "long",
          day: "numeric",
        })
      );
      expect(button).to.have.attribute("tabindex", "0");
    });

    it("can be changed via props", async () => {
      const calendar = await mount(
        <Fixture value="2020-01-01" focusedDate="2020-02-15" />
      );
      const month = getMonth(calendar);

      const day = getDayButton(month, "15 February");
      expect(day).to.have.attribute("tabindex", "0");

      calendar.focusedDate = "2020-04-15";
      await nextFrame();

      const newDay = getDayButton(month, "15 April");
      expect(newDay).to.have.attribute("tabindex", "0");
    });

    it("updates as user navigates", async () => {
      const calendar = await mount(
        <Fixture value="2020-01-01" focusedDate="2020-02-15" />
      );
      const month = getMonth(calendar);

      await click(getPrevPageButton(calendar));

      const day = getDayButton(month, "15 January");
      expect(day).to.have.attribute("tabindex", "0");
      expect(calendar.focusedDate).to.eq("2020-01-15");
    });
  });

  describe("localization", () => {
    it("localizes heading", async () => {
      const calendar = await mount(
        <Fixture value="2020-01-01" locale="de-DE" />
      );

      const heading = getCalendarHeading(calendar);
      expect(heading).to.have.text("Januar 2020");

      await click(getNextPageButton(calendar));
      expect(heading).to.have.text("Februar 2020");

      await click(getNextPageButton(calendar));
      expect(heading).to.have.text("März 2020");

      await click(getNextPageButton(calendar));
      expect(heading).to.have.text("April 2020");

      await click(getNextPageButton(calendar));
      expect(heading).to.have.text("Mai 2020");

      await click(getNextPageButton(calendar));
      expect(heading).to.have.text("Juni 2020");

      await click(getNextPageButton(calendar));
      expect(heading).to.have.text("Juli 2020");

      await click(getNextPageButton(calendar));
      expect(heading).to.have.text("August 2020");

      await click(getNextPageButton(calendar));
      expect(heading).to.have.text("September 2020");

      await click(getNextPageButton(calendar));
      expect(heading).to.have.text("Oktober 2020");

      await click(getNextPageButton(calendar));
      expect(heading).to.have.text("November 2020");

      await click(getNextPageButton(calendar));
      expect(heading).to.have.text("Dezember 2020");
    });
  });

  describe("grid", () => {
    it("allows arbitrary DOM structure", async () => {
      const calendar = await mount(
        <Fixture value="2020-01-01">
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
      const firstJan = getDayButton(month, "1 January");

      expect(getMonthHeading(month)).to.have.text("January");
      expect(firstJan).to.have.attribute("aria-pressed", "true");
    });
  });
});
