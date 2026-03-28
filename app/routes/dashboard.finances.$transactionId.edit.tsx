import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { data, redirect, useNavigate, useFetcher, Link } from "react-router";
import { useTranslation } from "react-i18next";
import { ArrowLeft } from "lucide-react";
import { db } from "~/db/prisma";
import { getSessionUser } from "~/lib/auth.server";
import { transactionSchema } from "~/lib/validations";
import type { Route } from "./+types/dashboard.finances.$transactionId.edit";
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
  return [{ title: "Edit Transaction" }];
}

export async function loader({ request, params }: Route.LoaderArgs) {
  const user = await getSessionUser(request);
  if (!user) throw new Response("Unauthorized", { status: 401 });

  const [transaction, categories] = await Promise.all([
    db.transaction.findFirst({
      where: { id: params.transactionId, tenantId: user.tenantId },
    }),
    db.category.findMany({
      where: { tenantId: user.tenantId },
      select: { id: true, name: true, type: true },
      orderBy: { name: "asc" },
    }),
  ]);

  if (!transaction) throw redirect("/dashboard/finances");

  return { transaction, categories };
}

export async function action({ request, params }: Route.ActionArgs) {
  const user = await getSessionUser(request);
  if (!user) throw new Response("Unauthorized", { status: 401 });

  const formData = await request.formData();
  const raw = Object.fromEntries(formData);
  const parsed = transactionSchema.safeParse(raw);

  if (!parsed.success) {
    return data({ error: parsed.error.issues[0].message }, { status: 400 });
  }

  const transaction = await db.transaction.findFirst({
    where: { id: params.transactionId, tenantId: user.tenantId },
  });

  if (!transaction) {
    return data({ error: "transactionNotFound" }, { status: 404 });
  }

  const category = await db.category.findFirst({
    where: { id: parsed.data.categoryId, tenantId: user.tenantId },
  });

  if (!category) {
    return data({ error: "categoryNotFound" }, { status: 400 });
  }

  await db.transaction.update({
    where: { id: transaction.id },
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
    },
  });

  return redirect("/dashboard/finances");
}

export default function EditTransaction({ loaderData }: Route.ComponentProps) {
  const { transaction, categories } = loaderData;
  const fetcher = useFetcher<typeof action>();
  const navigate = useNavigate();
  const isSubmitting = fetcher.state === "submitting";
  const { t } = useTranslation();

  const dateStr = new Date(transaction.date).toISOString().split("T")[0];

  const {
    register,
    handleSubmit,
    control,
    watch,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(transactionSchema),
    mode: "onBlur",
    defaultValues: {
      type: transaction.type as "EXPENSE" | "INCOME",
      amount: transaction.amount,
      date: dateStr,
      categoryId: transaction.categoryId,
      description: transaction.description ?? "",
      totalQuantity: transaction.totalQuantity ?? "",
      unit: transaction.unit ?? "",
    },
  });

  const selectedType = watch("type");
  const filteredCategories = categories.filter((c) => c.type === selectedType);

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
        <h2 className="text-2xl font-bold">{t("editTransaction")}</h2>
        <p className="text-muted-foreground">
          {t("editTransactionDescription")}
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
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder={t("selectCategory")} />
                  </SelectTrigger>
                  <SelectContent>
                    {filteredCategories.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id}>
                        {cat.name}
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
            {isSubmitting ? t("saving") : t("saveChanges")}
          </Button>
        </div>
      </form>
    </div>
  );
}
