/// <reference types="vitest" />
import { defineConfig } from "vite";
import dts from "vite-plugin-dts";
import { transform } from "esbuild";
import { appendFile, readFile } from "fs/promises";
import { playwright } from "@vitest/browser-playwright";
import { precompileTemplates } from "./precompile-templates.mjs";

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
    precompileTemplates(),

    // minify css`` tagged template literals with esbuild's css minifier,
    // which the js minifier won't touch. our sheets contain no backticks or ${}
    {
      name: "minify-css-literals",
      apply: "build",
      async transform(code, id) {
        if (!id.includes("/src/") || !code.includes("css`")) return;

        const literals = [...code.matchAll(/css`([^`$]*)`/g)];
        for (const [outer, text] of literals) {
          const result = await transform(text, { loader: "css", minify: true });
          code = code.replace(outer, `css\`${result.code.trim()}\``);
        }

        return { code, map: null };
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
          // internal cross-class members are named with a trailing
          // underscore so they can be safely renamed here
          mangleProps: /_$/,
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
