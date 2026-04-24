import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { Link, useFetcher, data } from "react-router";
import { useTranslation } from "react-i18next";
import { Pencil, Trash2, Loader2, CalendarIcon } from "lucide-react";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";

const METHOD: Record<string, string> = {
  HAND: "methodHand",
  RAKE: "methodRake",
  MECHANICAL_SHAKER: "methodMechanicalShaker",
  VIBRATOR: "methodVibrator",
  NET: "methodNet",
};
import { db } from "~/db/prisma";
import { getSessionUser } from "~/lib/auth.server";
import type { Route } from "./+types/dashboard.harvests";
import { Button } from "~/components/ui/button";
import {
  type ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "~/components/ui/chart";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "~/components/ui/popover";
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
  return [{ title: "Harvests" }];
}

export async function loader({ request }: Route.LoaderArgs) {
  const user = await getSessionUser(request);
  if (!user) throw new Response("Unauthorized", { status: 401 });

  const url = new URL(request.url);
  const skip = parseInt(url.searchParams.get("skip") || "0", 10);

  const [harvests, totalCount, aggregates, chartHarvests] = await Promise.all([
    db.harvest.findMany({
      where: { tenantId: user.tenantId },
      include: {
        grove: { select: { name: true } },
        recordedBy: { select: { firstName: true, lastName: true } },
      },
      orderBy: { date: "desc" },
      skip,
      take: PAGE_SIZE,
    }),
    db.harvest.count({ where: { tenantId: user.tenantId } }),
    db.harvest.aggregate({
      where: { tenantId: user.tenantId },
      _sum: { quantityKg: true, oilYieldLt: true },
    }),
    db.harvest.findMany({
      where: { tenantId: user.tenantId },
      select: {
        date: true,
        quantityKg: true,
        grove: { select: { name: true } },
      },
      orderBy: { date: "asc" },
    }),
  ]);

  return {
    harvests,
    totals: {
      quantity: aggregates._sum.quantityKg ?? 0,
      oil: aggregates._sum.oilYieldLt ?? 0,
    },
    hasMore: skip + harvests.length < totalCount,
    chartHarvests: chartHarvests.map((h) => ({
      year: h.date.getFullYear(),
      grove: h.grove.name,
      quantityKg: Number(h.quantityKg),
    })),
  };
}

export async function action({ request }: Route.ActionArgs) {
  const user = await getSessionUser(request);
  if (!user) throw new Response("Unauthorized", { status: 401 });

  const formData = await request.formData();
  const intent = formData.get("intent");

  if (intent === "deleteHarvest") {
    const harvestId = formData.get("harvestId") as string;

    const harvest = await db.harvest.findFirst({
      where: { id: harvestId, tenantId: user.tenantId },
    });

    if (!harvest) {
      return data({ error: "harvestNotFound" }, { status: 404 });
    }

    await db.harvest.delete({ where: { id: harvestId } });

    return data({ success: true });
  }

  if (intent === "deleteManyHarvests") {
    const ids = formData.getAll("ids") as string[];
    if (ids.length === 0) {
      return data({ error: "invalidIntent" }, { status: 400 });
    }

    const count = await db.harvest.count({
      where: { id: { in: ids }, tenantId: user.tenantId },
    });

    if (count !== ids.length) {
      return data({ error: "harvestNotFound" }, { status: 404 });
    }

    await db.harvest.deleteMany({
      where: { id: { in: ids }, tenantId: user.tenantId },
    });

    return data({ success: true });
  }

  return data({ error: "invalidIntent" }, { status: 400 });
}

