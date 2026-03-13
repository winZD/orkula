import { data } from "react-router";
import { localeCookie } from "~/cookies";
import type { Route } from "./+types/set-language";

export async function action({ request }: Route.ActionArgs) {
  const formData = await request.formData();
  const lng = formData.get("lng");

  if (lng !== "hr" && lng !== "en") {
    return data({ error: "Invalid language" }, { status: 400 });
  }

  return data(
    { success: true },
    { headers: { "Set-Cookie": await localeCookie.serialize(lng) } },
  );
}
