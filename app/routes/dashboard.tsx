import { redirect, Form, Outlet } from "react-router";
import { getSessionUser, clearSessionCookie } from "~/lib/auth.server";
import type { Route } from "./+types/dashboard";
import { Button } from "~/components/ui/button";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "~/components/ui/sidebar";
import { TooltipProvider } from "~/components/ui/tooltip";
import { AppSidebar } from "~/components/app-sidebar";

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

export default function DashboardLayout({ loaderData }: Route.ComponentProps) {
  const { user } = loaderData;

  return (
    <TooltipProvider>
      <SidebarProvider>
        <AppSidebar user={user} />
        <SidebarInset>
          <header className="flex h-14 items-center gap-2 border-b border-cream/20 bg-forest px-4 text-cream">
            <SidebarTrigger className="text-cream hover:text-cream/80" />
            <div className="flex flex-1 items-center justify-end gap-4">
              <span className="text-sm text-cream/70">
                {user.firstName} {user.lastName}
              </span>
              <Form method="post">
                <Button
                  type="submit"
                  className="rounded-lg bg-cream text-forest font-semibold hover:opacity-80 hover:bg-cream"
                  size="sm"
                >
                  Logout
                </Button>
              </Form>
            </div>
          </header>
          <main className="flex flex-1 flex-col p-6 bg-cream text-forest">
            <Outlet />
          </main>
        </SidebarInset>
      </SidebarProvider>
    </TooltipProvider>
  );
}
