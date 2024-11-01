import { sendKeys, sendMouse } from "@web/test-runner-commands";
import { fixture } from "atomico/test-dom";
import type { VNodeAny } from "atomico/types/vnode";
import type { CalendarDate } from "../calendar-date/calendar-date.js";
import type { CalendarMonth } from "../calendar-month/calendar-month.js";
import type { CalendarRange } from "../calendar-range/calendar-range.js";
import { nextFrame } from "@open-wc/testing";

type SpySubject = (...args: any[]) => any;

const defineGetter = <TObj, TReturn>(
  obj: TObj,
  name: string,
  getter: () => TReturn
) => {
  Object.defineProperty(obj, name, {
    enumerable: true,
    get: getter,
  });
};

export async function sendShiftPress(key: string) {
  await sendKeys({ down: "Shift" });
  await sendKeys({ press: key });
  await sendKeys({ up: "Shift" });
}

/**
 * Creates a spy for use in tests.
 */
export function createSpy<T extends SpySubject>(fn?: T) {
  const _calls: Parameters<T>[] = [];

  function spy(...args: Parameters<T>): ReturnType<T> {
    _calls.push(args);
    return fn?.(...args);
  }

  defineGetter(spy, "calls", () => _calls);
  defineGetter(spy, "count", () => _calls.length);
  defineGetter(spy, "called", () => _calls.length > 0);
  defineGetter(spy, "first", () => _calls[0]);
  defineGetter(spy, "last", () => _calls[_calls.length - 1]);

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
  | InstanceType<typeof CalendarRange>;

export async function mount<T extends CalendarInstance>(node: VNodeAny) {
  const calendar = fixture<T>(node);
  await nextFrame();
  return calendar;
}

export async function click(element: Element) {
  const { x, y, width, height } = element.getBoundingClientRect();

  const position: [number, number] = [
    Math.floor(x + window.scrollX + width / 2),
    Math.floor(y + window.scrollY + height / 2),
  ];

  await sendMouse({ type: "click", position });
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

export function getCalendarVisibleHeading(
  calendar: CalendarInstance
): HTMLElement {
  const slot = calendar.shadowRoot!.querySelector(`[part=heading]`);
  const heading = slot?.querySelector<HTMLElement>(`[aria-hidden]`);

  if (!heading) {
    throw new Error("Could not find visible heading for calendar");
  }

  return heading;
}

export function getCalendarHeading(calendar: CalendarInstance): HTMLElement {
  const group = calendar.shadowRoot!.querySelector(`[role="group"]`)!;

  const labelledById = group.getAttribute("aria-labelledby");
  if (!labelledById) {
    throw new Error("No aria-labelledby attribute found on group");
  }

  const heading = calendar.shadowRoot!.getElementById(labelledById);
  if (!heading) {
    throw new Error("No heading found for calendar");
  }

  return heading;
}

export function getMonthHeading(month: MonthInstance): HTMLElement {
  const table = getGrid(month);

  const labelledById = table.getAttribute("aria-labelledby");
  if (!labelledById) {
    throw new Error("No aria-labelledby attribute found on table");
  }

  const heading = month.shadowRoot!.getElementById(labelledById);
  if (!heading) {
    throw new Error("No heading found for month");
  }

  return heading;
}

export function getPrevPageButton(calendar: CalendarInstance) {
  return calendar.shadowRoot!.querySelector<HTMLButtonElement>(
    `button[part~="previous"]`
  )!;
}

export function getNextPageButton(calendar: CalendarInstance) {
  return calendar.shadowRoot!.querySelector<HTMLButtonElement>(
    `button[part~="next"]`
  )!;
}

export function getSelectedDays(month: MonthInstance) {
  return [
    ...month.shadowRoot!.querySelectorAll<HTMLButtonElement>(
      `button[aria-pressed="true"]`
    ),
  ];
}

export function getDayButton(month: MonthInstance, dateLabel: string) {
  const grid = getGrid(month);

  if (!grid) {
    throw new Error(`No grid found for date: ${dateLabel}`);
  }

  return grid.querySelector<HTMLButtonElement>(
    `button[aria-label="${dateLabel}"]`
  )!;
}

export async function clickDay(month: MonthInstance, dateLabel: string) {
  const button = getDayButton(month, dateLabel);

  if (!button) {
    throw new Error(`No button found for date: ${dateLabel}`);
  }

  await click(button);
}

export function getActiveElement(root: Document | ShadowRoot = document) {
  if (
    root.activeElement &&
    "shadowRoot" in root.activeElement &&
    root.activeElement.shadowRoot
  ) {
    return getActiveElement(root.activeElement.shadowRoot);
  }

  return root.activeElement;
}
