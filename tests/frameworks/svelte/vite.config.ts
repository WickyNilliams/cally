import { defineConfig } from "vitest/config";
import { svelte } from "@sveltejs/vite-plugin-svelte";
import { playwright } from "@vitest/browser-playwright";

export default defineConfig({
  plugins: [svelte()],
  resolve: {
    // the shared tests are outside of this app, but must use its vitest
    dedupe: ["vitest"],
  },
  test: {
    projects: [
      {
        extends: true,
        resolve: { conditions: ["browser"] },
        test: {
          name: "browser",
          include: ["src/**/*.browser.test.ts"],
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
          include: ["src/**/*.server.test.ts"],
          environment: "node",
        },
      },
    ],
  },
});
