import { it, expect } from "vitest";

// components are often imported on a server by accident, e.g. by Next.js.
// they can't render there, but importing them must not throw.
it("can be imported where there is no DOM", async () => {
  expect(globalThis.HTMLElement).toBeUndefined();
  expect(globalThis.customElements).toBeUndefined();

  const cally = await import("./index.js");

  expect(() => cally.CalendarDate.define("calendar-server")).not.toThrow();
});
