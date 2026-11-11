/// <reference types="vitest" />
import { defineConfig } from "vite";
import dts from "vite-plugin-dts";
import { appendFile, readFile } from "fs/promises";
import { fileURLToPath } from "url";
import { playwright } from "@vitest/browser-playwright";
import minifyTemplates from "./vite-plugin-minify-templates.js";

const fileName = "cally";

export default defineConfig({
  build: {
    target: "esnext",
    lib: {
      entry: ["src/index.ts"],
      formats: ["es"],
      fileName,
    },
    minify: true,
  },
  resolve: {
    alias: {
      // jsx is only used by tests, to declare fixtures
      "test-jsx": fileURLToPath(
        new URL("./src/utils/test-jsx", import.meta.url),
      ),
    },
  },
  plugins: [
    minifyTemplates(),

    dts({
      rollupTypes: true,
      tsconfigPath: "./tsconfig.build.json",

      // workaround to include the global types
      async afterBuild() {
        const globals = await readFile("./src/globals.d.ts");
        await appendFile(`./dist/${fileName}.d.ts`, globals);
      },
    }),
  ],
  test: {
    setupFiles: ["./vitest.setup.ts"],
    browser: {
      enabled: true,
      provider: playwright(),
      instances: [{ browser: "chromium" }],
      headless: true,
      screenshotFailures: false,
    },
  },
});
