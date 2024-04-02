import { defineConfig } from "astro/config";
import atomico from "@atomico/vite";

// https://astro.build/config
export default defineConfig({
  site: "https://wicky.nillia.ms",
  base: "/cally",
  trailingSlash: "always",
  devToolbar: {
    enabled: false,
  },
  vite: {
    plugins: [
      ...atomico({
        cssLiterals: { postcss: true, minify: true },
      }),
    ],
  },
});
