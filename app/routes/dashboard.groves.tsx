import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { Link, useFetcher, data } from "react-router";
import { useTranslation } from "react-i18next";
import { Pencil, Trash2, Loader2 } from "lucide-react";
import { Pie, PieChart, Label } from "recharts";
import { db } from "~/db/prisma";
import { CHART_COLORS } from "~/lib/utils";
import { getSessionUser } from "~/lib/auth.server";
import type { Route } from "./+types/dashboard.groves";
import { Button } from "~/components/ui/button";
import {
  type ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "~/components/ui/chart";
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "~/components/ui/alert-dialog";
import { Checkbox } from "~/components/ui/checkbox";
import { useRowSelection } from "~/hooks/use-row-selection";
import { BulkActionBar } from "~/components/bulk-action-bar";

const PAGE_SIZE = 20;

export function meta() {
  return [{ title: "Groves" }];
}

export async function loader({ request }: Route.LoaderArgs) {
  const user = await getSessionUser(request);
  if (!user) throw new Response("Unauthorized", { status: 401 });

  const url = new URL(request.url);
  const skip = parseInt(url.searchParams.get("skip") || "0", 10);

  const [
    groves,
    totalCount,
    aggregates,
    harvestCount,
    groveAreas,
    varietyCounts,
  ] = await Promise.all([
    db.grove.findMany({
      where: { tenantId: user.tenantId },
      include: {
        varieties: true,
        _count: { select: { harvests: true } },
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: PAGE_SIZE,
    }),
    db.grove.count({ where: { tenantId: user.tenantId } }),
    db.grove.aggregate({
      where: { tenantId: user.tenantId },
      _sum: { area: true, treeCount: true },
    }),
    db.harvest.count({ where: { tenantId: user.tenantId } }),
    db.grove.findMany({
      where: { tenantId: user.tenantId, area: { not: null, gt: 0 } },
      select: { name: true, area: true },
      orderBy: { area: "desc" },
    }),
    db.groveVariety.groupBy({
      by: ["variety"],
      where: { grove: { tenantId: user.tenantId } },
      _sum: { treeCount: true },
      _count: true,
    }),
  ]);

  return {
    groves,
    groveAreas: groveAreas as { name: string; area: number }[],
    varietyCounts: varietyCounts.map((v) => ({
      variety: v.variety,
      trees: v._sum.treeCount ?? v._count,
    })),
    totals: {
      area: aggregates._sum.area ?? 0,
      trees: aggregates._sum.treeCount ?? 0,
      harvests: harvestCount,
    },
    hasMore: skip + groves.length < totalCount,
  };
}

export async function action({ request }: Route.ActionArgs) {
  const user = await getSessionUser(request);
  if (!user) throw new Response("Unauthorized", { status: 401 });

  const formData = await request.formData();
  const intent = formData.get("intent");

  if (intent === "deleteGrove") {
    const groveId = formData.get("groveId") as string;

    const grove = await db.grove.findFirst({
      where: { id: groveId, tenantId: user.tenantId },
    });

    if (!grove) {
      return data({ error: "groveNotFound" }, { status: 404 });
    }

    await db.grove.delete({ where: { id: groveId } });

    return data({ success: true });
  }

  if (intent === "deleteManyGroves") {
    const ids = formData.getAll("ids") as string[];
    if (ids.length === 0) {
      return data({ error: "invalidIntent" }, { status: 400 });
    }

    const count = await db.grove.count({
      where: { id: { in: ids }, tenantId: user.tenantId },
    });

    if (count !== ids.length) {
      return data({ error: "groveNotFound" }, { status: 404 });
    }

    await db.grove.deleteMany({
      where: { id: { in: ids }, tenantId: user.tenantId },
    });

    return data({ success: true });
  }

  return data({ error: "invalidIntent" }, { status: 400 });
}

export default function Groves({ loaderData }: Route.ComponentProps) {
  const {
    groves: initialGroves,
    groveAreas,
    varietyCounts,
    totals,
    hasMore: initialHasMore,
  } = loaderData;
  const { t } = useTranslation();
  const deleteFetcher = useFetcher<typeof action>();
  const loadMoreFetcher = useFetcher<typeof loader>();

  const areaChartData = useMemo(
    () =>
      groveAreas.map((g, i) => ({
        name: g.name,
        area: g.area,
        fill: CHART_COLORS[i % CHART_COLORS.length],
      })),
    [groveAreas],
  );

  const areaChartConfig = useMemo(() => {
    const config: ChartConfig = { area: { label: t("area") } };
    groveAreas.forEach((g, i) => {
      config[g.name] = {
        label: g.name,
        color: CHART_COLORS[i % CHART_COLORS.length],
      };
    });
    console.log({ config });
    return config;
  }, [groveAreas, t]);

  const varietyChartData = useMemo(
    () =>
      varietyCounts.map((v, i) => ({
        variety: v.variety.charAt(0) + v.variety.slice(1).toLowerCase(),
        trees: v.trees,
        fill: CHART_COLORS[i % CHART_COLORS.length],
      })),
    [varietyCounts],
  );

  const varietyChartConfig = useMemo(() => {
    const config: ChartConfig = { trees: { label: t("trees") } };
    varietyCounts.forEach((v, i) => {
      const label = v.variety.charAt(0) + v.variety.slice(1).toLowerCase();
      config[label] = {
        label,
        color: CHART_COLORS[i % CHART_COLORS.length],
      };
    });
    return config;
  }, [varietyCounts, t]);

  const [allGroves, setAllGroves] = useState(initialGroves);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const sentinelRef = useRef<HTMLDivElement>(null);

  const {
    selectedIds,
    toggleItem,
    toggleAll,
    clearSelection,
    allSelected,
    isIndeterminate,
    selectedCount,
  } = useRowSelection(allGroves.map((g) => g.id));

  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);

  // Reset on revalidation (after delete or navigation)
  useEffect(() => {
    setAllGroves(initialGroves);
    setHasMore(initialHasMore);
    clearSelection();
  }, [initialGroves, initialHasMore, clearSelection]);

  // Append fetched pages
  useEffect(() => {
    const d = loadMoreFetcher.data;
    if (d && "groves" in d) {
      setAllGroves((prev) => [...prev, ...d.groves]);
      setHasMore(d.hasMore);
    }
  }, [loadMoreFetcher.data]);

  const loadMore = useCallback(() => {
    if (loadMoreFetcher.state === "idle" && hasMore) {
      loadMoreFetcher.load(`/dashboard/groves?skip=${allGroves.length}`);
    }
  }, [loadMoreFetcher, hasMore, allGroves.length]);

  // IntersectionObserver on sentinel
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) loadMore();
      },
      { threshold: 0.1 },
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [loadMore]);

  const isLoadingMore = loadMoreFetcher.state === "loading";

  function handleBulkDelete() {
    const formData = new FormData();
    formData.append("intent", "deleteManyGroves");
    for (const id of selectedIds) {
      formData.append("ids", id);
    }
    deleteFetcher.submit(formData, { method: "post" });
    setBulkDeleteOpen(false);
  }

  return (
    <div className="flex flex-1 flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">{t("groves")}</h2>
          <p className="text-muted-foreground">{t("grovesDescription")}</p>
        </div>
        <Button
          asChild
          className="bg-forest text-cream hover:opacity-80 hover:bg-forest"
        >
          <Link to="/dashboard/groves/new">{t("newGrove")}</Link>
        </Button>
      </div>

      {(areaChartData.length > 0 || varietyChartData.length > 0) && (
        <div className="grid gap-4 sm:grid-cols-2">
          {areaChartData.length > 0 && (
            <Card className="bg-cream">
              <CardHeader className="pb-0">
                <CardTitle>{t("areaDistribution")}</CardTitle>
              </CardHeader>
              <CardContent className="flex-1 pb-0">
                <ChartContainer
                  config={areaChartConfig}
                  className="mx-auto aspect-square max-h-62.5"
                >
                  <PieChart>
                    <ChartTooltip
                      cursor={false}
                      content={<ChartTooltipContent hideLabel />}
                    />
                    <Pie
                      data={areaChartData}
                      dataKey="area"
                      nameKey="name"
                      innerRadius={60}
                      strokeWidth={5}
                    >
                      <Label
                        content={({ viewBox }) => {
                          if (viewBox && "cx" in viewBox && "cy" in viewBox) {
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
                                  className="fill-foreground text-3xl font-bold"
                                >
                                  {totals.area.toLocaleString()}
                                </tspan>
                                <tspan
                                  x={viewBox.cx}
                                  y={(viewBox.cy || 0) + 24}
                                  className="fill-muted-foreground"
                                >
                                  m²
                                </tspan>
                              </text>
                            );
                          }
                        }}
                      />
                    </Pie>
                  </PieChart>
                </ChartContainer>
              </CardContent>
            </Card>
          )}

          {varietyChartData.length > 0 && (
            <Card className="bg-cream">
              <CardHeader className="pb-0">
                <CardTitle>{t("varietyDistribution")}</CardTitle>
              </CardHeader>
              <CardContent className="flex-1 pb-0">
                <ChartContainer
                  config={varietyChartConfig}
                  className="mx-auto aspect-square max-h-62.5"
                >
                  <PieChart>
                    <ChartTooltip
                      cursor={false}
                      content={<ChartTooltipContent hideLabel />}
                    />
                    <Pie
                      data={varietyChartData}
                      dataKey="trees"
                      nameKey="variety"
                      innerRadius={60}
                      strokeWidth={5}
                    >
                      <Label
                        content={({ viewBox }) => {
                          if (viewBox && "cx" in viewBox && "cy" in viewBox) {
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
                                  className="fill-foreground text-3xl font-bold"
                                >
                                  {totals.trees.toLocaleString()}
                                </tspan>
                                <tspan
                                  x={viewBox.cx}
                                  y={(viewBox.cy || 0) + 24}
                                  className="fill-muted-foreground"
                                >
                                  {t("trees").toLowerCase()}
                                </tspan>
                              </text>
                            );
                          }
                        }}
                      />
                    </Pie>
                  </PieChart>
                </ChartContainer>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {allGroves.length === 0 ? (
        <p className="text-center text-muted-foreground py-8">
          {t("noGroves")}
        </p>
      ) : (
        <>
          {/* Mobile cards */}
          <div className="flex flex-col gap-3 md:hidden">
            {allGroves.map((grove) => (
              <Card key={grove.id} size="sm" className="bg-cream">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      <Checkbox
                        checked={selectedIds.has(grove.id)}
                        onCheckedChange={() => toggleItem(grove.id)}
                        className="mt-1 border-forest data-[state=checked]:border-forest data-[state=checked]:bg-forest data-[state=checked]:text-cream data-[state=indeterminate]:border-forest data-[state=indeterminate]:bg-forest data-[state=indeterminate]:text-cream"
                      />
                      <div>
                        <CardTitle>{grove.name}</CardTitle>
                        <span className="text-xs text-forest/50">
                          {new Date(grove.createdAt)
                            .toLocaleDateString("en-GB")
                            .replaceAll("/", ".")}
                        </span>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8"
                        asChild
                      >
                        <Link to={`/dashboard/groves/${grove.id}/edit`}>
                          <Pencil className="h-4 w-4" />
                        </Link>
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>
                              {t("deleteGroveConfirmTitle")}
                            </AlertDialogTitle>
                            <AlertDialogDescription>
                              {t("deleteGroveConfirmDescription")}
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>{t("cancel")}</AlertDialogCancel>
                            <AlertDialogAction
                              variant="destructive"
                              onClick={() => {
                                deleteFetcher.submit(
                                  { intent: "deleteGrove", groveId: grove.id },
                                  { method: "post" },
                                );
                              }}
                            >
                              {t("confirm")}
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                    <span className="text-forest/60">{t("location")}</span>
                    <span>{grove.location ?? "—"}</span>
                    <span className="text-forest/60">{t("area")}</span>
                    <span>{grove.area ?? "—"}</span>
                    <span className="text-forest/60">{t("trees")}</span>
                    <span>{grove.treeCount ?? "—"}</span>
                    <span className="text-forest/60">{t("varieties")}</span>
                    <span>
                      {grove.varieties.length > 0
                        ? grove.varieties
                            .map(
                              (v) =>
                                v.variety.charAt(0) +
                                v.variety.slice(1).toLowerCase(),
                            )
                            .join(", ")
                        : "—"}
                    </span>
                    <span className="text-forest/60">{t("harvestCount")}</span>
                    <span>{grove._count.harvests}</span>
                  </div>
                </CardContent>
              </Card>
            ))}
            <Card size="sm" className="bg-forest/5">
              <CardContent>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm font-medium">
                  <span>{t("total")}</span>
                  <span />
                  <span className="text-forest/60">{t("area")}</span>
                  <span>{totals.area.toFixed(2)}</span>
                  <span className="text-forest/60">{t("trees")}</span>
                  <span>{totals.trees}</span>
                  <span className="text-forest/60">{t("harvestCount")}</span>
                  <span>{totals.harvests}</span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Desktop table */}
          <div className="hidden md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10">
                    <Checkbox
                      checked={
                        allSelected
                          ? true
                          : isIndeterminate
                            ? "indeterminate"
                            : false
                      }
                      onCheckedChange={toggleAll}
                      className="border-forest data-[state=checked]:border-forest data-[state=checked]:bg-forest data-[state=checked]:text-cream data-[state=indeterminate]:border-forest data-[state=indeterminate]:bg-forest data-[state=indeterminate]:text-cream"
                    />
                  </TableHead>
                  <TableHead>{t("name")}</TableHead>
                  <TableHead>{t("location")}</TableHead>
                  <TableHead>{t("area")}</TableHead>
                  <TableHead>{t("trees")}</TableHead>
                  <TableHead>{t("varieties")}</TableHead>
                  <TableHead>{t("harvestCount")}</TableHead>
                  <TableHead>{t("createdAt")}</TableHead>
                  <TableHead className="w-24" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {allGroves.map((grove) => (
                  <TableRow key={grove.id}>
                    <TableCell>
                      <Checkbox
                        checked={selectedIds.has(grove.id)}
                        onCheckedChange={() => toggleItem(grove.id)}
                        className="border-forest data-[state=checked]:border-forest data-[state=checked]:bg-forest data-[state=checked]:text-cream data-[state=indeterminate]:border-forest data-[state=indeterminate]:bg-forest data-[state=indeterminate]:text-cream"
                      />
                    </TableCell>
                    <TableCell className="font-medium">{grove.name}</TableCell>
                    <TableCell>{grove.location ?? "—"}</TableCell>
                    <TableCell>{grove.area ?? "—"}</TableCell>
                    <TableCell>{grove.treeCount ?? "—"}</TableCell>
                    <TableCell>
                      {grove.varieties.length > 0
                        ? grove.varieties
                            .map(
                              (v) =>
                                v.variety.charAt(0) +
                                v.variety.slice(1).toLowerCase(),
                            )
                            .join(", ")
                        : "—"}
                    </TableCell>
                    <TableCell>{grove._count.harvests}</TableCell>
                    <TableCell>
                      {new Date(grove.createdAt)
                        .toLocaleDateString("en-GB")
                        .replaceAll("/", ".")}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-8 w-8"
                          asChild
                        >
                          <Link to={`/dashboard/groves/${grove.id}/edit`}>
                            <Pencil className="h-4 w-4" />
                          </Link>
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="outline"
                              size="icon"
                              className="h-8 w-8 text-destructive hover:text-destructive"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>
                                {t("deleteGroveConfirmTitle")}
                              </AlertDialogTitle>
                              <AlertDialogDescription>
                                {t("deleteGroveConfirmDescription")}
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>
                                {t("cancel")}
                              </AlertDialogCancel>
                              <AlertDialogAction
                                variant="destructive"
                                onClick={() => {
                                  deleteFetcher.submit(
                                    {
                                      intent: "deleteGrove",
                                      groveId: grove.id,
                                    },
                                    { method: "post" },
                                  );
                                }}
                              >
                                {t("confirm")}
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
              <TableFooter>
                <TableRow>
                  <TableCell />
                  <TableCell colSpan={2} className="font-medium">
                    {t("total")}
                  </TableCell>
                  <TableCell>{totals.area.toFixed(2)}</TableCell>
                  <TableCell>{totals.trees}</TableCell>
                  <TableCell />
                  <TableCell>{totals.harvests}</TableCell>
                  <TableCell colSpan={2} />
                </TableRow>
              </TableFooter>
            </Table>
          </div>
        </>
      )}

      {/* Sentinel for infinite scroll */}
      {hasMore && (
        <div ref={sentinelRef} className="flex justify-center py-4">
          {isLoadingMore && (
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          )}
        </div>
      )}

      {/* Bulk action bar + confirmation dialog */}
      <BulkActionBar
        selectedCount={selectedCount}
        onClear={clearSelection}
        onDelete={() => setBulkDeleteOpen(true)}
      />
      <AlertDialog open={bulkDeleteOpen} onOpenChange={setBulkDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t("bulkDeleteConfirmTitle", { count: selectedCount })}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t("bulkDeleteGrovesConfirmDescription")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("cancel")}</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={handleBulkDelete}>
              {t("confirm")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
