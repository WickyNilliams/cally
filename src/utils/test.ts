import { page } from "@vitest/browser/context";
import { fixture } from "atomico/test-dom";
import type { VNodeAny } from "atomico/types/vnode";
import type { CalendarDate } from "../calendar-date/calendar-date.js";
import type { CalendarMonth } from "../calendar-month/calendar-month.js";
import type { CalendarRange } from "../calendar-range/calendar-range.js";
import { vi } from "vitest";

async function nextFrame() {
  return new Promise((resolve) => requestAnimationFrame(() => resolve(undefined)));
}

type SpySubject = (...args: any[]) => any;

export async function sendShiftPress(key: string) {
  await page.keyboard.down("Shift");
  await page.keyboard.press(key);
  await page.keyboard.up("Shift");
}

/**
 * Creates a spy for use in tests that works across Node/browser boundary.
 */
export function createSpy<T extends SpySubject>(fn?: T) {
  const mock = vi.fn(fn);

  return Object.assign(mock, {
    get calls() { return mock.mock.calls as Parameters<T>[]; },
    get called() { return mock.mock.calls.length > 0; },
    get count() { return mock.mock.calls.length; },
    get first() { return mock.mock.calls[0] as Parameters<T>; },
    get last() { return mock.mock.calls[mock.mock.calls.length - 1] as Parameters<T>; },
  });
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

  const positionX = Math.floor(x + window.scrollX + width / 2);
  const positionY = Math.floor(y + window.scrollY + height / 2);

  await page.mouse.click(positionX, positionY);
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

export function getTodayButton(month: MonthInstance) {
  return month.shadowRoot!.querySelector<HTMLButtonElement>(
    `button[part~="today"]`
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
