import { describe } from "vitest";
import { render } from "vitest-browser-svelte";
import { testCalendar } from "../../shared/suite";
import App from "./App.svelte";
import AppLegacy from "./AppLegacy.svelte";

// the two kinds of component have different types, which needn't concern us
const components: [string, typeof App][] = [
  ["svelte 5", App],
  ["svelte 4 syntax", AppLegacy as unknown as typeof App],
];

describe.each(components)("%s", (_, component) => {
  testCalendar(async () => {
    const screen = await render(component);
    return () => screen.unmount();
  });
});
