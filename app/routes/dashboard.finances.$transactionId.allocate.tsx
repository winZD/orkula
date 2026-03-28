import { useState, useMemo } from "react";
import { data, redirect, useFetcher, Link } from "react-router";
import { useTranslation } from "react-i18next";
import { ArrowLeft, Trash2 } from "lucide-react";
import { db } from "~/db/prisma";
import { getSessionUser } from "~/lib/auth.server";
import { groveApplicationSchema } from "~/lib/validations";
import type { Route } from "./+types/dashboard.finances.$transactionId.allocate";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
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

export function meta() {
  return [{ title: "Allocate to Groves" }];
}

export async function loader({ request, params }: Route.LoaderArgs) {
  const user = await getSessionUser(request);
  if (!user) throw new Response("Unauthorized", { status: 401 });

  const [transaction, groves] = await Promise.all([
    db.transaction.findFirst({
      where: { id: params.transactionId, tenantId: user.tenantId },
      include: {
        category: { select: { name: true } },
        groveApplications: {
          include: { grove: { select: { name: true } } },
          orderBy: { createdAt: "asc" },
        },
      },
    }),
    db.grove.findMany({
      where: { tenantId: user.tenantId },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);

  if (
    !transaction ||
    transaction.type !== "EXPENSE" ||
    !transaction.totalQuantity
  ) {
    throw redirect("/dashboard/finances");
  }

  return { transaction, groves };
}

export async function action({ request, params }: Route.ActionArgs) {
  const user = await getSessionUser(request);
  if (!user) throw new Response("Unauthorized", { status: 401 });

  const formData = await request.formData();
  const intent = formData.get("intent");

  const transaction = await db.transaction.findFirst({
    where: { id: params.transactionId, tenantId: user.tenantId },
    include: { groveApplications: true },
  });

  if (!transaction || !transaction.totalQuantity) {
    return data({ error: "transactionNotFound" }, { status: 404 });
  }

  if (intent === "addAllocation") {
    const raw = Object.fromEntries(formData);
    const parsed = groveApplicationSchema.safeParse(raw);

    if (!parsed.success) {
      return data({ error: parsed.error.issues[0].message }, { status: 400 });
    }

    // Verify grove belongs to tenant
    const grove = await db.grove.findFirst({
      where: { id: parsed.data.groveId, tenantId: user.tenantId },
    });
    if (!grove) {
      return data({ error: "groveNotFound" }, { status: 400 });
    }

    // Check total allocated doesn't exceed totalQuantity
    const currentAllocated = transaction.groveApplications.reduce(
      (sum, a) => sum + a.quantity,
      0,
    );
    if (currentAllocated + parsed.data.quantity > transaction.totalQuantity) {
      return data({ error: "allocationExceedsTotal" }, { status: 400 });
    }

    // Check not already allocated to this grove
    const existing = transaction.groveApplications.find(
      (a) => a.groveId === parsed.data.groveId,
    );
    if (existing) {
      return data({ error: "allocationExceedsTotal" }, { status: 400 });
    }

    const calculatedCost =
      (parsed.data.quantity / transaction.totalQuantity) * transaction.amount;

    await db.groveApplication.create({
      data: {
        quantity: parsed.data.quantity,
        calculatedCost,
        transactionId: transaction.id,
        groveId: parsed.data.groveId,
      },
    });

    return data({ success: true });
  }

  if (intent === "deleteAllocation") {
    const allocationId = formData.get("allocationId") as string;

    const allocation = await db.groveApplication.findFirst({
      where: { id: allocationId, transactionId: transaction.id },
    });

    if (!allocation) {
      return data({ error: "transactionNotFound" }, { status: 404 });
    }

    await db.groveApplication.delete({ where: { id: allocationId } });
    return data({ success: true });
  }

  return data({ error: "invalidIntent" }, { status: 400 });
}

export default function AllocateTransaction({
  loaderData,
}: Route.ComponentProps) {
  const { transaction, groves } = loaderData;
  const { t } = useTranslation();
  const fetcher = useFetcher<typeof action>();

  const [selectedGroveId, setSelectedGroveId] = useState("");
  const [quantity, setQuantity] = useState("");

  const totalQuantity = transaction.totalQuantity!;
  const allocatedQuantity = transaction.groveApplications.reduce(
    (sum, a) => sum + a.quantity,
    0,
  );
  const remainingQuantity = totalQuantity - allocatedQuantity;
  const allocatedCost = transaction.groveApplications.reduce(
    (sum, a) => sum + a.calculatedCost,
    0,
  );

  const allocatedGroveIds = new Set(
    transaction.groveApplications.map((a) => a.groveId),
  );
  console.log({ allocatedGroveIds });
  const availableGroves = groves.filter((g) => !allocatedGroveIds.has(g.id));

  const previewCost = useMemo(() => {
    const qty = parseFloat(quantity);
    if (!qty || qty <= 0) return 0;
    return (qty / totalQuantity) * transaction.amount;
  }, [quantity, totalQuantity, transaction.amount]);

  function handleAddAllocation() {
    if (!selectedGroveId || !quantity) return;
    fetcher.submit(
      {
        intent: "addAllocation",
        groveId: selectedGroveId,
        quantity,
      },
      { method: "post" },
    );
    setSelectedGroveId("");
    setQuantity("");
  }

  return (
    <div className="flex flex-1 flex-col gap-6">
      <div>
        <Link
          to="/dashboard/finances"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-forest mb-2"
        >
          <ArrowLeft className="h-4 w-4" />
          {t("back")}
        </Link>
        <h2 className="text-2xl font-bold">{t("groveAllocations")}</h2>
        <p className="text-muted-foreground">
          {t("groveAllocationsDescription")}
        </p>
      </div>

      {/* Transaction summary */}
      <Card className="bg-cream">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">{t("transactionSummary")}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-4 gap-y-1 text-sm">
            <span className="text-forest/60">{t("category")}</span>
            <span>{transaction.category.name}</span>
            <span className="text-forest/60">{t("amount")}</span>
            <span className="font-medium">
              €{transaction.amount.toFixed(2)}
            </span>
            <span className="text-forest/60">{t("totalQuantity")}</span>
            <span>
              {totalQuantity} {transaction.unit ?? ""}
            </span>
            <span className="text-forest/60">{t("date")}</span>
            <span>
              {new Date(transaction.date)
                .toLocaleDateString("en-GB")
                .replaceAll("/", ".")}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Allocation summary */}
      <div className="flex flex-wrap gap-4 text-sm">
        <div className="flex gap-1">
          <span className="font-medium">{t("allocatedQuantity")}:</span>
          <span>
            {allocatedQuantity} / {totalQuantity} {transaction.unit ?? ""}
          </span>
        </div>
        <div className="flex gap-1">
          <span className="font-medium">{t("remainingQuantity")}:</span>
          <span className={remainingQuantity < 0 ? "text-red-600" : ""}>
            {remainingQuantity.toFixed(2)} {transaction.unit ?? ""}
          </span>
        </div>
        <div className="flex gap-1">
          <span className="font-medium">{t("calculatedCost")}:</span>
          <span>
            €{allocatedCost.toFixed(2)} / €{transaction.amount.toFixed(2)}
          </span>
        </div>
      </div>

      {fetcher.data && "error" in fetcher.data && (
        <p className="text-sm text-destructive">{t(fetcher.data.error)}</p>
      )}

      {/* Existing allocations */}
      {transaction.groveApplications.length > 0 && (
        <div>
          {/* Mobile cards */}
          <div className="flex flex-col gap-3 md:hidden">
            {transaction.groveApplications.map((alloc) => (
              <Card key={alloc.id} size="sm" className="bg-cream">
                <CardContent className="pt-4">
                  <div className="flex items-center justify-between">
                    <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm flex-1">
                      <span className="text-forest/60">{t("grove")}</span>
                      <span className="font-medium">{alloc.grove.name}</span>
                      <span className="text-forest/60">{t("quantity")}</span>
                      <span>
                        {alloc.quantity} {transaction.unit ?? ""}
                      </span>
                      <span className="text-forest/60">
                        {t("calculatedCost")}
                      </span>
                      <span>€{alloc.calculatedCost.toFixed(2)}</span>
                    </div>
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
                            {t("deleteAllocation")}
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>{t("cancel")}</AlertDialogCancel>
                          <AlertDialogAction
                            variant="destructive"
                            onClick={() => {
                              fetcher.submit(
                                {
                                  intent: "deleteAllocation",
                                  allocationId: alloc.id,
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
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Desktop table */}
          <div className="hidden md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("grove")}</TableHead>
                  <TableHead>{t("quantity")}</TableHead>
                  <TableHead>{t("calculatedCost")}</TableHead>
                  <TableHead className="w-16" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {transaction.groveApplications.map((alloc) => (
                  <TableRow key={alloc.id}>
                    <TableCell className="font-medium">
                      {alloc.grove.name}
                    </TableCell>
                    <TableCell>
                      {alloc.quantity} {transaction.unit ?? ""}
                    </TableCell>
                    <TableCell>€{alloc.calculatedCost.toFixed(2)}</TableCell>
                    <TableCell>
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
                              {t("deleteAllocation")}
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>{t("cancel")}</AlertDialogCancel>
                            <AlertDialogAction
                              variant="destructive"
                              onClick={() => {
                                fetcher.submit(
                                  {
                                    intent: "deleteAllocation",
                                    allocationId: alloc.id,
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
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      {/* Add new allocation */}
      {availableGroves.length > 0 && remainingQuantity > 0 && (
        <Card className="bg-cream">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">{t("addAllocation")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row gap-3 items-end">
              <div className="flex flex-col gap-1 flex-1">
                <label className="text-sm font-medium">{t("grove")}</label>
                <Select
                  value={selectedGroveId}
                  onValueChange={setSelectedGroveId}
                >
                  <SelectTrigger className="w-full bg-white">
                    <SelectValue placeholder={t("selectGrove")} />
                  </SelectTrigger>
                  <SelectContent>
                    {availableGroves.map((grove) => (
                      <SelectItem key={grove.id} value={grove.id}>
                        {grove.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-1 flex-1">
                <label className="text-sm font-medium">
                  {t("quantity")} ({transaction.unit ?? ""})
                </label>
                <Input
                  className="cursor-text bg-white"
                  type="number"
                  step="0.01"
                  placeholder={`max ${remainingQuantity.toFixed(2)}`}
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleAddAllocation();
                    }
                  }}
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium">
                  {t("calculatedCost")}
                </label>
                <div className="h-9 flex items-center text-sm font-medium px-3 border rounded-md bg-white">
                  €{previewCost.toFixed(2)}
                </div>
              </div>
              <Button
                type="button"
                className="bg-forest text-cream hover:opacity-80 hover:bg-forest"
                onClick={handleAddAllocation}
                disabled={
                  !selectedGroveId ||
                  !quantity ||
                  fetcher.state === "submitting"
                }
              >
                {t("addAllocation")}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
