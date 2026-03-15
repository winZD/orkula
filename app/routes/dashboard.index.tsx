import { Link } from "react-router";
import { useTranslation } from "react-i18next";
import { db } from "~/db/prisma";
import { getSessionUser } from "~/lib/auth.server";
import type { Route } from "./+types/dashboard.index";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { SummaryCard } from "~/components/summary-card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";

export function meta() {
  return [{ title: "Dashboard" }];
}

export async function loader({ request }: Route.LoaderArgs) {
  const user = await getSessionUser(request);
  if (!user) throw new Response("Unauthorized", { status: 401 });

  const tenantId = user.tenantId;

  const [groves, harvestAgg, recentHarvests] = await Promise.all([
    db.grove.findMany({
      where: { tenantId },
      select: { treeCount: true, area: true },
    }),
    db.harvest.aggregate({
      where: { tenantId },
      _count: true,
      _sum: { quantityKg: true, oilYieldLt: true },
      _avg: { oilYieldPct: true },
    }),
    db.harvest.findMany({
      where: { tenantId },
      take: 5,
      orderBy: { date: "desc" },
      include: {
        grove: { select: { name: true } },
        recordedBy: { select: { firstName: true, lastName: true } },
      },
    }),
  ]);

  const stats = {
    groveCount: groves.length,
    totalTrees: groves.reduce((sum, g) => sum + (g.treeCount ?? 0), 0),
    totalArea: groves.reduce((sum, g) => sum + (g.area ?? 0), 0),
    harvestCount: harvestAgg._count,
    totalQuantityKg: harvestAgg._sum.quantityKg ?? 0,
    totalOilYieldLt: harvestAgg._sum.oilYieldLt ?? 0,
    avgOilYieldPct: harvestAgg._avg.oilYieldPct,
  };

  return { user, stats, recentHarvests };
}

export default function DashboardIndex({ loaderData }: Route.ComponentProps) {
  const { user, stats, recentHarvests } = loaderData;
  const { t } = useTranslation();

  return (
    <div className="flex flex-1 flex-col gap-6">
      {/* Welcome */}
      <div>
        <h2 className="text-2xl font-bold">
          {t("welcome", { name: user?.firstName || t("userFallback") })}
        </h2>
        <p className="text-muted-foreground">
          {user?.tenant.name} &middot; {user?.role}
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <SummaryCard title={t("totalGroves")} value={stats.groveCount} />
        <SummaryCard title={t("totalTrees")} value={stats.totalTrees} />
        <SummaryCard
          title={t("totalArea")}
          value={`${stats.totalArea.toFixed(1)} m²`}
        />
        <SummaryCard
          title={t("totalHarvestsCount")}
          value={stats.harvestCount}
        />
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <SummaryCard
          title={t("totalHarvestKg")}
          value={`${stats.totalQuantityKg.toFixed(1)} kg`}
        />
        <SummaryCard
          title={t("totalOilYield")}
          value={`${stats.totalOilYieldLt.toFixed(1)} L`}
        />
        <SummaryCard
          title={t("avgOilYield")}
          value={
            stats.avgOilYieldPct != null
              ? `${stats.avgOilYieldPct.toFixed(1)}%`
              : "—"
          }
        />
      </div>

      {/* Recent Harvests */}
      <div className="flex flex-col gap-3">
        <h3 className="text-lg font-semibold">{t("recentHarvests")}</h3>

        {recentHarvests.length === 0 ? (
          <p className="text-center text-muted-foreground py-4">
            {t("noData")}
          </p>
        ) : (
          <>
            {/* Mobile cards */}
            <div className="flex flex-col gap-3 md:hidden">
              {recentHarvests.map((harvest) => (
                <Card key={harvest.id} size="sm" className="bg-cream">
                  <CardHeader>
                    <CardTitle>{harvest.grove.name}</CardTitle>
                    <span className="text-xs text-forest/50">
                      {new Date(harvest.date)
                        .toLocaleDateString("en-GB")
                        .replaceAll("/", ".")}
                    </span>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                      <span className="text-forest/60">{t("quantityKg")}</span>
                      <span>{harvest.quantityKg}</span>
                      <span className="text-forest/60">{t("recordedBy")}</span>
                      <span>
                        {harvest.recordedBy.firstName}{" "}
                        {harvest.recordedBy.lastName}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Desktop table */}
            <div className="hidden md:block">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("date")}</TableHead>
                    <TableHead>{t("grove")}</TableHead>
                    <TableHead>{t("quantityKg")}</TableHead>
                    <TableHead>{t("recordedBy")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentHarvests.map((harvest) => (
                    <TableRow key={harvest.id}>
                      <TableCell className="font-medium">
                        {new Date(harvest.date)
                          .toLocaleDateString("en-GB")
                          .replaceAll("/", ".")}
                      </TableCell>
                      <TableCell>{harvest.grove.name}</TableCell>
                      <TableCell>{harvest.quantityKg}</TableCell>
                      <TableCell>
                        {harvest.recordedBy.firstName}{" "}
                        {harvest.recordedBy.lastName}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </>
        )}
      </div>

      {/* Quick Actions */}
      <div className="flex flex-col gap-3">
        <h3 className="text-lg font-semibold">{t("quickActions")}</h3>
        <div className="flex gap-3">
          <Button
            asChild
            className="bg-forest text-cream hover:opacity-80 hover:bg-forest"
          >
            <Link to="/dashboard/groves/new">{t("newGrove")}</Link>
          </Button>
          <Button
            asChild
            className="bg-forest text-cream hover:opacity-80 hover:bg-forest"
          >
            <Link to="/dashboard/harvests/new">{t("newHarvest")}</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
