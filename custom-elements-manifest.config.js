import cally from "./cem-plugin.js";

export default {
  globs: ["src/**/*.{ts,tsx}"],
  exclude: [
    "src/**/*.test.*",
    "src/utils/test.ts",
    "src/utils/test-jsx/**",
    "src/utils/jsx-static/**",
  ],
  outdir: "dist",
  plugins: [cally()],
};
