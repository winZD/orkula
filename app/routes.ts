import { type RouteConfig, index, route } from "@react-router/dev/routes";

export default [
  index("routes/home.tsx"),
  route("login", "routes/login.tsx"),
  route("signup", "routes/signup.tsx"),
  route("dashboard", "routes/dashboard.tsx", [
    index("routes/dashboard.index.tsx"),
    route("groves", "routes/dashboard.groves.tsx"),
    route("groves/new", "routes/dashboard.groves.new.tsx"),
    route("groves/:groveId/edit", "routes/dashboard.groves.$groveId.edit.tsx"),
    route("harvests", "routes/dashboard.harvests.tsx"),
    route("harvests/new", "routes/dashboard.harvests.new.tsx"),
    route("harvests/:harvestId/edit", "routes/dashboard.harvests.$harvestId.edit.tsx"),
    route("settings", "routes/dashboard.settings.tsx"),
    route("users/new", "routes/dashboard.users.new.tsx"),
    route("users/:userId/edit", "routes/dashboard.users.$userId.edit.tsx"),
  ]),

] satisfies RouteConfig;
