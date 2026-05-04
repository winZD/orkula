import { useState, useEffect, useRef, useCallback } from "react";
import {
  Link,
  useFetcher,
  data,
  useSearchParams,
  useNavigate,
} from "react-router";
import { useTranslation } from "react-i18next";
import { Pencil, Trash2, Loader2, Split } from "lucide-react";
import { db } from "~/db/prisma";
import { getSessionUser } from "~/lib/auth.server";
import type { Route } from "./+types/dashboard.finances";
import { Button } from "~/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { Checkbox } from "~/components/ui/checkbox";
import { useRowSelection } from "~/hooks/use-row-selection";
import { BulkActionBar } from "~/components/bulk-action-bar";
import { SummaryCard } from "~/components/summary-card";

const PAGE_SIZE = 20;

export function meta() {
  return [{ title: "Finances" }];
}

export async function loader({ request }: Route.LoaderArgs) {
  const user = await getSessionUser(request);
  if (!user) throw new Response("Unauthorized", { status: 401 });

  const url = new URL(request.url);
  const skip = parseInt(url.searchParams.get("skip") || "0", 10);
  const currentYear = parseInt(
    url.searchParams.get("year") || String(new Date().getFullYear()),
    10,
  );
  const typeFilter = url.searchParams.get("type") || "ALL";

  const yearStart = new Date(currentYear, 0, 1);
  const yearEnd = new Date(currentYear + 1, 0, 1);

  const yearFilter: Record<string, unknown> = {
    tenantId: user.tenantId,
    date: { gte: yearStart, lt: yearEnd },
    ...(typeFilter === "EXPENSE" || typeFilter === "INCOME"
      ? { type: typeFilter }
      : {}),
  };

  const [transactions, totalCount, expenseSum, incomeSum, yearsRaw] =
    await Promise.all([
      db.transaction.findMany({
        where: yearFilter,
        include: {
          category: { select: { name: true } },
          _count: { select: { groveApplications: true } },
          groveApplications: {
            select: { quantity: true },
          },
        },
        orderBy: { date: "desc" },
        skip,
        take: PAGE_SIZE,
      }),
      db.transaction.count({ where: yearFilter }),
      db.transaction.aggregate({
        where: { ...yearFilter, type: "EXPENSE" },
        _sum: { amount: true },
      }),
      db.transaction.aggregate({
        where: { ...yearFilter, type: "INCOME" },
        _sum: { amount: true },
      }),
      db.$queryRaw<{ year: number }[]>`
        SELECT DISTINCT EXTRACT(YEAR FROM date)::int AS year
        FROM "Transaction"
        WHERE "tenantId" = ${user.tenantId}
        ORDER BY year DESC
      `,
    ]);

  const availableYears = yearsRaw.map((r) => r.year);
  if (!availableYears.includes(currentYear)) {
    availableYears.push(currentYear);
    availableYears.sort((a, b) => b - a);
  }

  return {
    transactions: transactions.map((tx) => ({
      ...tx,
      allocatedQuantity: tx.groveApplications.reduce(
        (sum, a) => sum + a.quantity,
        0,
      ),
    })),
    hasMore: skip + transactions.length < totalCount,
    totals: {
      expenses: expenseSum._sum.amount ?? 0,
      income: incomeSum._sum.amount ?? 0,
    },
    availableYears,
    currentYear,
    typeFilter,
  };
}

export async function action({ request }: Route.ActionArgs) {
  const user = await getSessionUser(request);
  if (!user) throw new Response("Unauthorized", { status: 401 });

  const formData = await request.formData();
  const intent = formData.get("intent");

  if (intent === "deleteTransaction") {
    const transactionId = formData.get("transactionId") as string;

    const transaction = await db.transaction.findFirst({
      where: { id: transactionId, tenantId: user.tenantId },
    });

    if (!transaction) {
      return data({ error: "transactionNotFound" }, { status: 404 });
    }

    await db.transaction.delete({ where: { id: transactionId } });
    return data({ success: true });
  }

  if (intent === "deleteManyTransactions") {
    const ids = formData.getAll("ids") as string[];
    if (ids.length === 0) {
      return data({ error: "invalidIntent" }, { status: 400 });
    }

    const count = await db.transaction.count({
      where: { id: { in: ids }, tenantId: user.tenantId },
    });

    if (count !== ids.length) {
      return data({ error: "transactionNotFound" }, { status: 404 });
    }

    await db.transaction.deleteMany({
      where: { id: { in: ids }, tenantId: user.tenantId },
    });

    return data({ success: true });
  }

  return data({ error: "invalidIntent" }, { status: 400 });
}

