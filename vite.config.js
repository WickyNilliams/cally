/// <reference types="vitest" />
import atomico from "@atomico/vite";
import { defineConfig } from "vite";
import dts from "vite-plugin-dts";
import { appendFile, readFile } from "fs/promises";
import { playwright } from "@vitest/browser-playwright";
import { encode } from "@jridgewell/sourcemap-codec";

const fileName = "cally";

/**
 * @atomico/vite's plugins return source maps with decoded mappings, which
 * rollup allowed, but vite 8's bundler, rolldown, doesn't. so they're encoded
 * here. this can go once atomico does it, or once atomico is gone.
 */
function encodeMaps(plugin) {
  const hook = plugin.transform;
  if (!hook) return plugin;
  const handler = typeof hook === "function" ? hook : hook.handler;

  async function transform(...args) {
    const result = await handler.apply(this, args);
    if (!Array.isArray(result?.map?.mappings)) return result;

    const mappings = encode(result.map.mappings);
    return { ...result, map: { ...result.map, mappings } };
  }

  return {
    ...plugin,
    transform:
      typeof hook === "function" ? transform : { ...hook, handler: transform },
  };
}

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
  plugins: [
    ...atomico({
      cssLiterals: { postcss: true, minify: true },
    }).map(encodeMaps),

    dts({
      bundleTypes: { bundledPackages: ["atomico"] },
      tsconfigPath: "./tsconfig.build.json",

      // workaround to include the global types
      async afterBuild() {
        const globals = await readFile("./src/globals.d.ts");
        await appendFile(`./dist/${fileName}.d.ts`, globals);
      },
    }),
  ],
  optimizeDeps: {
    include: ["atomico/jsx-dev-runtime"],
  },
  test: {
    setupFiles: ["./vitest.setup.ts"],
    browser: {
      enabled: true,
      provider: playwright(),
      instances: [
        { browser: "chromium" },
        { browser: "firefox" },
        { browser: "webkit" },
      ],
      headless: true,
      screenshotFailures: false,
    },
  },
});
