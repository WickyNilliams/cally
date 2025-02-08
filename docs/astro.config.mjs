import { defineConfig } from "astro/config";
import atomico from "@atomico/vite";
import rehypeSlug from "rehype-slug";
import rehypeAutolinkHeadings from "rehype-autolink-headings";
import { h } from "hastscript";

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

  // this is used for the changelog.
  // we're importing changelog.md from the root of the repo
  // so it needs some processing to add slugs and autolinks
  markdown: {
    rehypePlugins: [
      rehypeSlug,
      [
        rehypeAutolinkHeadings,
        {
          behavior: "append",
          content: () => h("span.hash", "#"),
          test: ({ tagName }) => tagName === "h2",
        },
      ],
    ],
  },
});
