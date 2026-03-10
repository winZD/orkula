import { redirect } from "react-router";
import { getSessionUser, clearSessionCookie } from "~/lib/auth.server";
import type { Route } from "./+types/dashboard";
import { Button } from "~/components/ui/button";
import { Form } from "react-router";

export function meta() {
  return [{ title: "Dashboard" }];
}

export async function loader({ request }: Route.LoaderArgs) {
  const user = await getSessionUser(request);
  if (!user) throw redirect("/login");
  return { user };
}

export async function action({ request }: Route.ActionArgs) {
  const { logout } = await import("~/lib/auth.server");
  await logout(request);
  return redirect("/login", {
    headers: { "Set-Cookie": clearSessionCookie() },
  });
}

export default function Dashboard({ loaderData }: Route.ComponentProps) {
  const { user } = loaderData;

  return (
    <div className="flex min-h-screen flex-col">
      <header className="flex items-center justify-between border-b px-6 py-4">
        <h1 className="text-xl font-semibold">Orkula</h1>
        <div className="flex items-center gap-4">
          <span className="text-sm text-muted-foreground">
            {user.firstName} {user.lastName}
          </span>
          <Form method="post">
            <Button variant="outline" size="sm" type="submit">
              Logout
            </Button>
          </Form>
        </div>
      </header>
      <main className="flex flex-1 flex-col items-center justify-center gap-4 p-6">
        <h2 className="text-2xl font-bold">
          Welcome, {user.firstName || "there"}!
        </h2>
        <p className="text-muted-foreground">
          {user.tenant.name} &middot; {user.role}
        </p>
      </main>
    </div>
  );
}
