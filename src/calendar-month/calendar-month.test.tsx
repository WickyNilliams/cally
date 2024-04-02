import { expect } from "@open-wc/testing";
import { sendKeys } from "@web/test-runner-commands";
import type { VNodeAny } from "atomico/types/vnode.js";
import { clickDay, createSpy, getGrid, getMonth } from "../utils/test.js";
import {
  CalendarMonthContext,
  type CalendarDateContext,
  type CalendarRangeContext,
} from "./CalendarMonthContext.js";
import { CalendarMonth } from "../calendar-month/calendar-month.js";
import { fixture } from "atomico/test-dom";
import { PlainDate } from "../utils/temporal.js";
import { DateWindow } from "../utils/DateWindow.js";
import { today } from "../utils/date.js";

type MonthContextInstance = InstanceType<typeof CalendarMonthContext>;

interface TestPropsBase {
  onselectday: (e: CustomEvent<PlainDate>) => void;
  onfocusday: (e: CustomEvent<PlainDate>) => void;
  focusedDate: PlainDate;
  dir: "ltr" | "rtl";
}

interface DateTestProps extends TestPropsBase, CalendarDateContext {}
interface RangeTestProps extends TestPropsBase, CalendarRangeContext {}

const isWeekend = (date: Date) => date.getDay() === 0 || date.getDay() === 6;

function Fixture({
  onselectday,
  onfocusday,
  focusedDate = today(),
  dir,
  ...props
}: Partial<DateTestProps> | Partial<RangeTestProps>): VNodeAny {
  const dateWindow = new DateWindow(
    focusedDate.toPlainYearMonth(),
    { months: 1 },
    focusedDate
  );

  return (
    <CalendarMonthContext
      onselectday={onselectday}
      onfocusday={onfocusday}
      dir={dir}
      value={{
        firstDayOfWeek: 1,
        locale: "en-GB",
        dateWindow,
        ...props,
      }}
    >
      <CalendarMonth />
    </CalendarMonthContext>
  );
}

export async function mount(node: VNodeAny) {
  const context = fixture<MonthContextInstance>(node);
  const month = getMonth(context);

  await context.updated;
  await month.updated;

  return month;
}

