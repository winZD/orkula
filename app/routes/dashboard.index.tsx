import { useTranslation } from "react-i18next";
import { getSessionUser } from "~/lib/auth.server";
import type { Route } from "./+types/dashboard.index";

export function meta() {
  return [{ title: "Dashboard" }];
}

export async function loader({ request }: Route.LoaderArgs) {
  const user = await getSessionUser(request);
  return { user };
}

export default function DashboardIndex({ loaderData }: Route.ComponentProps) {
  const { user } = loaderData;
  const { t } = useTranslation();

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4">
      <h2 className="text-2xl font-bold">
        {t("welcome", { name: user?.firstName || t("userFallback") })}
      </h2>
      <p className="text-muted-foreground">
        {user?.tenant.name} &middot; {user?.role}
      </p>
    </div>
  );
}
