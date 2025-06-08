import { expect, nextFrame } from "@open-wc/testing";
import { sendKeys } from "@web/test-runner-commands";
import type { VNodeAny } from "atomico/types/vnode.js";
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
} from "../utils/test.js";
import {
  CalendarContext,
  type CalendarDateContext,
  type CalendarMultiContext,
  type CalendarRangeContext,
} from "./CalendarMonthContext.js";
import { CalendarMonth } from "../calendar-month/calendar-month.js";
import { fixture } from "atomico/test-dom";
import { toDate, getToday } from "../utils/date.js";

type MonthContextInstance = InstanceType<typeof CalendarContext>;

interface TestPropsBase {
  onselectday?: (e: CustomEvent<Temporal.PlainDate>) => void;
  onfocusday?: (e: CustomEvent<Temporal.PlainDate>) => void;
  dir?: "rtl" | "ltr";
}

interface DateTestProps extends TestPropsBase, CalendarDateContext {}
interface RangeTestProps extends TestPropsBase, CalendarRangeContext {}
interface MultiTestProps extends TestPropsBase, CalendarMultiContext {}

const isWeekend = (date: Date) => date.getDay() === 0 || date.getDay() === 6;

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
    expect(calendar).to.be.instanceOf(CalendarMonth);
  });

  describe("value types", () => {
    describe("range", () => {
      it("handles an empty value", async () => {
        const month = await mount(
          <Fixture
            type="range"
            value={[]}
            focusedDate={Temporal.PlainDate.from("2024-01-01")}
          />
        );

        const selected = getSelectedDays(month);
        expect(selected.length).to.eq(0);
      });

      it("marks a range as selected", async () => {
        const month = await mount(
          <Fixture
            focusedDate={Temporal.PlainDate.from("2020-01-01")}
            type="range"
            value={[
              Temporal.PlainDate.from("2020-01-01"),
              Temporal.PlainDate.from("2020-01-03"),
            ]}
          />
        );

        const selected = getSelectedDays(month);
        expect(selected.length).to.eq(3);

        expect(selected[0]).to.have.attribute("aria-label", "1 January");
        expect(selected[0]!.part.contains("selected")).to.eq(true);
        expect(selected[0]!.part.contains("range-start"));

        expect(selected[1]).to.have.attribute("aria-label", "2 January");
        expect(selected[1]!.part.contains("selected")).to.eq(true);
        expect(selected[1]!.part.contains("range-inner"));

        expect(selected[2]).to.have.attribute("aria-label", "3 January");
        expect(selected[2]!.part.contains("selected")).to.eq(true);
        expect(selected[2]!.part.contains("range-end"));
      });
    });

    describe("single date", () => {
      it("handles an empty value", async () => {
        const month = await mount(
          <Fixture focusedDate={Temporal.PlainDate.from("2024-01-01")} />
        );

        const selected = getSelectedDays(month);
        expect(selected.length).to.eq(0);
      });

      it("marks a single date as selected", async () => {
        const month = await mount(
          <Fixture
            focusedDate={Temporal.PlainDate.from("2020-01-01")}
            value={Temporal.PlainDate.from("2020-01-01")}
          />
        );

        const selected = getSelectedDays(month);
        expect(selected.length).to.eq(1);
        expect(selected[0]).to.have.attribute("aria-label", "1 January");
        expect(selected[0]!.part.contains("selected")).to.eq(true);
      });
    });

    describe("multi date", () => {
      it("handles an empty value", async () => {
        const month = await mount(
          <Fixture
            type="multi"
            value={[]}
            focusedDate={Temporal.PlainDate.from("2024-01-01")}
          />
        );

        const selected = getSelectedDays(month);
        expect(selected.length).to.eq(0);
      });

      it("marks multiple dates as selected", async () => {
        const month = await mount(
          <Fixture
            focusedDate={Temporal.PlainDate.from("2020-01-01")}
            type="multi"
            value={[
              Temporal.PlainDate.from("2020-01-01"),
              Temporal.PlainDate.from("2020-01-02"),
              Temporal.PlainDate.from("2020-01-03"),
            ]}
          />
        );

        const selected = getSelectedDays(month);
        expect(selected.length).to.eq(3);
        expect(selected[0]).to.have.attribute("aria-label", "1 January");
        expect(selected[1]).to.have.attribute("aria-label", "2 January");
        expect(selected[2]).to.have.attribute("aria-label", "3 January");
      });
    });
  });

  describe("a11y/ARIA requirements", () => {
    describe("grid", () => {
      it("is labelled", async () => {
        const month = await mount(<Fixture />);

        // has accessible label
        const title = getMonthHeading(month);
        expect(title).not.to.eq(undefined);
      });

      it("marks today", async () => {
        const month = await mount(<Fixture />);

        const todaysDate = toDate(getToday()).toLocaleDateString("en-GB", {
          day: "numeric",
          month: "long",
        });
        const button = getDayButton(month, todaysDate)!;

        expect(button.part.contains("today")).to.eq(true);
        expect(button).to.have.attribute("aria-current", "date");
      });

      it("uses a roving tab index", async () => {
        const month = await mount(
          <Fixture focusedDate={Temporal.PlainDate.from("2020-01-01")} />
        );
        const grid = getGrid(month);
        const buttons = [...grid.querySelectorAll("button")];

        // all buttons have a tabindex
        expect(
          buttons.every((button) => button.hasAttribute("tabindex"))
        ).to.eq(true);

        // only one button has tabindex 0
        const focusable =
          grid.querySelectorAll<HTMLButtonElement>(`[tabindex="0"]`);
        expect(focusable.length).to.eq(1);
        expect(focusable[0]).to.have.trimmed.text("1");
        expect(focusable[0]).to.have.attribute("aria-label", "1 January");
      });
    });
  });

  describe("mouse interaction", () => {
    it("can select a date", async () => {
      const spy = createSpy<(e: CustomEvent<Temporal.PlainDate>) => void>();
      const calendar = await mount(
        <Fixture
          focusedDate={Temporal.PlainDate.from("2020-04-01")}
          onselectday={spy}
        />
      );

      await clickDay(calendar, "19 April");

      expect(spy.count).to.eq(1);
      expect(spy.last[0].detail.toString()).to.eq("2020-04-19");
    });

    it("cannot select a disallowed date", async () => {
      const spy = createSpy<(e: CustomEvent<Temporal.PlainDate>) => void>();
      const calendar = await mount(
        <Fixture
          focusedDate={Temporal.PlainDate.from("2020-01-03")}
          onselectday={spy}
          isDateDisallowed={isWeekend}
        />
      );

      const day = getDayButton(calendar, "4 January")!;
      expect(day.part.contains("disallowed")).to.eq(true);
      expect(day).to.have.attribute("aria-disabled", "true");

      await click(day);
      expect(spy.called).to.eq(false);
    });
  });

  describe("keyboard interaction", () => {
    it("can select a date", async () => {
      const spy = createSpy<(e: CustomEvent<Temporal.PlainDate>) => void>();
      await mount(
        <Fixture
          focusedDate={Temporal.PlainDate.from("2020-04-19")}
          onfocusday={spy}
        />
      );

      await sendKeys({ press: "Tab" });
      await sendKeys({ press: "Enter" });

      expect(spy.count).to.eq(1);
      expect(spy.last[0].detail.toString()).to.eq("2020-04-19");
    });

    it("cannot select a disabled date", async () => {
      const spy = createSpy<(e: CustomEvent<Temporal.PlainDate>) => void>();
      await mount(
        <Fixture
          focusedDate={Temporal.PlainDate.from("2020-01-04")}
          onselectday={spy}
          isDateDisallowed={isWeekend}
        />
      );

      await sendKeys({ press: "Tab" });
      await sendKeys({ press: "Enter" });

      expect(spy.called).to.eq(false);
    });

    it("can move focus to previous day", async () => {
      const spy = createSpy<(e: CustomEvent<Temporal.PlainDate>) => void>();
      await mount(
        <Fixture
          focusedDate={Temporal.PlainDate.from("2020-04-19")}
          onfocusday={spy}
        />
      );

      await sendKeys({ press: "Tab" });
      await sendKeys({ press: "ArrowLeft" });

      expect(spy.count).to.eq(1);
      expect(spy.last[0].detail.toString()).to.eq("2020-04-18");
    });

    it("can move focus to next day ", async () => {
      const spy = createSpy<(e: CustomEvent<Temporal.PlainDate>) => void>();
      await mount(
        <Fixture
          focusedDate={Temporal.PlainDate.from("2020-04-19")}
          onfocusday={spy}
        />
      );

      await sendKeys({ press: "Tab" });
      await sendKeys({ press: "ArrowRight" });

      expect(spy.count).to.eq(1);
      expect(spy.last[0].detail.toString()).to.eq("2020-04-20");
    });

    it("can move focus to previous week", async () => {
      const spy = createSpy<(e: CustomEvent<Temporal.PlainDate>) => void>();
      await mount(
        <Fixture
          focusedDate={Temporal.PlainDate.from("2020-04-19")}
          onfocusday={spy}
        />
      );

      await sendKeys({ press: "Tab" });
      await sendKeys({ press: "ArrowUp" });

      expect(spy.count).to.eq(1);
      expect(spy.last[0].detail.toString()).to.eq("2020-04-12");
    });

    it("can move focus to next week", async () => {
      const spy = createSpy<(e: CustomEvent<Temporal.PlainDate>) => void>();
      await mount(
        <Fixture
          focusedDate={Temporal.PlainDate.from("2020-04-19")}
          onfocusday={spy}
        />
      );

      await sendKeys({ press: "Tab" });
      await sendKeys({ press: "ArrowDown" });

      expect(spy.count).to.eq(1);
      expect(spy.last[0].detail.toString()).to.eq("2020-04-26");
    });

    it("can move focus to start of week", async () => {
      const spy = createSpy<(e: CustomEvent<Temporal.PlainDate>) => void>();
      await mount(
        <Fixture
          focusedDate={Temporal.PlainDate.from("2020-04-16")}
          onfocusday={spy}
        />
      );

      await sendKeys({ press: "Tab" });
      await sendKeys({ press: "Home" });

      expect(spy.count).to.eq(1);
      expect(spy.last[0].detail.toString()).to.eq("2020-04-13");
    });

    it("can move focus to end of week", async () => {
      const spy = createSpy<(e: CustomEvent<Temporal.PlainDate>) => void>();
      await mount(
        <Fixture
          focusedDate={Temporal.PlainDate.from("2020-04-16")}
          onfocusday={spy}
        />
      );

      await sendKeys({ press: "Tab" });
      await sendKeys({ press: "End" });

      expect(spy.count).to.eq(1);
      expect(spy.last[0].detail.toString()).to.eq("2020-04-19");
    });

    it("can move focus to previous month", async () => {
      const spy = createSpy<(e: CustomEvent<Temporal.PlainDate>) => void>();
      await mount(
        <Fixture
          focusedDate={Temporal.PlainDate.from("2020-04-19")}
          onfocusday={spy}
        />
      );

      await sendKeys({ press: "Tab" });
      await sendKeys({ press: "PageUp" });

      expect(spy.count).to.eq(1);
      expect(spy.last[0].detail.toString()).to.eq("2020-03-19");
    });

    it("can move focus to next month", async () => {
      const spy = createSpy<(e: CustomEvent<Temporal.PlainDate>) => void>();
      await mount(
        <Fixture
          focusedDate={Temporal.PlainDate.from("2020-04-19")}
          onfocusday={spy}
        />
      );

      await sendKeys({ press: "Tab" });
      await sendKeys({ press: "PageDown" });

      expect(spy.count).to.eq(1);
      expect(spy.last[0].detail.toString()).to.eq("2020-05-19");
    });

    it("can move focus to previous year", async () => {
      const spy = createSpy<(e: CustomEvent<Temporal.PlainDate>) => void>();
      await mount(
        <Fixture
          focusedDate={Temporal.PlainDate.from("2020-04-19")}
          onfocusday={spy}
        />
      );

      await sendKeys({ press: "Tab" });
      await sendShiftPress("PageUp");

      expect(spy.count).to.eq(1);
      expect(spy.last[0].detail.toString()).to.eq("2019-04-19");
    });

    it("can move focus to next year", async () => {
      const spy = createSpy<(e: CustomEvent<Temporal.PlainDate>) => void>();
      await mount(
        <Fixture
          focusedDate={Temporal.PlainDate.from("2020-04-19")}
          onfocusday={spy}
        />
      );

      await sendKeys({ press: "Tab" });
      await sendKeys({ down: "Shift" });
      await sendKeys({ press: "PageDown" });
      await sendKeys({ up: "Shift" });

      expect(spy.count).to.eq(1);
      expect(spy.last[0].detail.toString()).to.eq("2021-04-19");
    });

    it("can move focus to disabled dates", async () => {
      const spy = createSpy<(e: CustomEvent<Temporal.PlainDate>) => void>();
      await mount(
        <Fixture
          focusedDate={Temporal.PlainDate.from("2020-01-03")}
          onfocusday={spy}
          isDateDisallowed={isWeekend}
        />
      );

      await sendKeys({ press: "Tab" });
      await sendKeys({ press: "ArrowRight" });

      expect(spy.count).to.eq(1);
      expect(spy.last[0].detail.toString()).to.eq("2020-01-04");
    });

    it("cannot move focus outside of min/max range", async () => {
      const focused = "2020-01-03";
      const spy = createSpy<(e: CustomEvent<Temporal.PlainDate>) => void>();
      await mount(
        <Fixture
          min={Temporal.PlainDate.from(focused)}
          max={Temporal.PlainDate.from(focused)}
          focusedDate={Temporal.PlainDate.from(focused)}
          onfocusday={spy}
        />
      );

      await sendKeys({ press: "Tab" });
      await sendKeys({ press: "ArrowLeft" });
      expect(spy.last[0].detail.toString()).to.eq(focused);

      await sendKeys({ press: "ArrowRight" });
      expect(spy.last[0].detail.toString()).to.eq(focused);
    });

    describe("RTL", () => {
      it("treats left arrow as next day", async () => {
        const spy = createSpy<(e: CustomEvent<Temporal.PlainDate>) => void>();
        await mount(
          <Fixture
            focusedDate={Temporal.PlainDate.from("2020-04-19")}
            onfocusday={spy}
            dir="rtl"
          />
        );

        await sendKeys({ press: "Tab" });
        await sendKeys({ press: "ArrowLeft" });

        expect(spy.count).to.eq(1);
        expect(spy.last[0].detail.toString()).to.eq("2020-04-20");
      });

      it("treats right arrow as previous day", async () => {
        const spy = createSpy<(e: CustomEvent<Temporal.PlainDate>) => void>();
        await mount(
          <Fixture
            focusedDate={Temporal.PlainDate.from("2020-04-19")}
            onfocusday={spy}
            dir="rtl"
          />
        );

        await sendKeys({ press: "Tab" });
        await sendKeys({ press: "ArrowRight" });

        expect(spy.count).to.eq(1);
        expect(spy.last[0].detail.toString()).to.eq("2020-04-18");
      });
    });
  });

  describe("min/max support", () => {
    it("supports a min date", async () => {
      const spy = createSpy<(e: CustomEvent<Temporal.PlainDate>) => void>();
      const month = await mount(
        <Fixture
          focusedDate={Temporal.PlainDate.from("2020-01-15")}
          min={Temporal.PlainDate.from("2020-01-02")}
          onselectday={spy}
        />
      );

      // try clicking a day outside the range
      await clickDay(month, "1 January");
      expect(spy.called).to.eq(false);

      // click a day inside the range
      await clickDay(month, "2 January");

      expect(spy.count).to.eq(1);
      expect(spy.last[0].detail.toString()).to.eq("2020-01-02");
    });

    it("supports a max date", async () => {
      const spy = createSpy<(e: CustomEvent<Temporal.PlainDate>) => void>();
      const month = await mount(
        <Fixture
          focusedDate={Temporal.PlainDate.from("2020-01-15")}
          max={Temporal.PlainDate.from("2020-01-30")}
          onselectday={spy}
        />
      );

      // try clicking a day outside the range
      await clickDay(month, "31 January");
      expect(spy.called).to.eq(false);

      // click a day inside the range
      await clickDay(month, "30 January");

      expect(spy.count).to.eq(1);
      expect(spy.last[0].detail.toString()).to.eq("2020-01-30");
    });

    it("supports min and max dates", async () => {
      const spy = createSpy<(e: CustomEvent<Temporal.PlainDate>) => void>();
      const month = await mount(
        <Fixture
          focusedDate={Temporal.PlainDate.from("2020-01-15")}
          min={Temporal.PlainDate.from("2020-01-02")}
          max={Temporal.PlainDate.from("2020-01-30")}
          onselectday={spy}
        />
      );

      // try clicking a day less than min
      await clickDay(month, "1 January");
      expect(spy.called).to.eq(false);

      // try clicking a day greater than max
      await clickDay(month, "31 January");
      expect(spy.called).to.eq(false);

      // click a day inside the range
      await clickDay(month, "30 January");
      expect(spy.count).to.eq(1);
      expect(spy.last[0].detail.toString()).to.eq("2020-01-30");
    });
  });

  describe("today support", () => {
    it("supports today date", async () => {
      const month = await mount(
        <Fixture
          focusedDate={Temporal.PlainDate.from("2020-01-01")}
          today={Temporal.PlainDate.from("2020-01-02")}
        />
      );

      const todayButton = getTodayButton(month);
      expect(todayButton).to.have.attribute("aria-label", "2 January");
    });
  });

  it("can show outside days", async () => {
    const month = await mount(
      <Fixture
        focusedDate={Temporal.PlainDate.from("2020-04-01")}
        showOutsideDays
      />
    );

    const outsideMarch = getDayButton(month, "30 March");
    const outsideMay = getDayButton(month, "3 May");

    expect(outsideMarch.part.contains("outside")).to.eq(true);
    expect(outsideMay.part.contains("outside")).to.eq(true);
  });

  describe("localization", async () => {
    it("localizes days and months", async () => {
      const month = await mount(
        <Fixture
          focusedDate={Temporal.PlainDate.from("2020-01-15")}
          locale="fr-FR"
        />
      );
      const grid = getGrid(month);

      const accessibleHeadings = grid.querySelectorAll(
        "th span:not([aria-hidden])"
      );
      expect(accessibleHeadings[0]).to.have.trimmed.text("lundi");
      expect(accessibleHeadings[1]).to.have.trimmed.text("mardi");
      expect(accessibleHeadings[2]).to.have.trimmed.text("mercredi");
      expect(accessibleHeadings[3]).to.have.trimmed.text("jeudi");
      expect(accessibleHeadings[4]).to.have.trimmed.text("vendredi");
      expect(accessibleHeadings[5]).to.have.trimmed.text("samedi");
      expect(accessibleHeadings[6]).to.have.trimmed.text("dimanche");

      const visualHeadings = grid.querySelectorAll(
        "th span[aria-hidden='true']"
      );
      expect(visualHeadings[0]).to.have.trimmed.text("L");
      expect(visualHeadings[1]).to.have.trimmed.text("M");
      expect(visualHeadings[2]).to.have.trimmed.text("M");
      expect(visualHeadings[3]).to.have.trimmed.text("J");
      expect(visualHeadings[4]).to.have.trimmed.text("V");
      expect(visualHeadings[5]).to.have.trimmed.text("S");
      expect(visualHeadings[6]).to.have.trimmed.text("D");

      const title = getMonthHeading(month);
      expect(title).to.have.trimmed.text("janvier");

      const button = getDayButton(month, "15 janvier");
      expect(button).to.exist;
    });

    it("has configurable week day formatting", async () => {
      const month = await mount(
        <Fixture
          focusedDate={Temporal.PlainDate.from("2020-01-15")}
          formatWeekday="short"
        />
      );
      const grid = getGrid(month);

      const accessibleHeadings = grid.querySelectorAll(
        "th span:not([aria-hidden])"
      );
      expect(accessibleHeadings[0]).to.have.trimmed.text("Monday");
      expect(accessibleHeadings[1]).to.have.trimmed.text("Tuesday");
      expect(accessibleHeadings[2]).to.have.trimmed.text("Wednesday");
      expect(accessibleHeadings[3]).to.have.trimmed.text("Thursday");
      expect(accessibleHeadings[4]).to.have.trimmed.text("Friday");
      expect(accessibleHeadings[5]).to.have.trimmed.text("Saturday");
      expect(accessibleHeadings[6]).to.have.trimmed.text("Sunday");

      const visualHeadings = grid.querySelectorAll(
        "th span[aria-hidden='true']"
      );
      expect(visualHeadings[0]).to.have.trimmed.text("Mon");
      expect(visualHeadings[1]).to.have.trimmed.text("Tue");
      expect(visualHeadings[2]).to.have.trimmed.text("Wed");
      expect(visualHeadings[3]).to.have.trimmed.text("Thu");
      expect(visualHeadings[4]).to.have.trimmed.text("Fri");
      expect(visualHeadings[5]).to.have.trimmed.text("Sat");
      expect(visualHeadings[6]).to.have.trimmed.text("Sun");
    });

    it("renders parts for each day corresponding to day number", async () => {
      const mapToDayNumber = (firstDayOfWeek: number, i: number) =>
        (i + firstDayOfWeek) % 7;

      const firstDayOfWeek = 2;
      const month = await mount(
        <Fixture
          focusedDate={Temporal.PlainDate.from("2020-01-15")}
          firstDayOfWeek={firstDayOfWeek}
        />
      );
      const grid = getGrid(month);

      const headings = grid.querySelectorAll("th");
      const days = grid.rows[2]!.querySelectorAll("button");

      // sanity check
      expect(headings.length).to.eq(7);
      expect(days.length).to.eq(7);

      for (let i = 0; i < 7; i++) {
        const heading = headings[i]!;
        const day = days[i]!;
        const part = `day-${mapToDayNumber(firstDayOfWeek, i)}`;

        expect(heading.part.contains(part)).to.eq(
          true,
          `expected part to contain "${part}", got "${heading.part}"`
        );
        expect(day.part.contains(part)).to.eq(
          true,
          `expected part to contain "${part}, got "${day.part}"`
        );
      }
    });
  });
});