export default function Harvests({ loaderData }: Route.ComponentProps) {
  const {
    harvests: initialHarvests,
    totals,
    hasMore: initialHasMore,
    chartHarvests,
  } = loaderData;
  const { t } = useTranslation();

  const availableYears = useMemo(() => {
    const years = new Set(chartHarvests.map((h) => h.year));
    return Array.from(years).sort((a, b) => b - a);
  }, [chartHarvests]);

  const [selectedYear, setSelectedYear] = useState<string>(() =>
    availableYears.length > 0 ? String(availableYears[0]) : "",
  );

  useEffect(() => {
    if (
      availableYears.length > 0 &&
      !availableYears.includes(Number(selectedYear))
    ) {
      setSelectedYear(String(availableYears[0]));
    }
  }, [availableYears, selectedYear]);

  const chartData = useMemo(() => {
    const year = Number(selectedYear);
    const groveMap = new Map<string, number>();
    for (const h of chartHarvests) {
      if (h.year !== year) continue;
      groveMap.set(h.grove, (groveMap.get(h.grove) ?? 0) + h.quantityKg);
    }

    return Array.from(groveMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([grove, quantityKg]) => ({
        grove,
        quantityKg: Math.round(quantityKg * 10) / 10,
      }));
  }, [chartHarvests, selectedYear]);

  const chartConfig = {
    quantityKg: { label: t("quantityKg"), color: "#1b4019" },
  } satisfies ChartConfig;

  const deleteFetcher = useFetcher<typeof action>();
  const loadMoreFetcher = useFetcher<typeof loader>();

  const [allHarvests, setAllHarvests] = useState(initialHarvests);
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
  } = useRowSelection(allHarvests.map((h) => h.id));

  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);

  // Reset on revalidation (after delete or navigation)
  useEffect(() => {
    setAllHarvests(initialHarvests);
    setHasMore(initialHasMore);
    clearSelection();
  }, [initialHarvests, initialHasMore, clearSelection]);

  // Append fetched pages
  useEffect(() => {
    const d = loadMoreFetcher.data;
    if (d && "harvests" in d) {
      setAllHarvests((prev) => [...prev, ...d.harvests]);
      setHasMore(d.hasMore);
    }
  }, [loadMoreFetcher.data]);

  const loadMore = useCallback(() => {
    if (loadMoreFetcher.state === "idle" && hasMore) {
      loadMoreFetcher.load(`/dashboard/harvests?skip=${allHarvests.length}`);
    }
  }, [loadMoreFetcher, hasMore, allHarvests.length]);

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
    formData.append("intent", "deleteManyHarvests");
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
          <h2 className="text-2xl font-bold">{t("harvests")}</h2>
          <p className="text-muted-foreground">{t("harvestsDescription")}</p>
        </div>
        <Button
          asChild
          className="bg-forest text-cream hover:opacity-80 hover:bg-forest"
        >
          <Link to="/dashboard/harvests/new">{t("newHarvest")}</Link>
        </Button>
      </div>

      {chartHarvests.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <CardTitle>{t("harvestsByGrove")}</CardTitle>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-35 justify-start text-left font-normal"
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {selectedYear}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-3">
                  <div className="grid grid-cols-3 gap-2">
                    {availableYears.map((year) => (
                      <Button
                        key={year}
                        variant={
                          String(year) === selectedYear ? "default" : "outline"
                        }
                        size="sm"
                        className={
                          String(year) === selectedYear
                            ? "bg-forest text-cream hover:bg-forest hover:opacity-80"
                            : ""
                        }
                        onClick={() => setSelectedYear(String(year))}
                      >
                        {year}
                      </Button>
                    ))}
                  </div>
                </PopoverContent>
              </Popover>
            </div>
          </CardHeader>
          <CardContent>
            {chartData.length > 0 ? (
              <ChartContainer
                config={chartConfig}
                className="aspect-auto h-62.5 sm:sm:h-75 w-full"
              >
                <BarChart
                  data={chartData}
                  accessibilityLayer
                  margin={{ left: 0, right: 0 }}
                >
                  <CartesianGrid vertical={false} />
                  <XAxis dataKey="grove" hide />
                  <YAxis
                    tickLine={false}
                    axisLine={false}
                    width={40}
                    tick={{ fontSize: 12 }}
                  />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar
                    dataKey="quantityKg"
                    fill="var(--color-quantityKg)"
                    radius={4}
                  />
                </BarChart>
              </ChartContainer>
            ) : (
              <p className="text-center text-muted-foreground py-4">
                {t("noData")}
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {allHarvests.length === 0 ? (
        <p className="text-center text-muted-foreground py-8">
          {t("noHarvests")}
        </p>
      ) : (
        <>
          {/* Mobile cards */}
          <div className="flex flex-col gap-3 md:hidden">
            {allHarvests.map((harvest) => (
              <Card key={harvest.id} size="sm" className="bg-cream">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      <Checkbox
                        checked={selectedIds.has(harvest.id)}
                        onCheckedChange={() => toggleItem(harvest.id)}
                        className="mt-1 border-forest data-[state=checked]:border-forest data-[state=checked]:bg-forest data-[state=checked]:text-cream data-[state=indeterminate]:border-forest data-[state=indeterminate]:bg-forest data-[state=indeterminate]:text-cream"
                      />
                      <div>
                        <CardTitle>{harvest.grove.name}</CardTitle>
                        <span className="text-xs text-forest/50">
                          {new Date(harvest.date)
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
                        <Link to={`/dashboard/harvests/${harvest.id}/edit`}>
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
                              {t("deleteHarvestConfirmTitle")}
                            </AlertDialogTitle>
                            <AlertDialogDescription>
                              {t("deleteHarvestConfirmDescription")}
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>{t("cancel")}</AlertDialogCancel>
                            <AlertDialogAction
                              variant="destructive"
                              onClick={() => {
                                deleteFetcher.submit(
                                  {
                                    intent: "deleteHarvest",
                                    harvestId: harvest.id,
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
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                    <span className="text-forest/60">{t("quantityKg")}</span>
                    <span>{harvest.quantityKg}</span>
                    <span className="text-forest/60">{t("oilYieldLt")}</span>
                    <span>{harvest.oilYieldLt ?? "—"}</span>
                    <span className="text-forest/60">{t("oilYieldPct")}</span>
                    <span>
                      {harvest.oilYieldPct != null
                        ? `${harvest.oilYieldPct}%`
                        : "—"}
                    </span>
                    <span className="text-forest/60">{t("method")}</span>
                    <span>{t(METHOD[harvest.method])}</span>
                    {harvest.notes && (
                      <>
                        <span className="text-forest/60">{t("notes")}</span>
                        <span className="truncate">{harvest.notes}</span>
                      </>
                    )}
                    <span className="text-forest/60">{t("recordedBy")}</span>
                    <span>
                      {harvest.recordedBy.firstName}{" "}
                      {harvest.recordedBy.lastName}
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
                  <span>{totals.quantity.toFixed(1)}</span>
                  <span className="text-forest/60">{t("oilYieldLt")}</span>
                  <span>{totals.oil.toFixed(1)}</span>
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
                  <TableHead>{t("date")}</TableHead>
                  <TableHead>{t("grove")}</TableHead>
                  <TableHead>{t("quantityKg")}</TableHead>
                  <TableHead>{t("oilYieldLt")}</TableHead>
                  <TableHead>{t("oilYieldPct")}</TableHead>
                  <TableHead>{t("method")}</TableHead>
                  <TableHead>{t("notes")}</TableHead>
                  <TableHead>{t("recordedBy")}</TableHead>
                  <TableHead className="w-24" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {allHarvests.map((harvest) => (
                  <TableRow
                    key={harvest.id}
                    data-state={
                      selectedIds.has(harvest.id) ? "selected" : undefined
                    }
                  >
                    <TableCell>
                      <Checkbox
                        checked={selectedIds.has(harvest.id)}
                        onCheckedChange={() => toggleItem(harvest.id)}
                        className="border-forest data-[state=checked]:border-forest data-[state=checked]:bg-forest data-[state=checked]:text-cream data-[state=indeterminate]:border-forest data-[state=indeterminate]:bg-forest data-[state=indeterminate]:text-cream"
                      />
                    </TableCell>
                    <TableCell className="font-medium">
                      {new Date(harvest.date)
                        .toLocaleDateString("en-GB")
                        .replaceAll("/", ".")}
                    </TableCell>
                    <TableCell>{harvest.grove.name}</TableCell>
                    <TableCell>{harvest.quantityKg}</TableCell>
                    <TableCell>{harvest.oilYieldLt ?? "—"}</TableCell>
                    <TableCell>
                      {harvest.oilYieldPct != null
                        ? `${harvest.oilYieldPct}%`
                        : "—"}
                    </TableCell>
                    <TableCell>{t(METHOD[harvest.method])}</TableCell>
                    <TableCell className="max-w-48 truncate">
                      {harvest.notes ?? "—"}
                    </TableCell>
                    <TableCell>
                      {harvest.recordedBy.firstName}{" "}
                      {harvest.recordedBy.lastName}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-8 w-8"
                          asChild
                        >
                          <Link to={`/dashboard/harvests/${harvest.id}/edit`}>
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
                                {t("deleteHarvestConfirmTitle")}
                              </AlertDialogTitle>
                              <AlertDialogDescription>
                                {t("deleteHarvestConfirmDescription")}
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
                                      intent: "deleteHarvest",
                                      harvestId: harvest.id,
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
                  <TableCell>{totals.quantity.toFixed(1)}</TableCell>
                  <TableCell>{totals.oil.toFixed(1)}</TableCell>
                  <TableCell colSpan={5} />
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
              {t("bulkDeleteHarvestsConfirmDescription")}
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
