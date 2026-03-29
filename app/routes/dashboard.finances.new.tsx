import { useState, useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { data, redirect, useNavigate, useFetcher, Link } from "react-router";
import { useTranslation } from "react-i18next";
import { ArrowLeft, Trash2 } from "lucide-react";
import { db } from "~/db/prisma";
import { getSessionUser } from "~/lib/auth.server";
import { transactionSchema, categorySchema } from "~/lib/validations";
import type { Route } from "./+types/dashboard.finances.new";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Textarea } from "~/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";

export function meta() {
  return [{ title: "New Transaction" }];
}

export async function loader({ request }: Route.LoaderArgs) {
  const user = await getSessionUser(request);
  if (!user) throw new Response("Unauthorized", { status: 401 });

  const categories = await db.category.findMany({
    where: { tenantId: user.tenantId },
    select: {
      id: true,
      name: true,
      type: true,
      _count: { select: { transactions: true } },
    },
    orderBy: { name: "asc" },
  });

  return { categories };
}

export async function action({ request }: Route.ActionArgs) {
  const user = await getSessionUser(request);
  if (!user) throw new Response("Unauthorized", { status: 401 });

  const formData = await request.formData();
  const intent = formData.get("intent");

  // Inline category creation
  if (intent === "createCategory") {
    const raw = Object.fromEntries(formData);
    const parsed = categorySchema.safeParse(raw);

    if (!parsed.success) {
      return data({ error: parsed.error.issues[0].message }, { status: 400 });
    }

    const existing = await db.category.findFirst({
      where: {
        tenantId: user.tenantId,
        name: parsed.data.name,
        type: parsed.data.type,
      },
    });

    if (existing) {
      return data({ error: "categoryExists" }, { status: 400 });
    }

    const newCategory = await db.category.create({
      data: {
        name: parsed.data.name,
        type: parsed.data.type,
        tenantId: user.tenantId,
      },
    });

    return data({
      newCategory: {
        id: newCategory.id,
        name: newCategory.name,
        type: newCategory.type,
      },
    });
  }

  // Inline category deletion
  if (intent === "deleteCategory") {
    const categoryId = formData.get("categoryId") as string;

    const category = await db.category.findFirst({
      where: { id: categoryId, tenantId: user.tenantId },
      include: { _count: { select: { transactions: true } } },
    });

    if (!category) {
      return data({ error: "categoryNotFound" }, { status: 400 });
    }

    if (category._count.transactions > 0) {
      return data({ error: "categoryHasTransactions" }, { status: 400 });
    }

    await db.category.delete({ where: { id: categoryId } });

    return data({ deletedCategoryId: categoryId });
  }

  // Create transaction
  const raw = Object.fromEntries(formData);
  const parsed = transactionSchema.safeParse(raw);

  if (!parsed.success) {
    return data({ error: parsed.error.issues[0].message }, { status: 400 });
  }

  const category = await db.category.findFirst({
    where: { id: parsed.data.categoryId, tenantId: user.tenantId },
  });

  if (!category) {
    return data({ error: "categoryNotFound" }, { status: 400 });
  }

  await db.transaction.create({
    data: {
      type: parsed.data.type,
      amount: parsed.data.amount,
      date: new Date(parsed.data.date),
      description: parsed.data.description || null,
      totalQuantity:
        parsed.data.type === "EXPENSE"
          ? (parsed.data.totalQuantity ?? null)
          : null,
      unit: parsed.data.type === "EXPENSE" ? parsed.data.unit || null : null,
      categoryId: parsed.data.categoryId,
      tenantId: user.tenantId,
    },
  });

  return redirect("/dashboard/finances");
}

