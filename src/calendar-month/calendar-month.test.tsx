import { describe, it, expect } from "vitest";
import { userEvent, page } from "vitest/browser";
import type { VNodeAny } from "atomico/types/vnode";
import {
  clickDay,
  createSpy,
  getGrid,
  getMonthHeading,
  getMonth,
  getDayButton,
  getSelectedDays,
  click,
  sendShiftPress,
  getTodayButton,
  type MonthInstance,
} from "../utils/test.js";
import {
  CalendarContext,
  type CalendarDateContext,
  type CalendarMultiContext,
  type CalendarRangeContext,
} from "./CalendarMonthContext.js";
import { CalendarMonth } from "../calendar-month/calendar-month.js";
import { fixture } from "atomico/test-dom";
import { PlainDate } from "../utils/temporal.js";
import { toDate, getToday } from "../utils/date.js";

async function nextFrame() {
  return new Promise((resolve) => requestAnimationFrame(() => resolve(undefined)));
}

type MonthContextInstance = InstanceType<typeof CalendarContext>;

interface TestPropsBase {
  onselectday?: (e: CustomEvent<PlainDate>) => void;
  onfocusday?: (e: CustomEvent<PlainDate>) => void;
  dir?: "rtl" | "ltr";
}

interface DateTestProps extends TestPropsBase, CalendarDateContext {}
interface RangeTestProps extends TestPropsBase, CalendarRangeContext {}
interface MultiTestProps extends TestPropsBase, CalendarMultiContext {}

const isWeekend = (date: Date) => date.getDay() === 0 || date.getDay() === 6;

function getWeekNumbers(month: MonthInstance) {
  const grid = getGrid(month);
  return grid.querySelectorAll("tbody tr th");
}

function Fixture({
  onselectday,
  onfocusday,
  focusedDate = getToday(),
  dir,
  type = "date",
  formatWeekday = "narrow",
  ...props
}: Partial<DateTestProps | RangeTestProps | MultiTestProps>): VNodeAny {
  return (
    <CalendarContext
      onselectday={onselectday}
      onfocusday={onfocusday}
      dir={dir}
      value={{
        firstDayOfWeek: 1,
        locale: "en-GB",
        page: {
          start: focusedDate.toPlainYearMonth(),
          end: focusedDate.toPlainYearMonth(),
        },
        focusedDate,
        formatWeekday,
        // @ts-expect-error - not sure why this is a problem
        type,
        ...props,
      }}
    >
      <CalendarMonth />
    </CalendarContext>
  );
}

export async function mount(node: VNodeAny) {
  const context = fixture<MonthContextInstance>(node);
  const month = getMonth(context);
  await nextFrame();

  return month;
}

