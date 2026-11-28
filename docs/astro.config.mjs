import { defineConfig } from "astro/config";
import atomico from "../vite-plugin-atomico.js";
import { unified } from "@astrojs/markdown-remark";
import rehypeSlug from "rehype-slug";
import rehypeAutolinkHeadings from "rehype-autolink-headings";
import { h } from "hastscript";

// https://astro.build/config
export default defineConfig({
  site: "https://wicky.nillia.ms",
  base: "/cally",
  trailingSlash: "always",
  // astro 7 defaults to jsx whitespace rules, but the docs are written for
  // html's, where e.g. a line break between text and a link is a space
  compressHTML: true,
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
    processor: unified({
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
    }),
  },
});
