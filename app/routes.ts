import { type RouteConfig, index, route } from "@react-router/dev/routes";

export default [
  index("routes/home.tsx"),
  route("login", "routes/login.tsx"),
  route("signup", "routes/signup.tsx"),
  route("dashboard", "routes/dashboard.tsx", [
    index("routes/dashboard.index.tsx"),
    route("groves", "routes/dashboard.groves.tsx"),
    route("harvests", "routes/dashboard.harvests.tsx"),
  ]),
] satisfies RouteConfig;