export default function NewTransaction({ loaderData }: Route.ComponentProps) {
  const { categories: initialCategories } = loaderData;
  const fetcher = useFetcher<typeof action>();
  const categoryFetcher = useFetcher<typeof action>();
  const navigate = useNavigate();
  const isSubmitting = fetcher.state === "submitting";
  const { t } = useTranslation();

  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(transactionSchema),
    mode: "onBlur",
    defaultValues: {
      type: "EXPENSE" as "EXPENSE" | "INCOME",
      categoryId: "",
      date: new Date().toISOString().split("T")[0],
    },
  });

  const selectedType = watch("type");

  // Track categories with inline-created ones
  const [categories, setCategories] = useState(initialCategories);
  const [showNewCategory, setShowNewCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [pendingCategoryId, setPendingCategoryId] = useState<string | null>(
    null,
  );
  const [categorySelectOpen, setCategorySelectOpen] = useState(false);

  // When inline category is created or deleted, update the list
  useEffect(() => {
    const d = categoryFetcher.data;
    if (!d) return;

    if ("newCategory" in d) {
      const nc = d.newCategory;
      setCategories((prev) =>
        [...prev, { ...nc, _count: { transactions: 0 } }].sort((a, b) =>
          a.name.localeCompare(b.name),
        ),
      );
      setPendingCategoryId(nc.id);
      setShowNewCategory(false);
      setNewCategoryName("");
    }

    if ("deletedCategoryId" in d) {
      const deletedId = d.deletedCategoryId;
      setCategories((prev) => prev.filter((c) => c.id !== deletedId));
      if (watch("categoryId") === deletedId) {
        setValue("categoryId", "");
      }
    }
  }, [categoryFetcher.data]);

  // Select the new category after it's rendered in the dropdown
  useEffect(() => {
    if (
      pendingCategoryId &&
      categories.some((c) => c.id === pendingCategoryId)
    ) {
      setValue("categoryId", pendingCategoryId);
      setPendingCategoryId(null);
    }
  }, [pendingCategoryId, categories, setValue]);

  const filteredCategories = categories.filter(
    (c) => c.type === selectedType && c._count.transactions === 0,
  );

  // Clear category selection when type changes and current category doesn't match
  useEffect(() => {
    const currentCategoryId = watch("categoryId");
    if (currentCategoryId) {
      const match = categories.find((c) => c.id === currentCategoryId);
      if (match && match.type !== selectedType) {
        setValue("categoryId", "");
      }
    }
  }, [selectedType, categories, setValue, watch]);

  function handleCreateCategory() {
    if (!newCategoryName.trim()) return;
    categoryFetcher.submit(
      {
        intent: "createCategory",
        name: newCategoryName.trim(),
        type: selectedType,
      },
      { method: "post" },
    );
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
        <h2 className="text-2xl font-bold">{t("newTransaction")}</h2>
        <p className="text-muted-foreground">
          {t("newTransactionDescription")}
        </p>
      </div>

      <form
        method="post"
        className="flex flex-col gap-4 max-w-2xl"
        onSubmit={handleSubmit((formData) =>
          fetcher.submit(formData, { method: "post" }),
        )}
      >
        {fetcher.data && "error" in fetcher.data && (
          <p className="text-sm text-destructive">{t(fetcher.data.error)}</p>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium">
              {t("transactionType")} *
            </label>
            <Controller
              name="type"
              control={control}
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder={t("selectType")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="EXPENSE">{t("expense")}</SelectItem>
                    <SelectItem value="INCOME">{t("income")}</SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
            {errors.type && (
              <p className="text-xs text-destructive">
                {t(errors.type.message as string)}
              </p>
            )}
          </div>

          <div className="flex flex-col gap-1">
            <label htmlFor="date" className="text-sm font-medium">
              {t("date")} *
            </label>
            <Input
              id="date"
              className="cursor-text"
              type="date"
              aria-invalid={!!errors.date}
              {...register("date")}
            />
            {errors.date && (
              <p className="text-xs text-destructive">
                {t(errors.date.message as string)}
              </p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="flex flex-col gap-1">
            <label htmlFor="amount" className="text-sm font-medium">
              {t("amount")} *
            </label>
            <Input
              id="amount"
              className="cursor-text"
              type="number"
              step="0.01"
              placeholder="e.g. 1000"
              aria-invalid={!!errors.amount}
              {...register("amount")}
            />
            {errors.amount && (
              <p className="text-xs text-destructive">
                {t(errors.amount.message as string)}
              </p>
            )}
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium">{t("category")} *</label>
            <Controller
              name="categoryId"
              control={control}
              render={({ field }) => (
                <Select
                  value={field.value}
                  onValueChange={field.onChange}
                  open={categorySelectOpen}
                  onOpenChange={setCategorySelectOpen}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder={t("selectCategory")} />
                  </SelectTrigger>
                  <SelectContent>
                    {filteredCategories.map((cat) => (
                      <SelectItem
                        key={cat.id}
                        value={cat.id}
                        className="[&>span:last-child]:w-full [&_svg]:pointer-events-auto"
                      >
                        <span className="flex items-center justify-between w-full gap-2">
                          <span>{cat.name}</span>
                          {categorySelectOpen &&
                            cat._count.transactions === 0 && (
                              <span
                                role="button"
                                className="text-destructive hover:bg-destructive/10 rounded p-0.5 shrink-0"
                                onPointerDown={(e) => {
                                  e.stopPropagation();
                                  e.preventDefault();
                                  categoryFetcher.submit(
                                    {
                                      intent: "deleteCategory",
                                      categoryId: cat.id,
                                    },
                                    { method: "post" },
                                  );
                                }}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </span>
                            )}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.categoryId && (
              <p className="text-xs text-destructive">
                {t(errors.categoryId.message as string)}
              </p>
            )}
            {!showNewCategory ? (
              <button
                type="button"
                className="text-xs text-forest/70 hover:text-forest underline self-start"
                onClick={() => setShowNewCategory(true)}
              >
                + {t("createCategoryInline")}
              </button>
            ) : (
              <div className="flex gap-2 mt-1">
                <Input
                  className="cursor-text text-sm h-8"
                  placeholder={t("categoryName")}
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleCreateCategory();
                    }
                  }}
                />
                <Button
                  type="button"
                  size="sm"
                  className="h-8 bg-forest text-cream hover:opacity-80 hover:bg-forest"
                  onClick={handleCreateCategory}
                  disabled={categoryFetcher.state === "submitting"}
                >
                  {t("save")}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="h-8"
                  onClick={() => {
                    setShowNewCategory(false);
                    setNewCategoryName("");
                  }}
                >
                  {t("cancel")}
                </Button>
              </div>
            )}
            {categoryFetcher.data && "error" in categoryFetcher.data && (
              <p className="text-xs text-destructive">
                {t(categoryFetcher.data.error)}
              </p>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="description" className="text-sm font-medium">
            {t("description")}
          </label>
          <Textarea
            id="description"
            className="cursor-text"
            placeholder={t("descriptionPlaceholder")}
            {...register("description")}
          />
        </div>

        {/* Quantity fields — only for expenses */}
        {selectedType === "EXPENSE" && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1">
              <label htmlFor="totalQuantity" className="text-sm font-medium">
                {t("totalQuantity")}
              </label>
              <Input
                id="totalQuantity"
                className="cursor-text"
                type="number"
                step="0.01"
                placeholder="e.g. 500"
                aria-invalid={!!errors.totalQuantity}
                {...register("totalQuantity")}
              />
              {errors.totalQuantity && (
                <p className="text-xs text-destructive">
                  {t(errors.totalQuantity.message as string)}
                </p>
              )}
            </div>
            <div className="flex flex-col gap-1">
              <label htmlFor="unit" className="text-sm font-medium">
                {t("unit")}
              </label>
              <Input
                id="unit"
                className="cursor-text"
                placeholder={t("unitPlaceholder")}
                {...register("unit")}
              />
            </div>
          </div>
        )}

        <div className="flex flex-col-reverse sm:flex-row gap-3 pt-2">
          <Button
            type="button"
            variant="outline"
            className="w-full sm:w-auto"
            onClick={() => navigate("/dashboard/finances")}
          >
            {t("cancel")}
          </Button>
          <Button
            type="submit"
            disabled={isSubmitting}
            className="w-full sm:w-auto bg-forest text-cream hover:opacity-80 hover:bg-forest"
          >
            {isSubmitting ? t("saving") : t("saveTransaction")}
          </Button>
        </div>
      </form>
    </div>
  );
}
