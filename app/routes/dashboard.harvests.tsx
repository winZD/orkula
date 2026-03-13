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
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";

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

  const totalQuantity = harvests.reduce((sum, h) => sum + h.quantityKg, 0);
  const totalOil = harvests.reduce((sum, h) => sum + (h.oilYieldLt ?? 0), 0);

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

      {harvests.length === 0 ? (
        <p className="text-center text-muted-foreground py-8">{t("noHarvests")}</p>
      ) : (
        <>
          {/* Mobile cards */}
          <div className="flex flex-col gap-3 md:hidden">
            {harvests.map((harvest) => (
              <Card key={harvest.id} size="sm" className="bg-white">
                <CardHeader>
                  <CardTitle>{harvest.grove.name}</CardTitle>
                  <span className="text-xs text-forest/50">
                    {new Date(harvest.date).toLocaleDateString("en-GB").replaceAll("/", ".")}
                  </span>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                    <span className="text-forest/60">{t("quantityKg")}</span>
                    <span>{harvest.quantityKg}</span>
                    <span className="text-forest/60">{t("oilYieldLt")}</span>
                    <span>{harvest.oilYieldLt ?? "—"}</span>
                    <span className="text-forest/60">{t("oilYieldPct")}</span>
                    <span>
                      {harvest.oilYieldPct != null ? `${harvest.oilYieldPct}%` : "—"}
                    </span>
                    <span className="text-forest/60">{t("method")}</span>
                    <span>{t(`method.${harvest.method}`)}</span>
                    {harvest.notes && (
                      <>
                        <span className="text-forest/60">{t("notes")}</span>
                        <span className="truncate">{harvest.notes}</span>
                      </>
                    )}
                    <span className="text-forest/60">{t("recordedBy")}</span>
                    <span>
                      {harvest.recordedBy.firstName} {harvest.recordedBy.lastName}
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))}
            <Card size="sm" className="bg-forest/5">
              <CardContent>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm font-medium">
                  <span>{t("total")}</span>
                  <span />
                  <span className="text-forest/60">{t("quantityKg")}</span>
                  <span>{totalQuantity.toFixed(1)}</span>
                  <span className="text-forest/60">{t("oilYieldLt")}</span>
                  <span>{totalOil.toFixed(1)}</span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Desktop table */}
          <div className="hidden md:block">
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
                {harvests.map((harvest) => (
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
                ))}
              </TableBody>
              <TableFooter>
                <TableRow>
                  <TableCell colSpan={2} className="font-medium">{t("total")}</TableCell>
                  <TableCell>{totalQuantity.toFixed(1)}</TableCell>
                  <TableCell>{totalOil.toFixed(1)}</TableCell>
                  <TableCell colSpan={4} />
                </TableRow>
              </TableFooter>
            </Table>
          </div>
        </>
      )}
    </div>
  );
}
