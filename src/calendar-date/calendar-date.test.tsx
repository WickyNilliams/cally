import { describe, it, expect } from "vitest";
import { userEvent, page } from "vitest/browser";
import type { VNodeAny } from "atomico/types/vnode";
import {
  clickDay,
  createSpy,
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
import { PlainDate, PlainYearMonth } from "../utils/temporal.js";
import { getToday, toDate } from "../utils/date.js";

async function nextFrame() {
  return new Promise((resolve) => requestAnimationFrame(() => resolve(undefined)));
}

type TestProps = {
  onchange: (e: Event) => void;
  onfocusday: (e: CustomEvent<Date>) => void;
  value: string;
  min: string;
  max: string;
  today: string;
  children: VNodeAny[];
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
    expect(calendar).toBeInstanceOf(CalendarDate);
  });

  describe("a11y", () => {
    describe("controls", () => {
      it("has a label for next page button", async () => {
        const calendar = await mount(<Fixture />);
        await expect.element(getNextPageButton(calendar)).toHaveTextContent("Next");
      });

      it("has a label for previous page button", async () => {
        const calendar = await mount(<Fixture />);
        await expect.element(getPrevPageButton(calendar)).toHaveTextContent("Previous");
      });
    });

    it("has a label for the group", async () => {
      const calendar = await mount(<Fixture value="2020-01-01" />);
      const group = calendar.shadowRoot!.querySelector("[role='group']");
      expect(group!.hasAttribute("aria-labelledby")).toBe(true);

      const yearMonth = toDate(new PlainYearMonth(2020, 1));
      const formatter = new Intl.DateTimeFormat("en-GB", {
        month: "long",
        year: "numeric",
      });

      const heading = getCalendarHeading(calendar);
      await expect.element(heading).toHaveTextContent(formatter.format(yearMonth));
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

      // Use poll() instead of toHaveTextContent() because the formatter output
      // contains unicode characters (en-dash "–") that toHaveTextContent() normalizes
      // differently, causing false negatives. poll() does direct string comparison.
      await expect.poll(() => {
        const group = calendar.shadowRoot!.querySelector(`[role="group"]`)!;
        const labelledById = group.getAttribute("aria-labelledby")!;
        const heading = calendar.shadowRoot!.getElementById(labelledById)!;
        return heading.textContent;
      }).toBe(formatter.formatRange(toDate(start), toDate(end)));
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

      await nextMonth.click();
      await nextMonth.click();
      await nextMonth.click();
      await clickDay(month, "19 April");

      expect(spy.count).toBe(1);
      expect(calendar.value).toBe("2020-04-19");
    });

    it("can select a date in the past", async () => {
      const spy = createSpy();
      const calendar = await mount(
        <Fixture value="2020-01-01" onchange={spy} />
      );
      const month = getMonth(calendar);

      await getPrevPageButton(calendar).click();
      await getPrevPageButton(calendar).click();
      await clickDay(month, "19 November");

      expect(spy.count).toBe(1);
      expect(calendar.value).toBe("2019-11-19");
    });
  });

  describe("keyboard interaction", () => {
    it("can select a date in the future", async () => {
      const spy = createSpy();
      await mount(<Fixture value="2020-01-01" onchange={spy} />);

      // tab to next page
      await userEvent.keyboard("{Tab}");
      await userEvent.keyboard("{Tab}");

      // set month to april
      await userEvent.keyboard("{Enter}");
      await userEvent.keyboard("{Enter}");
      await userEvent.keyboard("{Enter}");

      // tab to grid
      await userEvent.keyboard("{Tab}");

      // tab to grid, select 19th of month
      await userEvent.keyboard("{ArrowDown}");
      await userEvent.keyboard("{ArrowDown}");
      await userEvent.keyboard("{ArrowRight}");
      await userEvent.keyboard("{ArrowRight}");
      await userEvent.keyboard("{ArrowRight}");
      await userEvent.keyboard("{ArrowRight}");
      await userEvent.keyboard("{Enter}");

      expect(spy.count).toBe(1);
      expect(spy.last[0].target.value).toBe("2020-04-19");
    });

    it("can select a date in the past", async () => {
      const spy = createSpy();
      await mount(<Fixture value="2019-05-01" onchange={spy} />);

      await userEvent.keyboard("{Tab}");

      // set month to April
      await userEvent.keyboard("{Enter}");

      // tab to grid
      await userEvent.keyboard("{Tab}");
      await userEvent.keyboard("{Tab}");

      // select date 19th of month
      await userEvent.keyboard("{ArrowDown}");
      await userEvent.keyboard("{ArrowDown}");
      await userEvent.keyboard("{ArrowRight}");
      await userEvent.keyboard("{ArrowRight}");
      await userEvent.keyboard("{ArrowRight}");
      await userEvent.keyboard("{ArrowRight}");
      await userEvent.keyboard("{Enter}");

      expect(spy.count).toBe(1);
      expect(spy.last[0].target.value).toBe("2019-04-19");
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
      await userEvent.keyboard("{Tab}");
      await userEvent.keyboard("{Tab}");

      // set month to april
      await userEvent.keyboard("{Enter}");
      await userEvent.keyboard("{Enter}");
      await userEvent.keyboard("{Enter}");

      // tab to grid
      await userEvent.keyboard("{Tab}");

      // navigate to 2. april thursday
      await userEvent.keyboard("{ArrowRight}");
      // navigate to 3. april friday
      await userEvent.keyboard("{ArrowRight}");
      // navigate to 4. april saturday
      await userEvent.keyboard("{ArrowRight}");

      await userEvent.keyboard("{Enter}");
      expect(spy.called).toBe(false);

      // navigate to 5. april sunday
      await userEvent.keyboard("{ArrowRight}");

      await userEvent.keyboard("{Enter}");
      expect(spy.called).toBe(false);

      // navigate to 6. april monday
      await userEvent.keyboard("{ArrowRight}");

      await userEvent.keyboard("{Enter}");

      expect(spy.count).toBe(1);
      expect(calendar.value).toBe("2020-04-06");
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

        await getNextPageButton(calendar).click();
        await expect.element(getMonthHeading(first!)).toHaveTextContent("March");
        await expect.element(getMonthHeading(second!)).toHaveTextContent("April");
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
        await userEvent.keyboard("{Tab}");
        await userEvent.keyboard("{Tab}");
        await userEvent.keyboard("{Tab}");

        // move to feb, within page
        await userEvent.keyboard("{PageDown}");
        await expect.element(getMonthHeading(first)).toHaveTextContent("January");
        await expect.element(getMonthHeading(second)).toHaveTextContent("February");

        // move to march, out of page
        await userEvent.keyboard("{PageDown}");
        await expect.element(getMonthHeading(first)).toHaveTextContent("March");
        await expect.element(getMonthHeading(second)).toHaveTextContent("April");

        // move to april, should be on same page
        await userEvent.keyboard("{PageDown}");
        await expect.element(getMonthHeading(first)).toHaveTextContent("March");
        await expect.element(getMonthHeading(second)).toHaveTextContent("April");

        // move to march, within page
        await userEvent.keyboard("{PageUp}");
        await expect.element(getMonthHeading(first)).toHaveTextContent("March");
        await expect.element(getMonthHeading(second)).toHaveTextContent("April");

        // move to feb, out of page
        await userEvent.keyboard("{PageUp}");
        await expect.element(getMonthHeading(first)).toHaveTextContent("January");
        await expect.element(getMonthHeading(second)).toHaveTextContent("February");

        // move to jan, within page
        await userEvent.keyboard("{PageUp}");
        await expect.element(getMonthHeading(first)).toHaveTextContent("January");
        await expect.element(getMonthHeading(second)).toHaveTextContent("February");

        // move to dec, out of page
        await userEvent.keyboard("{PageUp}");
        await expect.element(getMonthHeading(first)).toHaveTextContent("November");
        await expect.element(getMonthHeading(second)).toHaveTextContent("December");

        // sanity check
        expect(calendar.focusedDate).toBe("2019-12-01");

        // move one year ahead
        await sendShiftPress("PageDown");
        await expect.element(getCalendarVisibleHeading(calendar)).toHaveTextContent("2020");
        await expect.element(getMonthHeading(first)).toHaveTextContent("November");
        await expect.element(getMonthHeading(second)).toHaveTextContent("December");

        // move one year back
        await sendShiftPress("PageUp");
        await expect.element(getCalendarVisibleHeading(calendar)).toHaveTextContent("2019");
        await expect.element(getMonthHeading(first)).toHaveTextContent("November");
        await expect.element(getMonthHeading(second)).toHaveTextContent("December");
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

        await next.click();
        await expect.element(getMonthHeading(first)).toHaveTextContent("March");
        await expect.element(getMonthHeading(second)).toHaveTextContent("April");

        await next.click();
        await expect.element(getMonthHeading(first)).toHaveTextContent("May");
        await expect.element(getMonthHeading(second)).toHaveTextContent("June");

        await prev.click();
        await expect.element(getMonthHeading(first)).toHaveTextContent("March");
        await expect.element(getMonthHeading(second)).toHaveTextContent("April");

        await prev.click();
        await expect.element(getMonthHeading(first)).toHaveTextContent("January");
        await expect.element(getMonthHeading(second)).toHaveTextContent("February");

        await prev.click();
        await expect.element(getMonthHeading(first)).toHaveTextContent("November");
        await expect.element(getMonthHeading(second)).toHaveTextContent("December");
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
        await expect.element(getMonthHeading(first)).toHaveTextContent("January");
        await expect.element(getMonthHeading(second)).toHaveTextContent("February");
        await expect.element(getCalendarVisibleHeading(calendar)).toHaveTextContent("2021");

        // one month outside of page
        calendar.focusedDate = "2021-03-01";
        await nextFrame();
        await expect.element(getMonthHeading(first)).toHaveTextContent("March");
        await expect.element(getMonthHeading(second)).toHaveTextContent("April");
        await expect.element(getCalendarVisibleHeading(calendar)).toHaveTextContent("2021");

        // a few months ahead
        calendar.focusedDate = "2021-05-01";
        await nextFrame();
        await expect.element(getMonthHeading(first)).toHaveTextContent("May");
        await expect.element(getMonthHeading(second)).toHaveTextContent("June");
        await expect.element(getCalendarVisibleHeading(calendar)).toHaveTextContent("2021");

        // a few months back
        calendar.focusedDate = "2020-12-01";
        await nextFrame();
        await expect.element(getMonthHeading(first)).toHaveTextContent("November");
        await expect.element(getMonthHeading(second)).toHaveTextContent("December");
        await expect.element(getCalendarVisibleHeading(calendar)).toHaveTextContent("2020");
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
        await userEvent.keyboard("{Tab}");
        await userEvent.keyboard("{Tab}");
        await userEvent.keyboard("{Tab}");

        // move to feb, within page
        await userEvent.keyboard("{PageDown}");
        await expect.element(getMonthHeading(first)).toHaveTextContent("January");
        await expect.element(getMonthHeading(second)).toHaveTextContent("February");

        // move to march, out of page
        await userEvent.keyboard("{PageDown}");
        await expect.element(getMonthHeading(first)).toHaveTextContent("February");
        await expect.element(getMonthHeading(second)).toHaveTextContent("March");

        // move to april, should be on same page
        await userEvent.keyboard("{PageDown}");
        await expect.element(getMonthHeading(first)).toHaveTextContent("March");
        await expect.element(getMonthHeading(second)).toHaveTextContent("April");

        // move to march, within page
        await userEvent.keyboard("{PageUp}");
        await expect.element(getMonthHeading(first)).toHaveTextContent("March");
        await expect.element(getMonthHeading(second)).toHaveTextContent("April");

        // move to feb, out of page
        await userEvent.keyboard("{PageUp}");
        await expect.element(getMonthHeading(first)).toHaveTextContent("February");
        await expect.element(getMonthHeading(second)).toHaveTextContent("March");

        // move to jan, within page
        await userEvent.keyboard("{PageUp}");
        await expect.element(getMonthHeading(first)).toHaveTextContent("January");
        await expect.element(getMonthHeading(second)).toHaveTextContent("February");

        // move to dec, out of page
        await userEvent.keyboard("{PageUp}");
        await expect.element(getMonthHeading(first)).toHaveTextContent("December");
        await expect.element(getMonthHeading(second)).toHaveTextContent("January");

        // sanity check
        expect(calendar.focusedDate).toBe("2019-12-01");

        // move one year ahead
        await sendShiftPress("PageDown");
        await expect.element(getCalendarVisibleHeading(calendar)).toHaveTextContent(/2020/);
        await expect.element(getCalendarVisibleHeading(calendar)).toHaveTextContent(/2021/);
        await expect.element(getMonthHeading(first)).toHaveTextContent("December");
        await expect.element(getMonthHeading(second)).toHaveTextContent("January");

        // move one year back
        await sendShiftPress("PageUp");
        await expect.element(getMonthHeading(first)).toHaveTextContent("December");
        await expect.element(getCalendarVisibleHeading(calendar)).toHaveTextContent(/2019/);
        await expect.element(getCalendarVisibleHeading(calendar)).toHaveTextContent(/2020/);
        await expect.element(getMonthHeading(second)).toHaveTextContent("January");
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

        await next.click();
        await expect.element(getMonthHeading(first)).toHaveTextContent("February");
        await expect.element(getMonthHeading(second)).toHaveTextContent("March");

        await next.click();
        await expect.element(getMonthHeading(first)).toHaveTextContent("March");
        await expect.element(getMonthHeading(second)).toHaveTextContent("April");

        await prev.click();
        await expect.element(getMonthHeading(first)).toHaveTextContent("February");
        await expect.element(getMonthHeading(second)).toHaveTextContent("March");

        await prev.click();
        await expect.element(getMonthHeading(first)).toHaveTextContent("January");
        await expect.element(getMonthHeading(second)).toHaveTextContent("February");

        await prev.click();
        await expect.element(getMonthHeading(first)).toHaveTextContent("December");
        await expect.element(getMonthHeading(second)).toHaveTextContent("January");
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
        await expect.element(getMonthHeading(first)).toHaveTextContent("January");
        await expect.element(getMonthHeading(second)).toHaveTextContent("February");
        await expect.element(getCalendarVisibleHeading(calendar)).toHaveTextContent("2021");

        // one month outside of page
        calendar.focusedDate = "2021-03-01";
        await nextFrame();
        await expect.element(getMonthHeading(first)).toHaveTextContent("February");
        await expect.element(getMonthHeading(second)).toHaveTextContent("March");
        await expect.element(getCalendarVisibleHeading(calendar)).toHaveTextContent("2021");

        // a few months ahead
        calendar.focusedDate = "2021-05-01";
        await nextFrame();
        await expect.element(getMonthHeading(first)).toHaveTextContent("April");
        await expect.element(getMonthHeading(second)).toHaveTextContent("May");
        await expect.element(getCalendarVisibleHeading(calendar)).toHaveTextContent("2021");

        // a few months back
        calendar.focusedDate = "2020-12-01";
        await nextFrame();
        await expect.element(getMonthHeading(first)).toHaveTextContent("December");
        await expect.element(getMonthHeading(second)).toHaveTextContent("January");
        await expect.element(getCalendarVisibleHeading(calendar)).toHaveTextContent(/2020/);
        await expect.element(getCalendarVisibleHeading(calendar)).toHaveTextContent(/2021/);
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
      await getNextPageButton(calendar).click();

      expect(spy.count).toBe(1);
      expect(spy.last[0].detail).toEqual(new Date("2022-02-01"));
    });

    it("raises a change event", async () => {
      const spy = createSpy<(e: Event) => void>();
      const calendar = await mount(
        <Fixture value="2022-01-01" onchange={spy} />
      );
      const month = getMonth(calendar);

      await getPrevPageButton(calendar).click();
      await clickDay(month, "31 December");

      expect(spy.count).toBe(1);
      const target = spy.last[0].target as InstanceType<typeof CalendarDate>;
      expect(target.value).toBe("2021-12-31");
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
      await userEvent.keyboard("{Tab}");
      await userEvent.keyboard("{Tab}");
      await userEvent.keyboard("{Enter}");

      const nextButton = calendar.shadowRoot!.querySelector<HTMLButtonElement>(
        `button[part~="next"]`
      )!;
      expect(nextButton).toBeActiveElement();
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

      expect(spy.count).toBe(1);
      expect(calendar.value).toBe("2020-02-01");

      // get the clicked day
      const button = getDayButton(month, "1 February");
      expect(button).toBeActiveElement();
      expect(button.tabIndex).toBe(0);
    });
  });

  describe("min/max support", () => {
    it("disables prev month button if same month and year as min", async () => {
      const calendar = await mount(
        <Fixture value="2020-04-19" min="2020-04-01" />
      );

      const prevMonthButton = getPrevPageButton(calendar);
      await expect.element(prevMonthButton).toHaveAttribute("aria-disabled", "true");
    });

    it("disables next month button if same month and year as max", async () => {
      const calendar = await mount(
        <Fixture value="2020-04-19" max="2020-04-30" />
      );

      const nextMonthButton = getNextPageButton(calendar);
      await expect.element(nextMonthButton).toHaveAttribute("aria-disabled", "true");
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
      await expect.element(getMonthHeading(first!)).toHaveTextContent("January");
      await expect.element(getMonthHeading(second!)).toHaveTextContent("February");
    });

    it("respects `months` when paginating", async () => {
      const calendar = await mount(
        <Fixture value="2020-01-01" months={2}>
          <CalendarMonth />
          <CalendarMonth offset={1} />
        </Fixture>
      );

      const [first, second] = getMonths(calendar);

      await getNextPageButton(calendar).click();
      await expect.element(getMonthHeading(first!)).toHaveTextContent("March");
      await expect.element(getMonthHeading(second!)).toHaveTextContent("April");

      await getPrevPageButton(calendar).click();
      await expect.element(getMonthHeading(first!)).toHaveTextContent("January");
      await expect.element(getMonthHeading(second!)).toHaveTextContent("February");
    });
  });

  describe("focused date", () => {
    it("defaults to `value` if not set", async () => {
      const calendar = await mount(<Fixture value="2020-01-01" />);
      const day = getDayButton(getMonth(calendar), "1 January");
      await expect.element(page.elementLocator(day)).toHaveAttribute("tabindex", "0");
    });

    it("defaults to today if no value set", async () => {
      const calendar = await mount(<Fixture />);
      const todaysDate = toDate(getToday());
      const month = getMonth(calendar);

      const heading = getMonthHeading(month);
      await expect.element(heading).toHaveTextContent(
        todaysDate.toLocaleDateString("en-GB", { month: "long" })
      );

      const button = getDayButton(
        month,
        todaysDate.toLocaleDateString("en-GB", {
          month: "long",
          day: "numeric",
        })
      );
      await expect.element(page.elementLocator(button)).toHaveAttribute("tabindex", "0");
    });

    it("can be changed via props", async () => {
      const calendar = await mount(
        <Fixture value="2020-01-01" focusedDate="2020-02-15" />
      );
      const month = getMonth(calendar);

      const day = getDayButton(month, "15 February");
      await expect.element(page.elementLocator(day)).toHaveAttribute("tabindex", "0");

      calendar.focusedDate = "2020-04-15";
      await nextFrame();

      const newDay = getDayButton(month, "15 April");
      await expect.element(page.elementLocator(newDay)).toHaveAttribute("tabindex", "0");
    });

    it("updates as user navigates", async () => {
      const calendar = await mount(
        <Fixture value="2020-01-01" focusedDate="2020-02-15" />
      );
      const month = getMonth(calendar);

      await getPrevPageButton(calendar).click();

      const day = getDayButton(month, "15 January");
      await expect.element(page.elementLocator(day)).toHaveAttribute("tabindex", "0");
      expect(calendar.focusedDate).toBe("2020-01-15");
    });
  });

  describe("localization", () => {
    it("localizes heading", async () => {
      const calendar = await mount(
        <Fixture value="2020-01-01" locale="de-DE" />
      );

      await expect.element(getCalendarHeading(calendar)).toHaveTextContent("Januar 2020");

      await getNextPageButton(calendar).click();
      await expect.element(getCalendarHeading(calendar)).toHaveTextContent("Februar 2020");

      await getNextPageButton(calendar).click();
      await expect.element(getCalendarHeading(calendar)).toHaveTextContent("März 2020");

      await getNextPageButton(calendar).click();
      await expect.element(getCalendarHeading(calendar)).toHaveTextContent("April 2020");

      await getNextPageButton(calendar).click();
      await expect.element(getCalendarHeading(calendar)).toHaveTextContent("Mai 2020");

      await getNextPageButton(calendar).click();
      await expect.element(getCalendarHeading(calendar)).toHaveTextContent("Juni 2020");

      await getNextPageButton(calendar).click();
      await expect.element(getCalendarHeading(calendar)).toHaveTextContent("Juli 2020");

      await getNextPageButton(calendar).click();
      await expect.element(getCalendarHeading(calendar)).toHaveTextContent("August 2020");

      await getNextPageButton(calendar).click();
      await expect.element(getCalendarHeading(calendar)).toHaveTextContent("September 2020");

      await getNextPageButton(calendar).click();
      await expect.element(getCalendarHeading(calendar)).toHaveTextContent("Oktober 2020");

      await getNextPageButton(calendar).click();
      await expect.element(getCalendarHeading(calendar)).toHaveTextContent("November 2020");

      await getNextPageButton(calendar).click();
      await expect.element(getCalendarHeading(calendar)).toHaveTextContent("Dezember 2020");
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

      await expect.element(getMonthHeading(month)).toHaveTextContent("January");
      await expect.element(page.elementLocator(firstJan)).toHaveAttribute("aria-pressed", "true");
    });
  });

  describe("focus()", () => {
    it("allows targeting different elements", async () => {
      const calendar = await mount(<Fixture value="2020-01-01" />);
      const day = getDayButton(getMonth(calendar), "1 January");
      const prevButton = calendar.shadowRoot!.querySelector<HTMLButtonElement>(
        `button[part~="previous"]`
      )!;
      const nextButton = calendar.shadowRoot!.querySelector<HTMLButtonElement>(
        `button[part~="next"]`
      )!;

      calendar.focus({ target: "previous" });
      expect(prevButton).toBeActiveElement(calendar.shadowRoot!);

      calendar.focus();
      expect(day).toBeActiveElement();

      calendar.focus({ target: "next" });
      expect(nextButton).toBeActiveElement();

      calendar.focus({ target: "day" });
      expect(day).toBeActiveElement();
    });
  });

  it("allows customizing day parts", async () => {
    const available = new Set(["2020-01-10", "2020-01-11", "2020-01-12"]);
    const almostGone = new Set(["2020-01-13", "2020-01-14"]);

    const calendar = await mount(<Fixture value="2020-01-01" />);
    calendar.getDayParts = function getDayParts(date: Date) {
      const d = PlainDate.from(date).toString();

      if (available.has(d)) return "available";
      if (almostGone.has(d)) return "almost-gone";
      return "";
    };

    await nextFrame();
    const month = getMonth(calendar);

    [
      getDayButton(month, "10 January"),
      getDayButton(month, "11 January"),
      getDayButton(month, "12 January"),
    ].forEach((day) => {
      expect(day).toHavePart("available");
    });

    [
      getDayButton(month, "13 January"),
      getDayButton(month, "14 January"),
    ].forEach((day) => {
      expect(day).toHavePart("almost-gone");
    });
  });
});