describe("CalendarMonth", () => {
  it("is defined", async () => {
    const calendar = await mount(<Fixture />);
    expect(calendar).toBeInstanceOf(CalendarMonth);
  });

  describe("value types", () => {
    describe("range", () => {
      it("handles an empty value", async () => {
        const month = await mount(
          <Fixture
            type="range"
            value={[]}
            focusedDate={PlainDate.from("2024-01-01")}
          />
        );

        const selected = getSelectedDays(month);
        expect(selected.length).toBe(0);
      });

      it("marks a range as selected", async () => {
        const month = await mount(
          <Fixture
            focusedDate={PlainDate.from("2020-01-01")}
            type="range"
            value={[PlainDate.from("2020-01-01"), PlainDate.from("2020-01-03")]}
          />
        );

        const selected = getSelectedDays(month);
        expect(selected.length).toBe(3);

        await expect.element(page.elementLocator(selected[0])).toHaveAttribute("aria-label", "1 January");
        expect(selected[0]!).toHavePart("selected");
        expect(selected[0]!).toHavePart("range-start");

        await expect.element(page.elementLocator(selected[1])).toHaveAttribute("aria-label", "2 January");
        expect(selected[1]!).toHavePart("selected");
        expect(selected[1]!).toHavePart("range-inner");

        await expect.element(page.elementLocator(selected[2])).toHaveAttribute("aria-label", "3 January");
        expect(selected[2]!).toHavePart("selected");
        expect(selected[2]!).toHavePart("range-end");
      });
    });

    describe("single date", () => {
      it("handles an empty value", async () => {
        const month = await mount(
          <Fixture focusedDate={PlainDate.from("2024-01-01")} />
        );

        const selected = getSelectedDays(month);
        expect(selected.length).toBe(0);
      });

      it("marks a single date as selected", async () => {
        const month = await mount(
          <Fixture
            focusedDate={PlainDate.from("2020-01-01")}
            value={PlainDate.from("2020-01-01")}
          />
        );

        const selected = getSelectedDays(month);
        expect(selected.length).toBe(1);
        await expect.element(page.elementLocator(selected[0])).toHaveAttribute("aria-label", "1 January");
        expect(selected[0]!).toHavePart("selected");
      });
    });

    describe("multi date", () => {
      it("handles an empty value", async () => {
        const month = await mount(
          <Fixture
            type="multi"
            value={[]}
            focusedDate={PlainDate.from("2024-01-01")}
          />
        );

        const selected = getSelectedDays(month);
        expect(selected.length).toBe(0);
      });

      it("marks multiple dates as selected", async () => {
        const month = await mount(
          <Fixture
            focusedDate={PlainDate.from("2020-01-01")}
            type="multi"
            value={[
              PlainDate.from("2020-01-01"),
              PlainDate.from("2020-01-02"),
              PlainDate.from("2020-01-03"),
            ]}
          />
        );

        const selected = getSelectedDays(month);
        expect(selected.length).toBe(3);
        await expect.element(page.elementLocator(selected[0])).toHaveAttribute("aria-label", "1 January");
        await expect.element(page.elementLocator(selected[1])).toHaveAttribute("aria-label", "2 January");
        await expect.element(page.elementLocator(selected[2])).toHaveAttribute("aria-label", "3 January");
      });
    });
  });

  describe("a11y/ARIA requirements", () => {
    describe("grid", () => {
      it("is labelled", async () => {
        const month = await mount(<Fixture />);

        // has accessible label
        const title = getMonthHeading(month);
        expect(title).not.toBe(undefined);
      });

      it("marks today", async () => {
        const month = await mount(<Fixture />);

        const todaysDate = toDate(getToday()).toLocaleDateString("en-GB", {
          day: "numeric",
          month: "long",
        });
        const button = getDayButton(month, todaysDate)!;

        expect(button).toHavePart("today");
        await expect.element(page.elementLocator(button)).toHaveAttribute("aria-current", "date");
      });

      it("uses a roving tab index", async () => {
        const month = await mount(
          <Fixture focusedDate={PlainDate.from("2020-01-01")} />
        );
        const grid = getGrid(month);
        const buttons = [...grid.querySelectorAll("button")];

        // all buttons have a tabindex
        expect(
          buttons.every((button) => button.hasAttribute("tabindex"))
        ).toBe(true);

        // only one button has tabindex 0
        const focusable =
          grid.querySelectorAll<HTMLButtonElement>(`[tabindex="0"]`);
        expect(focusable.length).toBe(1);
        await expect.element(page.elementLocator(focusable[0])).toHaveTextContent("1");
        await expect.element(page.elementLocator(focusable[0])).toHaveAttribute("aria-label", "1 January");
      });
    });
  });

  describe("mouse interaction", () => {
    it("can select a date", async () => {
      const spy = createSpy<(e: CustomEvent<PlainDate>) => void>();
      const calendar = await mount(
        <Fixture focusedDate={PlainDate.from("2020-04-01")} onselectday={spy} />
      );

      await clickDay(calendar, "19 April");

      expect(spy.count).toBe(1);
      expect(spy.last[0].detail.toString()).toBe("2020-04-19");
    });

    it("cannot select a disallowed date", async () => {
      const spy = createSpy<(e: CustomEvent<PlainDate>) => void>();
      const calendar = await mount(
        <Fixture
          focusedDate={PlainDate.from("2020-01-03")}
          onselectday={spy}
          isDateDisallowed={isWeekend}
        />
      );

      const day = getDayButton(calendar, "4 January")!;
      expect(day).toHavePart("disallowed");
      await expect.element(page.elementLocator(day)).toHaveAttribute("aria-disabled", "true");

      await click(day, { force: true });
      expect(spy.called).toBe(false);
    });
  });

  describe("keyboard interaction", () => {
    it("can select a date", async () => {
      const spy = createSpy<(e: CustomEvent<PlainDate>) => void>();
      await mount(
        <Fixture focusedDate={PlainDate.from("2020-04-19")} onfocusday={spy} />
      );

      await userEvent.keyboard("{Tab}");
      await userEvent.keyboard("{Enter}");

      expect(spy.count).toBe(1);
      expect(spy.last[0].detail.toString()).toBe("2020-04-19");
    });

    it("cannot select a disabled date", async () => {
      const spy = createSpy<(e: CustomEvent<PlainDate>) => void>();
      await mount(
        <Fixture
          focusedDate={PlainDate.from("2020-01-04")}
          onselectday={spy}
          isDateDisallowed={isWeekend}
        />
      );

      await userEvent.keyboard("{Tab}");
      await userEvent.keyboard("{Enter}");

      expect(spy.called).toBe(false);
    });

    it("can move focus to previous day", async () => {
      const spy = createSpy<(e: CustomEvent<PlainDate>) => void>();
      await mount(
        <Fixture focusedDate={PlainDate.from("2020-04-19")} onfocusday={spy} />
      );

      await userEvent.keyboard("{Tab}");
      await userEvent.keyboard("{ArrowLeft}");

      expect(spy.count).toBe(1);
      expect(spy.last[0].detail.toString()).toBe("2020-04-18");
    });

    it("can move focus to next day ", async () => {
      const spy = createSpy<(e: CustomEvent<PlainDate>) => void>();
      await mount(
        <Fixture focusedDate={PlainDate.from("2020-04-19")} onfocusday={spy} />
      );

      await userEvent.keyboard("{Tab}");
      await userEvent.keyboard("{ArrowRight}");

      expect(spy.count).toBe(1);
      expect(spy.last[0].detail.toString()).toBe("2020-04-20");
    });

    it("can move focus to previous week", async () => {
      const spy = createSpy<(e: CustomEvent<PlainDate>) => void>();
      await mount(
        <Fixture focusedDate={PlainDate.from("2020-04-19")} onfocusday={spy} />
      );

      await userEvent.keyboard("{Tab}");
      await userEvent.keyboard("{ArrowUp}");

      expect(spy.count).toBe(1);
      expect(spy.last[0].detail.toString()).toBe("2020-04-12");
    });

    it("can move focus to next week", async () => {
      const spy = createSpy<(e: CustomEvent<PlainDate>) => void>();
      await mount(
        <Fixture focusedDate={PlainDate.from("2020-04-19")} onfocusday={spy} />
      );

      await userEvent.keyboard("{Tab}");
      await userEvent.keyboard("{ArrowDown}");

      expect(spy.count).toBe(1);
      expect(spy.last[0].detail.toString()).toBe("2020-04-26");
    });

    it("can move focus to start of week", async () => {
      const spy = createSpy<(e: CustomEvent<PlainDate>) => void>();
      await mount(
        <Fixture focusedDate={PlainDate.from("2020-04-16")} onfocusday={spy} />
      );

      await userEvent.keyboard("{Tab}");
      await userEvent.keyboard("{Home}");

      expect(spy.count).toBe(1);
      expect(spy.last[0].detail.toString()).toBe("2020-04-13");
    });

    it("can move focus to end of week", async () => {
      const spy = createSpy<(e: CustomEvent<PlainDate>) => void>();
      await mount(
        <Fixture focusedDate={PlainDate.from("2020-04-16")} onfocusday={spy} />
      );

      await userEvent.keyboard("{Tab}");
      await userEvent.keyboard("{End}");

      expect(spy.count).toBe(1);
      expect(spy.last[0].detail.toString()).toBe("2020-04-19");
    });

    it("can move focus to previous month", async () => {
      const spy = createSpy<(e: CustomEvent<PlainDate>) => void>();
      await mount(
        <Fixture focusedDate={PlainDate.from("2020-04-19")} onfocusday={spy} />
      );

      await userEvent.keyboard("{Tab}");
      await userEvent.keyboard("{PageUp}");

      expect(spy.count).toBe(1);
      expect(spy.last[0].detail.toString()).toBe("2020-03-19");
    });

    it("can move focus to next month", async () => {
      const spy = createSpy<(e: CustomEvent<PlainDate>) => void>();
      await mount(
        <Fixture focusedDate={PlainDate.from("2020-04-19")} onfocusday={spy} />
      );

      await userEvent.keyboard("{Tab}");
      await userEvent.keyboard("{PageDown}");

      expect(spy.count).toBe(1);
      expect(spy.last[0].detail.toString()).toBe("2020-05-19");
    });

    it("can move focus to previous year", async () => {
      const spy = createSpy<(e: CustomEvent<PlainDate>) => void>();
      await mount(
        <Fixture focusedDate={PlainDate.from("2020-04-19")} onfocusday={spy} />
      );

      await userEvent.keyboard("{Tab}");
      await sendShiftPress("PageUp");

      expect(spy.count).toBe(1);
      expect(spy.last[0].detail.toString()).toBe("2019-04-19");
    });

    it("can move focus to next year", async () => {
      const spy = createSpy<(e: CustomEvent<PlainDate>) => void>();
      await mount(
        <Fixture focusedDate={PlainDate.from("2020-04-19")} onfocusday={spy} />
      );

      await userEvent.keyboard("{Tab}");
      await userEvent.keyboard("{Shift>}");
      await userEvent.keyboard("{PageDown}");
      await userEvent.keyboard("{/Shift}");

      expect(spy.count).toBe(1);
      expect(spy.last[0].detail.toString()).toBe("2021-04-19");
    });

    it("can move focus to disabled dates", async () => {
      const spy = createSpy<(e: CustomEvent<PlainDate>) => void>();
      await mount(
        <Fixture
          focusedDate={PlainDate.from("2020-01-03")}
          onfocusday={spy}
          isDateDisallowed={isWeekend}
        />
      );

      await userEvent.keyboard("{Tab}");
      await userEvent.keyboard("{ArrowRight}");

      expect(spy.count).toBe(1);
      expect(spy.last[0].detail.toString()).toBe("2020-01-04");
    });

    it("cannot move focus outside of min/max range", async () => {
      const focused = "2020-01-03";
      const spy = createSpy<(e: CustomEvent<PlainDate>) => void>();
      await mount(
        <Fixture
          min={PlainDate.from(focused)}
          max={PlainDate.from(focused)}
          focusedDate={PlainDate.from(focused)}
          onfocusday={spy}
        />
      );

      await userEvent.keyboard("{Tab}");
      await userEvent.keyboard("{ArrowLeft}");
      expect(spy.last[0].detail.toString()).toBe(focused);

      await userEvent.keyboard("{ArrowRight}");
      expect(spy.last[0].detail.toString()).toBe(focused);
    });

    describe("RTL", () => {
      it("treats left arrow as next day", async () => {
        const spy = createSpy<(e: CustomEvent<PlainDate>) => void>();
        await mount(
          <Fixture
            focusedDate={PlainDate.from("2020-04-19")}
            onfocusday={spy}
            dir="rtl"
          />
        );

        await userEvent.keyboard("{Tab}");
        await userEvent.keyboard("{ArrowLeft}");

        expect(spy.count).toBe(1);
        expect(spy.last[0].detail.toString()).toBe("2020-04-20");
      });

      it("treats right arrow as previous day", async () => {
        const spy = createSpy<(e: CustomEvent<PlainDate>) => void>();
        await mount(
          <Fixture
            focusedDate={PlainDate.from("2020-04-19")}
            onfocusday={spy}
            dir="rtl"
          />
        );

        await userEvent.keyboard("{Tab}");
        await userEvent.keyboard("{ArrowRight}");

        expect(spy.count).toBe(1);
        expect(spy.last[0].detail.toString()).toBe("2020-04-18");
      });
    });
  });

  describe("min/max support", () => {
    it("supports a min date", async () => {
      const spy = createSpy<(e: CustomEvent<PlainDate>) => void>();
      const month = await mount(
        <Fixture
          focusedDate={PlainDate.from("2020-01-15")}
          min={PlainDate.from("2020-01-02")}
          onselectday={spy}
        />
      );

      // try clicking a day outside the range
      await clickDay(month, "1 January", { force: true });
      expect(spy.called).toBe(false);

      // click a day inside the range
      await clickDay(month, "2 January");

      expect(spy.count).toBe(1);
      expect(spy.last[0].detail.toString()).toBe("2020-01-02");
    });

    it("supports a max date", async () => {
      const spy = createSpy<(e: CustomEvent<PlainDate>) => void>();
      const month = await mount(
        <Fixture
          focusedDate={PlainDate.from("2020-01-15")}
          max={PlainDate.from("2020-01-30")}
          onselectday={spy}
        />
      );

      // try clicking a day outside the range
      await clickDay(month, "31 January", { force: true });
      expect(spy.called).toBe(false);

      // click a day inside the range
      await clickDay(month, "30 January");

      expect(spy.count).toBe(1);
      expect(spy.last[0].detail.toString()).toBe("2020-01-30");
    });

    it("supports min and max dates", async () => {
      const spy = createSpy<(e: CustomEvent<PlainDate>) => void>();
      const month = await mount(
        <Fixture
          focusedDate={PlainDate.from("2020-01-15")}
          min={PlainDate.from("2020-01-02")}
          max={PlainDate.from("2020-01-30")}
          onselectday={spy}
        />
      );

      // try clicking a day less than min
      await clickDay(month, "1 January", { force: true });
      expect(spy.called).toBe(false);

      // try clicking a day greater than max
      await clickDay(month, "31 January", { force: true });
      expect(spy.called).toBe(false);

      // click a day inside the range
      await clickDay(month, "30 January");
      expect(spy.count).toBe(1);
      expect(spy.last[0].detail.toString()).toBe("2020-01-30");
    });
  });

  describe("today support", () => {
    it("supports today date", async () => {
      const month = await mount(
        <Fixture
          focusedDate={PlainDate.from("2020-01-01")}
          today={PlainDate.from("2020-01-02")}
        />
      );

      const todayButton = getTodayButton(month);
      await expect.element(page.elementLocator(todayButton)).toHaveAttribute("aria-label", "2 January");
    });
  });

  it("can show outside days", async () => {
    const month = await mount(
      <Fixture focusedDate={PlainDate.from("2020-04-01")} showOutsideDays />
    );

    const outsideMarch = getDayButton(month, "30 March");
    const outsideMay = getDayButton(month, "3 May");

    expect(outsideMarch).toHavePart("outside");
    expect(outsideMay).toHavePart("outside");
  });

  describe("localization", async () => {
    it("localizes days and months", async () => {
      const month = await mount(
        <Fixture focusedDate={PlainDate.from("2020-01-15")} locale="fr-FR" />
      );
      const grid = getGrid(month);

      const accessibleHeadings = grid.querySelectorAll(
        "th span:not([aria-hidden])"
      );
      await expect.element(page.elementLocator(accessibleHeadings[0])).toHaveTextContent("lundi");
      await expect.element(page.elementLocator(accessibleHeadings[1])).toHaveTextContent("mardi");
      await expect.element(page.elementLocator(accessibleHeadings[2])).toHaveTextContent("mercredi");
      await expect.element(page.elementLocator(accessibleHeadings[3])).toHaveTextContent("jeudi");
      await expect.element(page.elementLocator(accessibleHeadings[4])).toHaveTextContent("vendredi");
      await expect.element(page.elementLocator(accessibleHeadings[5])).toHaveTextContent("samedi");
      await expect.element(page.elementLocator(accessibleHeadings[6])).toHaveTextContent("dimanche");

      const visualHeadings = grid.querySelectorAll(
        "th span[aria-hidden='true']"
      );
      await expect.element(page.elementLocator(visualHeadings[0])).toHaveTextContent("L");
      await expect.element(page.elementLocator(visualHeadings[1])).toHaveTextContent("M");
      await expect.element(page.elementLocator(visualHeadings[2])).toHaveTextContent("M");
      await expect.element(page.elementLocator(visualHeadings[3])).toHaveTextContent("J");
      await expect.element(page.elementLocator(visualHeadings[4])).toHaveTextContent("V");
      await expect.element(page.elementLocator(visualHeadings[5])).toHaveTextContent("S");
      await expect.element(page.elementLocator(visualHeadings[6])).toHaveTextContent("D");

      const title = getMonthHeading(month);
      await expect.element(page.elementLocator(title)).toHaveTextContent("janvier");

      const button = getDayButton(month, "15 janvier");
      expect(button).toBeTruthy();
    });

    it("has configurable week day formatting", async () => {
      const month = await mount(
        <Fixture
          focusedDate={PlainDate.from("2020-01-15")}
          formatWeekday="short"
        />
      );
      const grid = getGrid(month);

      const accessibleHeadings = grid.querySelectorAll(
        "th span:not([aria-hidden])"
      );
      await expect.element(page.elementLocator(accessibleHeadings[0])).toHaveTextContent("Monday");
      await expect.element(page.elementLocator(accessibleHeadings[1])).toHaveTextContent("Tuesday");
      await expect.element(page.elementLocator(accessibleHeadings[2])).toHaveTextContent("Wednesday");
      await expect.element(page.elementLocator(accessibleHeadings[3])).toHaveTextContent("Thursday");
      await expect.element(page.elementLocator(accessibleHeadings[4])).toHaveTextContent("Friday");
      await expect.element(page.elementLocator(accessibleHeadings[5])).toHaveTextContent("Saturday");
      await expect.element(page.elementLocator(accessibleHeadings[6])).toHaveTextContent("Sunday");

      const visualHeadings = grid.querySelectorAll(
        "th span[aria-hidden='true']"
      );
      await expect.element(page.elementLocator(visualHeadings[0])).toHaveTextContent("Mon");
      await expect.element(page.elementLocator(visualHeadings[1])).toHaveTextContent("Tue");
      await expect.element(page.elementLocator(visualHeadings[2])).toHaveTextContent("Wed");
      await expect.element(page.elementLocator(visualHeadings[3])).toHaveTextContent("Thu");
      await expect.element(page.elementLocator(visualHeadings[4])).toHaveTextContent("Fri");
      await expect.element(page.elementLocator(visualHeadings[5])).toHaveTextContent("Sat");
      await expect.element(page.elementLocator(visualHeadings[6])).toHaveTextContent("Sun");
    });

    it("renders parts for each day corresponding to day number", async () => {
      const mapToDayNumber = (firstDayOfWeek: number, i: number) =>
        (i + firstDayOfWeek) % 7;

      const firstDayOfWeek = 2;
      const month = await mount(
        <Fixture
          focusedDate={PlainDate.from("2020-01-15")}
          firstDayOfWeek={firstDayOfWeek}
        />
      );
      const grid = getGrid(month);

      const headings = grid.querySelectorAll("th");
      const days = grid.rows[2]!.querySelectorAll("button");

      // sanity check
      expect(headings.length).toBe(7);
      expect(days.length).toBe(7);

      for (let i = 0; i < 7; i++) {
        const heading = headings[i]!;
        const day = days[i]!;
        const part = `day-${mapToDayNumber(firstDayOfWeek, i)}`;

        expect(heading).toHavePart(part);
        expect(day).toHavePart(part);
      }
    });
  });

  describe("week numbers", () => {
    it("supports week numbering", async () => {
      const month = await mount(
        <Fixture focusedDate={PlainDate.from("2020-04-01")} showWeekNumbers />
      );

      const weekNumbers = getWeekNumbers(month);

      // 5 weeks in this month
      expect(weekNumbers.length).toBe(5);

      // from: https://weeknumber.co.uk/?q=2020-04-01
      let current = 14;
      for (const weekNumber of weekNumbers) {
        expect(weekNumber).toHavePart("th");
        expect(weekNumber).toHavePart("weeknumber");
        await expect.element(page.elementLocator(weekNumber)).toHaveAttribute("scope", "row");
        await expect.element(page.elementLocator(weekNumber)).toHaveTextContent(current.toString());
        current++;
      }
    });
  });
});
