import atomico from "@atomico/vite";
import { defineConfig } from "vite";

export default defineConfig({
  build: {
    target: "esnext",
    lib: {
      entry: "src/index.ts",
      formats: ["es"],
    },
    minify: true,
  },
  plugins: [
    ...atomico({
      cssLiterals: { postcss: true, minify: true },
    }),
  ],
});
