/// <reference types="vitest" />
import { defineConfig } from "vite";
import dts from "vite-plugin-dts";
import { transform } from "esbuild";
import { appendFile, readFile } from "fs/promises";
import { playwright } from "@vitest/browser-playwright";

const fileName = "cally";

export default defineConfig({
  build: {
    target: "esnext",
    lib: {
      entry: ["src/index.ts"],
      formats: ["es"],
      fileName,
    },
    // vite's lib mode intentionally skips esbuild's whitespace/syntax
    // compression for ES output, leaving ~30% on the table, so minification
    // is handled by the minify-lib plugin below instead
    minify: false,
  },
  plugins: [
    // collapse whitespace inside css`` tagged template literals, which
    // esbuild won't touch. our sheets contain no backticks, ${}, or strings
    {
      name: "minify-css-literals",
      apply: "build",
      transform(code, id) {
        if (!id.includes("/src/") || !code.includes("css`")) return;
        return {
          code: code.replace(/css`([^`$]*)`/g, (_, text) => {
            const min = text
              .replace(/\s+/g, " ")
              .replace(/\s*([{}:;,])\s*/g, "$1")
              .trim();
            return `css\`${min}\``;
          }),
          map: null,
        };
      },
    },

    {
      name: "minify-lib",
      apply: "build",
      enforce: "post",
      async renderChunk(code) {
        const result = await transform(code, {
          minify: true,
          target: "esnext",
        });
        return { code: result.code, map: null };
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
      provider: playwright(),
      instances: [{ browser: "chromium" }],
      headless: true,
      screenshotFailures: false,
    },
  },
});
