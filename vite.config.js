/// <reference types="vitest" />
import { defineConfig, transformWithEsbuild } from "vite";
import dts from "vite-plugin-dts";
import { appendFile, readFile } from "fs/promises";
import { fileURLToPath } from "url";
import { playwright } from "@vitest/browser-playwright";
import staticJsx from "./vite-plugin-static-jsx.js";

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
      provider: playwright({
        // allows tests to force garbage collection, to check for leaks
        launchOptions: { args: ["--js-flags=--expose-gc"] },
      }),
      instances: [{ browser: "chromium" }],
      headless: true,
      screenshotFailures: false,
    },
  },
});
