import { useState, useMemo } from "react";
import { Link, useNavigate } from "react-router";
import { useTranslation } from "react-i18next";
import {
  Bar,
  BarChart,
  CartesianGrid,
  XAxis,
  YAxis,
  Pie,
  PieChart,
  Label,
} from "recharts";
import { db } from "~/db/prisma";
import { CHART_COLORS } from "~/lib/utils";
import { getSessionUser } from "~/lib/auth.server";
import type { Route } from "./+types/dashboard.index";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { SummaryCard } from "~/components/summary-card";
import {
  type ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "~/components/ui/chart";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
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
  const url = new URL(request.url);
  const currentYear = parseInt(
    url.searchParams.get("year") || String(new Date().getFullYear()),
    10,
  );
  const yearStart = new Date(currentYear, 0, 1);
  const yearEnd = new Date(currentYear + 1, 0, 1);

  const [
    groves,
    harvestAgg,
    recentHarvests,
    expenseSum,
    incomeSum,
    yearHarvest,
    yearlyHarvestsRaw,
    expenseTransactions,
    yearsRaw,
  ] = await Promise.all([
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
    // Financial aggregates (year-scoped)
    db.transaction.aggregate({
      where: {
        tenantId,
        type: "EXPENSE",
        date: { gte: yearStart, lt: yearEnd },
      },
      _sum: { amount: true },
    }),
    db.transaction.aggregate({
      where: {
        tenantId,
        type: "INCOME",
        date: { gte: yearStart, lt: yearEnd },
      },
      _sum: { amount: true },
    }),
    // Year harvest (one harvest per year)
    db.harvest.findFirst({
      where: { tenantId, date: { gte: yearStart, lt: yearEnd } },
      select: { quantityKg: true, oilYieldLt: true, oilYieldPct: true },
    }),
    // Yearly harvests (all years)
    db.$queryRaw<{ year: number; kg: number; oil: number }[]>`
      SELECT EXTRACT(YEAR FROM date)::int AS year,
             COALESCE(SUM("quantityKg"), 0) AS kg,
             COALESCE(SUM("oilYieldLt"), 0) AS oil
      FROM "Harvest"
      WHERE "tenantId" = ${tenantId}
      GROUP BY year
      ORDER BY year
    `,
    // Expense transactions with category (year-scoped)
    db.transaction.findMany({
      where: {
        tenantId,
        type: "EXPENSE",
        date: { gte: yearStart, lt: yearEnd },
      },
      select: { amount: true, category: { select: { name: true } } },
    }),
    // Available years
    db.$queryRaw<{ year: number }[]>`
      SELECT DISTINCT y AS year FROM (
        SELECT EXTRACT(YEAR FROM date)::int AS y FROM "Harvest" WHERE "tenantId" = ${tenantId}
        UNION
        SELECT EXTRACT(YEAR FROM date)::int AS y FROM "Transaction" WHERE "tenantId" = ${tenantId}
      ) sub ORDER BY year DESC
    `,
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

  const expenses = expenseSum._sum.amount ?? 0;
  const income = incomeSum._sum.amount ?? 0;
  const yearKg = yearHarvest?.quantityKg ?? 0;
  const yearOil = yearHarvest?.oilYieldLt ?? 0;

  // Expense by category aggregation
  const categoryMap = new Map<string, number>();
  for (const tx of expenseTransactions) {
    const name = tx.category.name;
    categoryMap.set(name, (categoryMap.get(name) ?? 0) + tx.amount);
  }

  const expenseByCategory = Array.from(categoryMap.entries())
    .map(([name, amount]) => ({ name, amount: Math.round(amount * 100) / 100 }))
    .sort((a, b) => b.amount - a.amount);

  // Available years
  const availableYears = yearsRaw.map((r) => r.year);
  if (!availableYears.includes(currentYear)) {
    availableYears.push(currentYear);
    availableYears.sort((a, b) => b - a);
  }

  return {
    user,
    stats,
    recentHarvests,
    currentYear,
    availableYears,
    financials: {
      expenses,
      income,
      net: income - expenses,
      costPerKg: yearKg > 0 ? expenses / yearKg : null,
      costPerLiter: yearOil > 0 ? expenses / yearOil : null,
      yearOilYieldPct: yearHarvest?.oilYieldPct ?? null,
    },
    yearlyHarvests: yearlyHarvestsRaw.map((r) => ({
      year: String(r.year),
      kg: Number(r.kg),
      oil: Number(r.oil),
    })),
    expenseByCategory,
  };
}

export default function DashboardIndex({ loaderData }: Route.ComponentProps) {
  const {
    user,
    stats,
    recentHarvests,
    currentYear,
    availableYears,
    financials,
    yearlyHarvests,
    expenseByCategory,
  } = loaderData;
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [cardGroup, setCardGroup] = useState("groves");

  function handleYearChange(year: string) {
    navigate(`/dashboard?year=${year}`);
  }

  const harvestChartConfig = {
    kg: { label: t("quantityKg"), color: "#1b4019" },
  } satisfies ChartConfig;

  const categoryChartData = useMemo(
    () =>
      expenseByCategory.map((c, i) => ({
        name: c.name,
        amount: c.amount,
        fill: CHART_COLORS[i % CHART_COLORS.length],
      })),
    [expenseByCategory],
  );

  const categoryChartConfig = useMemo(() => {
    const config: ChartConfig = { amount: { label: t("amount") } };
    expenseByCategory.forEach((c, i) => {
      config[c.name] = {
        label: c.name,
        color: CHART_COLORS[i % CHART_COLORS.length],
      };
    });
    return config;
  }, [expenseByCategory, t]);

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

      {/* Switchable Summary Cards */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center gap-4">
          {cardGroup !== "groves" && cardGroup !== "harvests" && (
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium">{t("year")}:</label>
              <Select
                value={String(currentYear)}
                onValueChange={handleYearChange}
              >
                <SelectTrigger className="w-28">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {availableYears.map((y) => (
                    <SelectItem key={y} value={String(y)}>
                      {y}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium">{t("viewMetrics")}:</label>
            <Select value={cardGroup} onValueChange={setCardGroup}>
              <SelectTrigger className="w-auto">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="groves">{t("groves")}</SelectItem>
                <SelectItem value="harvests">{t("harvests")}</SelectItem>
                <SelectItem value="finances">{t("finances")}</SelectItem>
                <SelectItem value="efficiency">{t("efficiency")}</SelectItem>
                <SelectItem value="charts">{t("charts")}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {cardGroup === "groves" && (
            <>
              <SummaryCard title={t("totalGroves")} value={stats.groveCount} />
              <SummaryCard title={t("totalTrees")} value={stats.totalTrees} />
              <SummaryCard
                title={t("totalArea")}
                value={`${stats.totalArea.toFixed(1)} m²`}
              />
            </>
          )}
          {cardGroup === "harvests" && (
            <>
              <SummaryCard
                title={t("totalHarvestsCount")}
                value={stats.harvestCount}
              />
              <SummaryCard
                title={t("totalHarvestKg")}
                value={`${stats.totalQuantityKg.toFixed(1)} kg`}
              />
              <SummaryCard
                title={t("totalOilYield")}
                value={`${stats.totalOilYieldLt.toFixed(1)} L`}
              />
            </>
          )}
          {cardGroup === "finances" && (
            <>
              <SummaryCard
                title={t("totalExpenses")}
                value={`${financials.expenses.toFixed(2)} €`}
              />
              <SummaryCard
                title={t("totalIncome")}
                value={`${financials.income.toFixed(2)} €`}
              />
              <SummaryCard
                title={t("netResult")}
                value={`${financials.net >= 0 ? "+" : ""}${financials.net.toFixed(2)} €`}
                valueClassName={
                  financials.net >= 0 ? "text-green-700" : "text-red-700"
                }
              />
            </>
          )}
          {cardGroup === "efficiency" && (
            <>
              <SummaryCard
                title={t("oilYieldPct")}
                value={
                  financials.yearOilYieldPct != null
                    ? `${financials.yearOilYieldPct.toFixed(1)}%`
                    : "—"
                }
              />
              <SummaryCard
                title={t("costPerKg")}
                value={
                  financials.costPerKg != null
                    ? `${financials.costPerKg.toFixed(2)} €`
                    : "—"
                }
              />
              <SummaryCard
                title={t("costPerLiter")}
                value={
                  financials.costPerLiter != null
                    ? `${financials.costPerLiter.toFixed(2)} €`
                    : "—"
                }
              />
              <div className="col-span-full">
                <p className="text-sm text-muted-foreground">
                  {t("avgOilYield")}:{" "}
                  <span className="font-semibold text-foreground">
                    {stats.avgOilYieldPct != null
                      ? `${stats.avgOilYieldPct.toFixed(1)}%`
                      : "—"}
                  </span>
                </p>
              </div>
            </>
          )}
          {cardGroup === "charts" && (
            <div className="col-span-full grid gap-4 sm:grid-cols-2">
              {/* Year-over-Year Harvest */}
              <Card className="bg-cream">
                <CardHeader className="pb-0">
                  <CardTitle>{t("harvestByYear")}</CardTitle>
                </CardHeader>
                <CardContent>
                  {yearlyHarvests.length > 0 ? (
                    <ChartContainer
                      config={harvestChartConfig}
                      className="aspect-auto h-62.5 w-full"
                    >
                      <BarChart
                        data={yearlyHarvests}
                        accessibilityLayer
                        margin={{ left: 0, right: 0 }}
                      >
                        <CartesianGrid vertical={false} />
                        <XAxis
                          dataKey="year"
                          tickLine={false}
                          axisLine={false}
                          tick={{ fontSize: 12 }}
                        />
                        <YAxis
                          tickLine={false}
                          axisLine={false}
                          width={40}
                          tick={{ fontSize: 12 }}
                        />
                        <ChartTooltip content={<ChartTooltipContent />} />
                        <Bar dataKey="kg" fill="var(--color-kg)" radius={4} />
                      </BarChart>
                    </ChartContainer>
                  ) : (
                    <p className="text-center text-muted-foreground py-4">
                      {t("noData")}
                    </p>
                  )}
                </CardContent>
              </Card>

              {/* Expense by Category */}
              <Card className="bg-cream">
                <CardHeader className="pb-0">
                  <CardTitle>{t("expenseByCategory")}</CardTitle>
                </CardHeader>
                <CardContent className="flex-1 pb-0">
                  {categoryChartData.length > 0 ? (
                    <ChartContainer
                      config={categoryChartConfig}
                      className="mx-auto aspect-square max-h-62.5"
                    >
                      <PieChart>
                        <ChartTooltip
                          cursor={false}
                          content={<ChartTooltipContent hideLabel />}
                        />
                        <Pie
                          data={categoryChartData}
                          dataKey="amount"
                          nameKey="name"
                          innerRadius={60}
                          strokeWidth={5}
                        >
                          <Label
                            content={({ viewBox }) => {
                              if (
                                viewBox &&
                                "cx" in viewBox &&
                                "cy" in viewBox
                              ) {
                                const total = expenseByCategory.reduce(
                                  (s, c) => s + c.amount,
                                  0,
                                );
                                return (
                                  <text
                                    x={viewBox.cx}
                                    y={viewBox.cy}
                                    textAnchor="middle"
                                    dominantBaseline="middle"
                                  >
                                    <tspan
                                      x={viewBox.cx}
                                      y={viewBox.cy}
                                      className="fill-foreground text-2xl font-bold"
                                    >
                                      {total.toFixed(0)}
                                    </tspan>
                                    <tspan
                                      x={viewBox.cx}
                                      y={(viewBox.cy || 0) + 24}
                                      className="fill-muted-foreground"
                                    >
                                      {"€"}
                                    </tspan>
                                  </text>
                                );
                              }
                            }}
                          />
                        </Pie>
                      </PieChart>
                    </ChartContainer>
                  ) : (
                    <p className="text-center text-muted-foreground py-4">
                      {t("noData")}
                    </p>
                  )}
                </CardContent>
              </Card>
            </div>
          )}
        </div>
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