export default function Finances({ loaderData }: Route.ComponentProps) {
  const {
    transactions: initialTransactions,
    hasMore: initialHasMore,
    totals,
    availableYears,
    currentYear,
    typeFilter,
  } = loaderData;
  const { t } = useTranslation();
  const navigate = useNavigate();
  const deleteFetcher = useFetcher<typeof action>();
  const loadMoreFetcher = useFetcher<typeof loader>();

  const [allTransactions, setAllTransactions] = useState(initialTransactions);
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
  } = useRowSelection(allTransactions.map((tx) => tx.id));

  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);

  useEffect(() => {
    setAllTransactions(initialTransactions);
    setHasMore(initialHasMore);
    clearSelection();
  }, [initialTransactions, initialHasMore, clearSelection]);

  useEffect(() => {
    const d = loadMoreFetcher.data;
    if (d && "transactions" in d) {
      setAllTransactions((prev) => [...prev, ...d.transactions]);
      setHasMore(d.hasMore);
    }
  }, [loadMoreFetcher.data]);

  const loadMore = useCallback(() => {
    if (loadMoreFetcher.state === "idle" && hasMore) {
      loadMoreFetcher.load(
        `/dashboard/finances?year=${currentYear}&type=${typeFilter}&skip=${allTransactions.length}`,
      );
    }
  }, [loadMoreFetcher, hasMore, allTransactions.length, currentYear]);

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

  function handleYearChange(year: string) {
    navigate(`/dashboard/finances?year=${year}&type=${typeFilter}`);
  }

  function handleTypeChange(type: string) {
    navigate(`/dashboard/finances?year=${currentYear}&type=${type}`);
  }

  function handleBulkDelete() {
    const formData = new FormData();
    formData.append("intent", "deleteManyTransactions");
    for (const id of selectedIds) {
      formData.append("ids", id);
    }
    deleteFetcher.submit(formData, { method: "post" });
    setBulkDeleteOpen(false);
  }

  const net = totals.income - totals.expenses;

  return (
    <div className="flex flex-1 flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">{t("finances")}</h2>
          <p className="text-muted-foreground">{t("financesDescription")}</p>
        </div>
        <Button
          asChild
          className="bg-forest text-cream hover:opacity-80 hover:bg-forest"
        >
          <Link to="/dashboard/finances/new">{t("newTransaction")}</Link>
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row items-start md:items-center gap-4">
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium">{t("year")}:</label>
          <Select value={String(currentYear)} onValueChange={handleYearChange}>
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
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium">{t("transactionType")}:</label>
          <Select value={typeFilter} onValueChange={handleTypeChange}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">{t("all")}</SelectItem>
              <SelectItem value="EXPENSE">{t("expense")}</SelectItem>
              <SelectItem value="INCOME">{t("income")}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <SummaryCard
          title={t("totalExpenses")}
          value={`€${totals.expenses.toFixed(2)}`}
        />
        <SummaryCard
          title={t("totalIncome")}
          value={`€${totals.income.toFixed(2)}`}
        />
        <SummaryCard
          title={t("netResult")}
          value={`${net >= 0 ? "+" : ""}€${net.toFixed(2)}`}
        />
      </div>

      {allTransactions.length === 0 ? (
        <p className="text-center text-muted-foreground py-8">
          {t("noTransactions")}
        </p>
      ) : (
        <>
          {/* Mobile cards */}
          <div className="flex flex-col gap-3 md:hidden">
            {allTransactions.map((tx) => (
              <Card key={tx.id} size="sm" className="bg-cream">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      <Checkbox
                        checked={selectedIds.has(tx.id)}
                        onCheckedChange={() => toggleItem(tx.id)}
                        className="mt-1 border-forest data-[state=checked]:border-forest data-[state=checked]:bg-forest data-[state=checked]:text-cream"
                      />
                      <div>
                        <CardTitle className="flex items-center gap-2">
                          <span
                            className={`inline-block text-xs px-2 py-0.5 rounded-full font-medium ${
                              tx.type === "EXPENSE"
                                ? "bg-red-100 text-red-700"
                                : "bg-green-100 text-green-700"
                            }`}
                          >
                            {t(tx.type === "EXPENSE" ? "expense" : "income")}
                          </span>
                          €{tx.amount.toFixed(2)}
                        </CardTitle>
                        <span className="text-xs text-forest/50">
                          {new Date(tx.date)
                            .toLocaleDateString("en-GB")
                            .replaceAll("/", ".")}
                        </span>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      {tx.type === "EXPENSE" &&
                        tx.totalQuantity != null &&
                        tx.totalQuantity > 0 && (
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-8 w-8"
                            asChild
                          >
                            <Link to={`/dashboard/finances/${tx.id}/allocate`}>
                              <Split className="h-4 w-4" />
                            </Link>
                          </Button>
                        )}
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8"
                        asChild
                      >
                        <Link to={`/dashboard/finances/${tx.id}/edit`}>
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
                              {t("deleteTransactionConfirmTitle")}
                            </AlertDialogTitle>
                            <AlertDialogDescription>
                              {t("deleteTransactionConfirmDescription")}
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>{t("cancel")}</AlertDialogCancel>
                            <AlertDialogAction
                              variant="destructive"
                              onClick={() => {
                                deleteFetcher.submit(
                                  {
                                    intent: "deleteTransaction",
                                    transactionId: tx.id,
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
                    <span className="text-forest/60">{t("category")}</span>
                    <span>{tx.category.name}</span>
                    {tx.description && (
                      <>
                        <span className="text-forest/60">
                          {t("description")}
                        </span>
                        <span className="truncate">{tx.description}</span>
                      </>
                    )}
                    {tx.totalQuantity != null && (
                      <>
                        <span className="text-forest/60">
                          {t("allocatedQuantity")}
                        </span>
                        <span>
                          {tx.allocatedQuantity} / {tx.totalQuantity}{" "}
                          {tx.unit ?? ""}
                        </span>
                      </>
                    )}
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
                  <TableHead>{t("transactionType")}</TableHead>
                  <TableHead>{t("category")}</TableHead>
                  <TableHead>{t("amount")}</TableHead>
                  <TableHead>{t("description")}</TableHead>
                  <TableHead>{t("allocatedQuantity")}</TableHead>
                  <TableHead className="w-32" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {allTransactions.map((tx) => (
                  <TableRow
                    key={tx.id}
                    data-state={selectedIds.has(tx.id) ? "selected" : undefined}
                  >
                    <TableCell>
                      <Checkbox
                        checked={selectedIds.has(tx.id)}
                        onCheckedChange={() => toggleItem(tx.id)}
                        className="border-forest data-[state=checked]:border-forest data-[state=checked]:bg-forest data-[state=checked]:text-cream"
                      />
                    </TableCell>
                    <TableCell>
                      {new Date(tx.date)
                        .toLocaleDateString("en-GB")
                        .replaceAll("/", ".")}
                    </TableCell>
                    <TableCell>
                      <span
                        className={`inline-block text-xs px-2 py-0.5 rounded-full font-medium ${
                          tx.type === "EXPENSE"
                            ? "bg-red-100 text-red-700"
                            : "bg-green-100 text-green-700"
                        }`}
                      >
                        {t(tx.type === "EXPENSE" ? "expense" : "income")}
                      </span>
                    </TableCell>
                    <TableCell>{tx.category.name}</TableCell>
                    <TableCell className="font-medium">
                      €{tx.amount.toFixed(2)}
                    </TableCell>
                    <TableCell className="max-w-48 truncate">
                      {tx.description ?? "—"}
                    </TableCell>
                    <TableCell>
                      {tx.totalQuantity != null ? (
                        <span className="text-sm">
                          {tx.allocatedQuantity} / {tx.totalQuantity}{" "}
                          {tx.unit ?? ""}
                        </span>
                      ) : (
                        "—"
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        {tx.type === "EXPENSE" &&
                          tx.totalQuantity != null &&
                          tx.totalQuantity > 0 && (
                            <Button
                              variant="outline"
                              size="icon"
                              className="h-8 w-8"
                              asChild
                              title={t("allocate")}
                            >
                              <Link
                                to={`/dashboard/finances/${tx.id}/allocate`}
                              >
                                <Split className="h-4 w-4" />
                              </Link>
                            </Button>
                          )}
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-8 w-8"
                          asChild
                        >
                          <Link to={`/dashboard/finances/${tx.id}/edit`}>
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
                                {t("deleteTransactionConfirmTitle")}
                              </AlertDialogTitle>
                              <AlertDialogDescription>
                                {t("deleteTransactionConfirmDescription")}
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
                                      intent: "deleteTransaction",
                                      transactionId: tx.id,
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
            </Table>
          </div>
        </>
      )}

      {hasMore && (
        <div ref={sentinelRef} className="flex justify-center py-4">
          {isLoadingMore && (
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          )}
        </div>
      )}

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
              {t("bulkDeleteTransactionsConfirmDescription")}
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
