/// <reference types="vitest" />
import { defineConfig, transformWithEsbuild } from "vite";
import dts from "vite-plugin-dts";
import { fileURLToPath } from "url";
import { playwright } from "@vitest/browser-playwright";
import staticJsx from "./vite-plugin-static-jsx.js";

// each component can be imported by itself, e.g. `import "cally/calendar-date"`
const components = {
  "calendar-date": "src/calendar-date/calendar-date.ts",
  "calendar-range": "src/calendar-range/calendar-range.ts",
  "calendar-multi": "src/calendar-multi/calendar-multi.ts",
  "calendar-month": "src/calendar-month/calendar-month.tsx",
  "calendar-heading": "src/calendar-heading/calendar-heading.ts",
  "calendar-select-month": "src/calendar-year-month/calendar-select-month.ts",
  "calendar-select-year": "src/calendar-year-month/calendar-select-year.ts",
};

// there are two builds:
//
// - the default has an entry for everything (index) and for each component.
//   what they have in common ends up in chunks, shared by all of them.
// - "standalone" is everything as a single file, for use directly from a CDN.
export default defineConfig(({ mode }) => {
  const standalone = mode === "standalone";

  return {
    build: {
      target: "esnext",
      emptyOutDir: !standalone,
      lib: {
        formats: ["es"],
        entry: standalone
          ? { cally: "src/index.ts" }
          : { index: "src/index.ts", ...components },
      },
      rollupOptions: {
        output: { chunkFileNames: "chunks/[name]-[hash].js" },
      },
      minify: true,
    },
    resolve: {
      alias: {
        // the jsx runtime used by tests, to declare fixtures
        "test-jsx": fileURLToPath(
          new URL("./src/utils/test-jsx", import.meta.url),
        ),
      },
    },
    plugins: [
      staticJsx(),

      // vite does not remove whitespace from es modules in lib mode, as it can
      // hinder tree-shaking. since defining the elements is a side effect, there
      // is nothing to be shaken, so we are better off with the smaller file.
      {
        name: "minify-es",
        apply: "build",
        renderChunk: {
          order: "post",
          handler: (code, chunk) =>
            transformWithEsbuild(code, chunk.fileName, {
              minify: true,
              target: "esnext",
            }),
        },
      },

      // declarations are not rolled up into a file per entry, as each would
      // then have its own copy of every type, which are not interchangeable.
      !standalone &&
        dts({
          tsconfigPath: "./tsconfig.build.json",
          exclude: [
            "**/*.test.*",
            "src/utils/test.ts",
            "src/utils/test-jsx",
            "src/utils/jsx-static",
          ],
        }),
    ],
    test: {
      setupFiles: ["./vitest.setup.ts"],
      browser: {
        enabled: true,
        provider: playwright({
          // allows tests to force garbage collection, to check for leaks
          launchOptions: { args: ["--js-flags=--expose-gc"] },
        }),
        instances: [{ browser: "chromium" }],
        headless: true,
        screenshotFailures: false,
      },
    },
  };
});
