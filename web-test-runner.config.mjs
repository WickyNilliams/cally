import { esbuildPlugin } from "@web/dev-server-esbuild";
import { playwrightLauncher } from "@web/test-runner-playwright";

const filteredLogs = ["Lit is in dev mode"];

export default /** @type {import("@web/test-runner").TestRunnerConfig} */ ({
  files: "src/**/*.test.{js,ts,tsx}",
  nodeResolve: true,

  browsers: [
    playwrightLauncher({ product: "chromium" }),
    // TODO: had weird issues related to keyboard input in FF, disabling for now
    // playwrightLauncher({ product: "firefox" }),
    playwrightLauncher({ product: "webkit" }),
  ],

  // TODO: work out why lit dev mode message is being logged
  filterBrowserLogs(log) {
    const arg = log.args[0];

    return typeof arg === "string"
      ? !filteredLogs.some((l) => arg.includes(l))
      : true;
  },

  plugins: [
    esbuildPlugin({
      target: "auto",
      ts: true,
      tsx: true,
      tsconfig: "tsconfig.json",
    }),
  ],
});
