import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { playwright } from "@vitest/browser-playwright";

export default defineConfig({
  plugins: [react()],
  resolve: {
    // the shared tests are outside of this app, but must use its vitest
    dedupe: ["vitest"],
  },
  test: {
    projects: [
      {
        extends: true,
        test: {
          name: "browser",
          include: ["src/**/*.browser.test.tsx"],
          browser: {
            enabled: true,
            provider: playwright(),
            instances: [{ browser: "chromium" }],
            headless: true,
            screenshotFailures: false,
          },
        },
      },
      {
        extends: true,
        test: {
          name: "server",
          include: ["src/**/*.server.test.tsx"],
          environment: "node",
        },
      },
    ],
  },
});
