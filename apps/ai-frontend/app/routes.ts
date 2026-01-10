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
    route("timeline/ticker", "routes/timeline.ticker.tsx"),
    route("timeline/general", "routes/timeline.general.tsx"),
  ]),
] satisfies RouteConfig;
