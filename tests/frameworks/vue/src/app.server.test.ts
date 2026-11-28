import { expect, it } from "vitest";

// vue can't render v-model on anything other than form elements on a server
it("can't render v-model on a server", async () => {
  await expect(import("./App.vue")).rejects.toThrow(
    "v-model can only be used on <input>, <textarea> and <select> elements",
  );
});

// cally uses browser APIs as soon as it is imported. once that is fixed,
// this should render the app with `renderToString` from "vue/server-renderer"
it("can't import cally on a server", async () => {
  await expect(import("./AppListeners.vue")).rejects.toThrow(
    "document is not defined",
  );
});
