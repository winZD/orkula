import { type RouteConfig, index, route } from "@react-router/dev/routes";

export default [
  index("routes/home.tsx"),
  route("login", "routes/login.tsx"),
  route("signup", "routes/signup.tsx"),
  route("dashboard", "routes/dashboard.tsx", [
    index("routes/dashboard.index.tsx"),
    route("groves", "routes/dashboard.groves.tsx"),
    route("groves/new", "routes/dashboard.groves.new.tsx"),
    route("harvests", "routes/dashboard.harvests.tsx"),
    route("harvests/new", "routes/dashboard.harvests.new.tsx"),
  ]),
  route("set-language", "routes/set-language.ts"),
] satisfies RouteConfig;
