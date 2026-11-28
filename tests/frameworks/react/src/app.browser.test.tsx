import { render } from "vitest-browser-react";
import { testCalendar } from "../../shared/suite";
import { App } from "./App";

testCalendar(async () => {
  const screen = await render(<App />);
  return () => screen.unmount();
});
