// @ts-check

import sitemap from "@astrojs/sitemap";
import { defineConfig } from "astro/config";

// https://astro.build/config
export default defineConfig({
  site: "https://akbarmr.dev",
  base: "/",
  integrations: [sitemap()],

  markdown: {
    shikiConfig: {
      theme: "css-variables",
      langs: [],
      wrap: true,
    },
  },
});
