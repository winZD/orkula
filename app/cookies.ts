import { createCookie } from "react-router";

export const localeCookie = createCookie("lng", {
  path: "/",
  sameSite: "lax",
  httpOnly: true,
  maxAge: 60 * 60 * 24 * 365, // 1 year
});
