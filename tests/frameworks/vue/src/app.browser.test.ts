import { describe, expect, it } from "vitest";
import { userEvent } from "vitest/browser";
import { render } from "vitest-browser-vue";
import App from "./App.vue";
import AppListeners from "./AppListeners.vue";
import { day } from "./day";

describe.each([
  ["with v-model", App],
  ["with listeners", AppListeners],
])("%s", (_, component) => {
  it("sets props", async () => {
    await render(component);

    // the second month, given by `months` and `offset`
    await expect.poll(() => day("5 April")).toBeTruthy();
  });

  it("sets functions as props", async () => {
    await render(component);

    await expect
      .poll(() => day("13 March").getAttribute("aria-disabled"))
      .toBe("true");
  });

  it("updates state from events", async () => {
    const screen = await render(component);

    await expect.poll(() => day("5 March")).toBeTruthy();
    await userEvent.click(day("5 March"));
    await userEvent.click(day("9 March"));

    await expect
      .element(screen.getByRole("status"))
      .toHaveTextContent("2024-03-05/2024-03-09");
  });

  it("updates the calendar from state", async () => {
    const screen = await render(component);

    await screen.getByRole("button", { name: "Select" }).click();

    await expect
      .poll(() => day("21 March").getAttribute("aria-pressed"))
      .toBe("true");
  });

  it("works after being unmounted and mounted again", async () => {
    const first = await render(component);
    await expect.poll(() => day("5 March")).toBeTruthy();
    await first.unmount();

    const screen = await render(component);
    await expect.poll(() => day("5 March")).toBeTruthy();
    await userEvent.click(day("5 March"));
    await userEvent.click(day("9 March"));

    await expect
      .element(screen.getByRole("status"))
      .toHaveTextContent("2024-03-05/2024-03-09");
  });
});
