import { afterEach, beforeEach } from "vitest";
import { userEvent, page } from "vitest/browser";
import type { CalendarDate } from "../calendar-date/calendar-date.js";
import type { CalendarMonth } from "../calendar-month/calendar-month.js";
import type { CalendarRange } from "../calendar-range/calendar-range.js";
import type { CalendarMulti } from "../calendar-multi/calendar-multi.js";
import {
  CalendarContext as Context,
  type CalendarContextValue,
} from "../calendar-month/CalendarMonthContext.js";
import type { Page } from "../calendar-heading/CalendarHeadingContext.js";
import { signal } from "./signals.js";
import type { PlainDate } from "./temporal.js";
import type { DaysOfWeek } from "./date.js";

export async function nextFrame() {
  return new Promise((resolve) =>
    requestAnimationFrame(() => resolve(undefined)),
  );
}

let host: HTMLElement;

beforeEach(() => {
  host = document.createElement("div");
  document.body.append(host);
});

afterEach(() => {
  host.remove();
});

/**
 * Adds a node to the document for the duration of a test
 */
export function fixture<T extends Element>(node: Element): T {
  host.append(node);
  return node as T;
}

interface CalendarContextBase {
  min?: PlainDate;
  max?: PlainDate;
  today?: PlainDate;
  firstDayOfWeek: DaysOfWeek;
  isDateDisallowed?: (date: Date) => boolean;
  getDayParts?: (date: Date) => string;
  page: Page;
  focusedDate: PlainDate;
  showOutsideDays?: boolean;
  showWeekNumbers?: boolean;
  locale?: string;
  formatWeekday: "narrow" | "short";
}

export interface CalendarDateContext extends CalendarContextBase {
  type: "date";
  value?: PlainDate;
}

export interface CalendarRangeContext extends CalendarContextBase {
  type: "range";
  value: [PlainDate, PlainDate] | [];
}

export interface CalendarMultiContext extends CalendarContextBase {
  type: "multi";
  value: PlainDate[];
}

/**
 * Stands in for a calendar, so that descendants can be tested in isolation.
 * Provides whatever its `value` is as context.
 */
export class CalendarContext extends HTMLElement {
  value!: CalendarDateContext | CalendarRangeContext | CalendarMultiContext;

  constructor() {
    super();

    this.addEventListener(Context.name, (e) => {
      const { type, value, ...rest } = this.value;
      const context: Record<string, unknown> = {
        ...Context.initial,
        type,
        value: signal([value ?? []].flat()),
      };

      for (const [key, value] of Object.entries(rest)) {
        context[key] = signal(value);
      }

      e.stopPropagation();
      (e as CustomEvent<(value: CalendarContextValue) => void>).detail(
        context as unknown as CalendarContextValue,
      );
    });
  }
}

customElements.define("calendar-ctx", CalendarContext);

type SpySubject = (...args: any[]) => any;

export async function sendShiftPress(key: string) {
  await userEvent.keyboard("{Shift>}");
  await userEvent.keyboard(`{${key}}`);
  await userEvent.keyboard("{/Shift}");
}

/**
 * Creates a spy for use in tests.
 */
export function createSpy<T extends SpySubject>(fn?: T) {
  const calls: Parameters<T>[] = [];

  function spy(...args: Parameters<T>): ReturnType<T> {
    calls.push(args);
    return fn?.(...args);
  }

  Object.defineProperties(spy, {
    calls: { get: () => calls },
    called: { get: () => calls.length > 0 },
    count: { get: () => calls.length },
    first: { get: () => calls[0] },
    last: { get: () => calls[calls.length - 1] },
  });

  return spy as {
    (...args: Parameters<T>): ReturnType<T>;
    readonly calls: Parameters<T>[];
    readonly called: boolean;
    readonly count: number;
    readonly first: Parameters<T>;
    readonly last: Parameters<T>;
  };
}

export type MonthInstance = InstanceType<typeof CalendarMonth>;
export type CalendarInstance =
  | InstanceType<typeof CalendarDate>
  | InstanceType<typeof CalendarRange>
  | InstanceType<typeof CalendarMulti>;

export async function mount<T extends CalendarInstance>(node: Element) {
  const calendar = fixture<T>(node);
  await nextFrame();
  return calendar;
}

export function getMonths(calendar: HTMLElement): MonthInstance[] {
  return [...calendar.querySelectorAll<MonthInstance>("calendar-month")!];
}

export function getMonth(calendar: HTMLElement): MonthInstance {
  return getMonths(calendar)[0]!;
}

export function getGrid(month: MonthInstance): HTMLTableElement {
  return month.shadowRoot!.querySelector(`[part="table"]`)!;
}

export function getCalendarVisibleHeading(calendar: CalendarInstance) {
  const heading = calendar
    .shadowRoot!.querySelector(`slot[part="heading"]`)
    ?.querySelector(`[aria-hidden="true"]`);

  if (!heading) {
    throw new Error("No visible heading found for calendar");
  }

  return heading?.shadowRoot?.textContent;
}

export function getCalendarHeading(calendar: CalendarInstance) {
  const calendarLocator = page.elementLocator(calendar);

  const group = calendarLocator.getByRole("group").element()!;
  const labelledById = group.getAttribute("aria-labelledby");
  if (!labelledById) {
    throw new Error("No aria-labelledby attribute found on group");
  }

  const heading = calendar.shadowRoot!.getElementById(labelledById);
  if (!heading) {
    throw new Error("No heading found for calendar");
  }

  return heading.shadowRoot?.textContent;
}

export function getMonthHeading(month: MonthInstance) {
  const table = getGrid(month);

  const labelledById = table.getAttribute("aria-labelledby");
  if (!labelledById) {
    throw new Error("No aria-labelledby attribute found on table");
  }

  const heading = month.shadowRoot!.getElementById(labelledById);
  if (!heading) {
    throw new Error("No heading found for month");
  }

  return heading.shadowRoot!.textContent;
}

export function getPrevPageButton(calendar: CalendarInstance) {
  const button = calendar.shadowRoot!.querySelector<HTMLButtonElement>(
    `button[part~="previous"]`,
  )!;
  return page.elementLocator(button);
}

export function getNextPageButton(calendar: CalendarInstance) {
  const button =
    calendar.shadowRoot!.querySelector<HTMLButtonElement>(
      `button[part~="next"]`,
    )!;
  return page.elementLocator(button);
}

export function getTodayButton(month: MonthInstance) {
  const button = month.shadowRoot!.querySelector<HTMLButtonElement>(
    `button[part~="today"]`,
  )!;
  return page.elementLocator(button);
}

export function getSelectedDays(month: MonthInstance) {
  return [
    ...month.shadowRoot!.querySelectorAll<HTMLButtonElement>(
      `button[aria-pressed="true"]`,
    ),
  ];
}

export function getDayButton(month: MonthInstance, dateLabel: string) {
  const grid = getGrid(month);

  if (!grid) {
    throw new Error(`No grid found for date: ${dateLabel}`);
  }

  return grid.querySelector<HTMLButtonElement>(
    `button[aria-label="${dateLabel}"]`,
  )!;
}

export async function clickDay(
  month: MonthInstance,
  dateLabel: string,
  options?: { force?: boolean },
) {
  const button = getDayButton(month, dateLabel);

  if (!button) {
    throw new Error(`No button found for date: ${dateLabel}`);
  }

  await page.elementLocator(button).click(options);
}