describe("CalendarMonth", () => {
  it("is defined", async () => {
    const calendar = await mount(<Fixture />);
    expect(calendar).to.be.instanceOf(CalendarMonth);
  });

  describe("a11y/ARIA requirements", () => {
    describe("grid", () => {
      it("is labelled", async () => {
        const month = await mount(<Fixture />);
        const grid = getGrid(month);

        // has accessible label
        const labelledById = grid.getAttribute("aria-labelledby");
        const title = month.shadowRoot!.getElementById(labelledById!);
        expect(title).not.to.eq(undefined);
      });

      it("marks selected day as pressed", async () => {
        const month = await mount(
          <Fixture
            focusedDate={PlainDate.from("2020-01-01")}
            value={PlainDate.from("2020-01-02")}
          />
        );
        const grid = getGrid(month);

        // should be single selected element
        const selected = grid.querySelectorAll<HTMLButtonElement>(
          `[aria-pressed="true"]`
        );

        expect(selected.length).to.eq(1);
        expect(selected[0]).to.have.trimmed.text("2");
        expect(selected[0]).to.have.attribute("aria-label", "2 January");
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
        ).to.eq(true);

        // only one button has tabindex 0
        const focusable =
          grid.querySelectorAll<HTMLButtonElement>(`[tabindex="0"]`);
        expect(focusable.length).to.eq(1);
        expect(focusable[0]).to.have.trimmed.text("1");
        expect(focusable[0]).to.have.attribute("aria-label", "1 January");
      });

      it("correctly abbreviates the shortened day names");
    });
  });

  describe("mouse interaction", () => {
    it("can select a date", async () => {
      const spy = createSpy<(e: CustomEvent<PlainDate>) => void>();
      const calendar = await mount(
        <Fixture focusedDate={PlainDate.from("2020-04-01")} onselectday={spy} />
      );

      await clickDay(calendar, "19 April");

      expect(spy.count).to.eq(1);
      expect(spy.last[0].detail.toString()).to.eq("2020-04-19");
    });

    it("cannot select a disabled date", async () => {
      const spy = createSpy<(e: CustomEvent<PlainDate>) => void>();
      const calendar = await mount(
        <Fixture
          focusedDate={PlainDate.from("2020-01-03")}
          onselectday={spy}
          isDateDisallowed={isWeekend}
        />
      );

      await clickDay(calendar, "4 January");

      expect(spy.called).to.eq(false);
    });
  });

  describe("keyboard interaction", () => {
    it("can select a date", async () => {
      const spy = createSpy<(e: CustomEvent<PlainDate>) => void>();
      await mount(
        <Fixture focusedDate={PlainDate.from("2020-04-19")} onfocusday={spy} />
      );

      await sendKeys({ press: "Tab" });
      await sendKeys({ press: "Enter" });

      expect(spy.count).to.eq(1);
      expect(spy.last[0].detail.toString()).to.eq("2020-04-19");
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

      await sendKeys({ press: "Tab" });
      await sendKeys({ press: "Enter" });

      expect(spy.called).to.eq(false);
    });

    it("can move focus to previous day", async () => {
      const spy = createSpy<(e: CustomEvent<PlainDate>) => void>();
      await mount(
        <Fixture focusedDate={PlainDate.from("2020-04-19")} onfocusday={spy} />
      );

      await sendKeys({ press: "Tab" });
      await sendKeys({ press: "ArrowLeft" });

      expect(spy.count).to.eq(1);
      expect(spy.last[0].detail.toString()).to.eq("2020-04-18");
    });

    it("can move focus to next day ", async () => {
      const spy = createSpy<(e: CustomEvent<PlainDate>) => void>();
      await mount(
        <Fixture focusedDate={PlainDate.from("2020-04-19")} onfocusday={spy} />
      );

      await sendKeys({ press: "Tab" });
      await sendKeys({ press: "ArrowRight" });

      expect(spy.count).to.eq(1);
      expect(spy.last[0].detail.toString()).to.eq("2020-04-20");
    });

    it("can move focus to previous week", async () => {
      const spy = createSpy<(e: CustomEvent<PlainDate>) => void>();
      await mount(
        <Fixture focusedDate={PlainDate.from("2020-04-19")} onfocusday={spy} />
      );

      await sendKeys({ press: "Tab" });
      await sendKeys({ press: "ArrowUp" });

      expect(spy.count).to.eq(1);
      expect(spy.last[0].detail.toString()).to.eq("2020-04-12");
    });

    it("can move focus to next week", async () => {
      const spy = createSpy<(e: CustomEvent<PlainDate>) => void>();
      await mount(
        <Fixture focusedDate={PlainDate.from("2020-04-19")} onfocusday={spy} />
      );

      await sendKeys({ press: "Tab" });
      await sendKeys({ press: "ArrowDown" });

      expect(spy.count).to.eq(1);
      expect(spy.last[0].detail.toString()).to.eq("2020-04-26");
    });

    it("can move focus to start of week", async () => {
      const spy = createSpy<(e: CustomEvent<PlainDate>) => void>();
      await mount(
        <Fixture focusedDate={PlainDate.from("2020-04-16")} onfocusday={spy} />
      );

      await sendKeys({ press: "Tab" });
      await sendKeys({ press: "Home" });

      expect(spy.count).to.eq(1);
      expect(spy.last[0].detail.toString()).to.eq("2020-04-13");
    });

    it("can move focus to end of week", async () => {
      const spy = createSpy<(e: CustomEvent<PlainDate>) => void>();
      await mount(
        <Fixture focusedDate={PlainDate.from("2020-04-16")} onfocusday={spy} />
      );

      await sendKeys({ press: "Tab" });
      await sendKeys({ press: "End" });

      expect(spy.count).to.eq(1);
      expect(spy.last[0].detail.toString()).to.eq("2020-04-19");
    });

    it("can move focus to previous month", async () => {
      const spy = createSpy<(e: CustomEvent<PlainDate>) => void>();
      await mount(
        <Fixture focusedDate={PlainDate.from("2020-04-19")} onfocusday={spy} />
      );

      await sendKeys({ press: "Tab" });
      await sendKeys({ press: "PageUp" });

      expect(spy.count).to.eq(1);
      expect(spy.last[0].detail.toString()).to.eq("2020-03-19");
    });

    it("can move focus to next month", async () => {
      const spy = createSpy<(e: CustomEvent<PlainDate>) => void>();
      await mount(
        <Fixture focusedDate={PlainDate.from("2020-04-19")} onfocusday={spy} />
      );

      await sendKeys({ press: "Tab" });
      await sendKeys({ press: "PageDown" });

      expect(spy.count).to.eq(1);
      expect(spy.last[0].detail.toString()).to.eq("2020-05-19");
    });

    it("can move focus to previous year", async () => {
      const spy = createSpy<(e: CustomEvent<PlainDate>) => void>();
      await mount(
        <Fixture focusedDate={PlainDate.from("2020-04-19")} onfocusday={spy} />
      );

      await sendKeys({ press: "Tab" });
      await sendKeys({ down: "Shift" });
      await sendKeys({ press: "PageUp" });
      await sendKeys({ up: "Shift" });

      expect(spy.count).to.eq(1);
      expect(spy.last[0].detail.toString()).to.eq("2019-04-19");
    });

    it("can move focus to next year", async () => {
      const spy = createSpy<(e: CustomEvent<PlainDate>) => void>();
      await mount(
        <Fixture focusedDate={PlainDate.from("2020-04-19")} onfocusday={spy} />
      );

      await sendKeys({ press: "Tab" });
      await sendKeys({ down: "Shift" });
      await sendKeys({ press: "PageDown" });
      await sendKeys({ up: "Shift" });

      expect(spy.count).to.eq(1);
      expect(spy.last[0].detail.toString()).to.eq("2021-04-19");
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

      await sendKeys({ press: "Tab" });
      await sendKeys({ press: "ArrowRight" });

      expect(spy.count).to.eq(1);
      expect(spy.last[0].detail.toString()).to.eq("2020-01-04");
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

      await sendKeys({ press: "Tab" });
      await sendKeys({ press: "ArrowLeft" });
      expect(spy.last[0].detail.toString()).to.eq(focused);

      await sendKeys({ press: "ArrowRight" });
      expect(spy.last[0].detail.toString()).to.eq(focused);
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

        await sendKeys({ press: "Tab" });
        await sendKeys({ press: "ArrowLeft" });

        expect(spy.count).to.eq(1);
        expect(spy.last[0].detail.toString()).to.eq("2020-04-20");
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

        await sendKeys({ press: "Tab" });
        await sendKeys({ press: "ArrowRight" });

        expect(spy.count).to.eq(1);
        expect(spy.last[0].detail.toString()).to.eq("2020-04-18");
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
      await clickDay(month, "1 January");
      expect(spy.called).to.eq(false);

      // click a day inside the range
      await clickDay(month, "2 January");

      expect(spy.count).to.eq(1);
      expect(spy.last[0].detail.toString()).to.eq("2020-01-02");
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
      await clickDay(month, "31 January");
      expect(spy.called).to.eq(false);

      // click a day inside the range
      await clickDay(month, "30 January");

      expect(spy.count).to.eq(1);
      expect(spy.last[0].detail.toString()).to.eq("2020-01-30");
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
});
