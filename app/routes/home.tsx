import type { Route } from "./+types/home";
import { Welcome } from "../welcome/welcome";
import { getSessionUser } from "~/lib/auth.server";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "New React Router App" },
    { name: "description", content: "Welcome to React Router!" },
  ];
}

export async function loader({ request }: Route.LoaderArgs) {
  const user = await getSessionUser(request);
  return { isAuthenticated: Boolean(user) };
}

export default function Home({ loaderData }: Route.ComponentProps) {
  return <Welcome isAuthenticated={loaderData.isAuthenticated} />;
}
