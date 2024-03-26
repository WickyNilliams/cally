import atomico from "@atomico/vite";
import { defineConfig } from "vite";
import dts from "vite-plugin-dts";
import { appendFile, readFile } from "fs/promises";

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
  plugins: [
    ...atomico({
      cssLiterals: { postcss: true, minify: true },
    }),

    dts({
      rollupTypes: true,
      bundledPackages: ["atomico"],

      // workaround to include the global types
      async afterBuild() {
        const globals = await readFile("./src/globals.d.ts");
        await appendFile(`./dist/${fileName}.d.ts`, globals);
      },
    }),
  ],
});
