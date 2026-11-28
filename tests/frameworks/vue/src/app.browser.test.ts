import { describe } from "vitest";
import { render } from "vitest-browser-vue";
import { testCalendar } from "../../shared/suite";
import App from "./App.vue";
import AppListeners from "./AppListeners.vue";

describe.each([
  ["with v-model", App],
  ["with listeners", AppListeners],
])("%s", (_, component) => {
  testCalendar(async () => {
    const screen = await render(component);
    return () => screen.unmount();
  });
});
