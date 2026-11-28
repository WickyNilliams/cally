// The tests every framework must pass, as cally should work the same in each.
//
// Each framework's app must render:
//
// - a `<calendar-range>` with `locale="en-GB"`, `months` of 2, `focusedDate`
//   of "2024-03-01", and `isDateDisallowed` set to a function which disallows
//   the 13th of each month
// - a `<calendar-month>` for each month, the second with `offset` of 1
// - an `<output>` showing the value, updated when it changes
// - a "Select" button, which sets the value to "2024-03-20/2024-03-22"
import { expect, it } from "vitest";
import { page, userEvent } from "vitest/browser";
import { day } from "./day";

/** Renders the app, and returns a function which unmounts it */
type Mount = () => Promise<() => unknown>;

export function testCalendar(mount: Mount) {
  it("sets props", async () => {
    await mount();

    // the second month, given by `months` and `offset`
    await expect.poll(() => day("5 April")).toBeTruthy();
  });

  it("sets functions as props", async () => {
    await mount();

    await expect
      .poll(() => day("13 March").getAttribute("aria-disabled"))
      .toBe("true");
  });

  it("updates state from events", async () => {
    await mount();

    await expect.poll(() => day("5 March")).toBeTruthy();
    await userEvent.click(day("5 March"));
    await userEvent.click(day("9 March"));

    await expect
      .element(page.getByRole("status"))
      .toHaveTextContent("2024-03-05/2024-03-09");
  });

  it("updates the calendar from state", async () => {
    await mount();

    await page.getByRole("button", { name: "Select" }).click();

    await expect
      .poll(() => day("21 March").getAttribute("aria-pressed"))
      .toBe("true");
  });

  it("works after being unmounted and mounted again", async () => {
    const unmount = await mount();
    await expect.poll(() => day("5 March")).toBeTruthy();
    await unmount();

    await mount();
    await expect.poll(() => day("5 March")).toBeTruthy();
    await userEvent.click(day("5 March"));
    await userEvent.click(day("9 March"));

    await expect
      .element(page.getByRole("status"))
      .toHaveTextContent("2024-03-05/2024-03-09");
  });
}
