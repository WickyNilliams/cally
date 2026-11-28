import { defineConfig } from "vitest/config";
import vue from "@vitejs/plugin-vue";
import { playwright } from "@vitest/browser-playwright";

export default defineConfig({
  plugins: [
    vue({
      template: {
        // as the docs instruct
        compilerOptions: {
          isCustomElement: (tag) => tag.startsWith("calendar-"),
        },
      },
    }),
  ],
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
