// @ts-check

import sitemap from "@astrojs/sitemap";
import { defineConfig } from "astro/config";
import rehypeFigure from "./src/plugins/rehype-figure.mjs";

// https://astro.build/config
export default defineConfig({
  site: "https://akbarmr.dev",
  base: "/",
  integrations: [sitemap()],

  markdown: {
    remarkPlugins: [],
    rehypePlugins: [rehypeFigure],
    shikiConfig: {
      theme: "css-variables",
      langs: [],
      wrap: true,
    },
  },
});
