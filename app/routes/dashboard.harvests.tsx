import { Link } from "react-router";
import { useTranslation } from "react-i18next";
import { db } from "~/db/prisma";
import { getSessionUser } from "~/lib/auth.server";
import type { Route } from "./+types/dashboard.harvests";
import { Button } from "~/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";

export function meta() {
  return [{ title: "Harvests" }];
}

export async function loader({ request }: Route.LoaderArgs) {
  const user = await getSessionUser(request);
  if (!user) throw new Response("Unauthorized", { status: 401 });

  const harvests = await db.harvest.findMany({
    where: { tenantId: user.tenantId },
    include: {
      grove: { select: { name: true } },
      recordedBy: { select: { firstName: true, lastName: true } },
    },
    orderBy: { date: "desc" },
  });

  return { harvests };
}

export default function Harvests({ loaderData }: Route.ComponentProps) {
  const { harvests } = loaderData;
  const { t } = useTranslation();

  return (
    <div className="flex flex-1 flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">{t("harvests")}</h2>
          <p className="text-muted-foreground">{t("harvestsDescription")}</p>
        </div>
        <Button asChild className="bg-forest text-cream hover:opacity-80 hover:bg-forest">
          <Link to="/dashboard/harvests/new">{t("newHarvest")}</Link>
        </Button>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t("date")}</TableHead>
            <TableHead>{t("grove")}</TableHead>
            <TableHead>{t("quantityKg")}</TableHead>
            <TableHead>{t("oilYieldLt")}</TableHead>
            <TableHead>{t("oilYieldPct")}</TableHead>
            <TableHead>{t("method")}</TableHead>
            <TableHead>{t("notes")}</TableHead>
            <TableHead>{t("recordedBy")}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {harvests.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={8}
                className="text-center text-muted-foreground"
              >
                {t("noHarvests")}
              </TableCell>
            </TableRow>
          ) : (
            harvests.map((harvest) => (
              <TableRow key={harvest.id}>
                <TableCell className="font-medium">
                  {new Date(harvest.date).toLocaleDateString("en-GB").replaceAll("/", ".")}
                </TableCell>
                <TableCell>{harvest.grove.name}</TableCell>
                <TableCell>{harvest.quantityKg}</TableCell>
                <TableCell>{harvest.oilYieldLt ?? "—"}</TableCell>
                <TableCell>
                  {harvest.oilYieldPct != null
                    ? `${harvest.oilYieldPct}%`
                    : "—"}
                </TableCell>
                <TableCell>{t(`method.${harvest.method}`)}</TableCell>
                <TableCell className="max-w-48 truncate">
                  {harvest.notes ?? "—"}
                </TableCell>
                <TableCell>
                  {harvest.recordedBy.firstName} {harvest.recordedBy.lastName}
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
        {harvests.length > 0 && (
          <TableFooter>
            <TableRow>
              <TableCell colSpan={2} className="font-medium">{t("total")}</TableCell>
              <TableCell>{harvests.reduce((sum, h) => sum + h.quantityKg, 0).toFixed(1)}</TableCell>
              <TableCell>{harvests.reduce((sum, h) => sum + (h.oilYieldLt ?? 0), 0).toFixed(1)}</TableCell>
              <TableCell colSpan={4} />
            </TableRow>
          </TableFooter>
        )}
      </Table>
    </div>
  );
}
