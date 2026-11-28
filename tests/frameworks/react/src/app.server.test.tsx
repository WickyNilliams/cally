import { expect, it } from "vitest";

// cally uses browser APIs as soon as it is imported. once that is fixed,
// this should render the app with `renderToString` from "react-dom/server"
it("can't import cally on a server", async () => {
  await expect(import("./App")).rejects.toThrow("document is not defined");
});
