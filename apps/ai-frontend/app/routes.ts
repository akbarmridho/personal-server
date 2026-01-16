import {
  index,
  layout,
  type RouteConfig,
  route,
} from "@react-router/dev/routes";

export default [
  index("routes/home.tsx"),

  // Timeline routes with shared layout
  layout("routes/_layout.timeline.tsx", [
    route("timeline/all", "routes/timeline.all.tsx"),
    route("timeline/ticker", "routes/timeline.ticker.tsx"),
    route("timeline/non-ticker", "routes/timeline.non-ticker.tsx"),
    // Document detail page (shares same sidebar/header)
    route("document/:id", "routes/document.$id.tsx"),
  ]),

  // Embed route (no layout, optimized for iframe)
  route("embed/document/:id", "routes/embed.document.$id.tsx"),

  // Catch-all route for unmatched paths
  route("*", "routes/$.tsx"),
] satisfies RouteConfig;
