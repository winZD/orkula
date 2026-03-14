import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  data,
  redirect,
  useNavigate,
  useFetcher,
} from "react-router";
import { useTranslation } from "react-i18next";
import { db } from "~/db/prisma";
import { getSessionUser } from "~/lib/auth.server";
import { harvestSchema } from "~/lib/validations";
import type { Route } from "./+types/dashboard.harvests.new";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { Textarea } from "~/components/ui/textarea";

export function meta() {
  return [{ title: "New Harvest" }];
}

export async function loader({ request }: Route.LoaderArgs) {
  const user = await getSessionUser(request);
  if (!user) throw new Response("Unauthorized", { status: 401 });

  const groves = await db.grove.findMany({
    where: { tenantId: user.tenantId },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });

  return { groves };
}

export async function action({ request }: Route.ActionArgs) {
  const user = await getSessionUser(request);
  if (!user) throw new Response("Unauthorized", { status: 401 });

  const formData = await request.formData();
  const raw = Object.fromEntries(formData);
  const parsed = harvestSchema.safeParse(raw);

  if (!parsed.success) {
    return data({ error: parsed.error.issues[0].message }, { status: 400 });
  }

  const grove = await db.grove.findFirst({
    where: { id: parsed.data.groveId, tenantId: user.tenantId },
  });
  if (!grove) {
    return data({ error: "groveNotFound" }, { status: 400 });
  }

  await db.harvest.create({
    data: {
      date: new Date(parsed.data.date),
      quantityKg: parsed.data.quantityKg,
      oilYieldLt: parsed.data.oilYieldLt ?? null,
      oilYieldPct: parsed.data.oilYieldPct ?? null,
      method: parsed.data.method,
      notes: parsed.data.notes || null,
      groveId: parsed.data.groveId,
      recordedById: user.id,
      tenantId: user.tenantId,
    },
  });

  return redirect("/dashboard/harvests");
}

const METHOD_KEYS = ["HAND", "RAKE", "MECHANICAL_SHAKER", "VIBRATOR", "NET"] as const;

const METHOD_T_KEY: Record<string, string> = {
  HAND: "methodHand",
  RAKE: "methodRake",
  MECHANICAL_SHAKER: "methodMechanicalShaker",
  VIBRATOR: "methodVibrator",
  NET: "methodNet",
};

export default function NewHarvest({ loaderData }: Route.ComponentProps) {
  const { groves } = loaderData;
  const fetcher = useFetcher<typeof action>();
  const navigate = useNavigate();
  const isSubmitting = fetcher.state === "submitting";
  const { t } = useTranslation();

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(harvestSchema),
    mode: "onBlur",
    defaultValues: {
      groveId: "",
      method: "HAND" as const,
    },
  });

  return (
    <div className="flex flex-1 flex-col gap-6">
      <div>
        <h2 className="text-2xl font-bold">{t("newHarvest")}</h2>
        <p className="text-muted-foreground">{t("newHarvestDescription")}</p>
      </div>

      <form
        method="post"
        className="flex flex-col gap-4 max-w-2xl"
        onSubmit={handleSubmit((formData) =>
          fetcher.submit(formData, { method: "post" })
        )}
      >
        {fetcher.data && "error" in fetcher.data && (
          <p className="text-sm text-destructive">{t(fetcher.data.error)}</p>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium">{t("grove")} *</label>
            <Controller
              name="groveId"
              control={control}
              render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder={t("selectGrove")} />
                    </SelectTrigger>
                    <SelectContent>
                      {groves.map((grove) => (
                        <SelectItem key={grove.id} value={grove.id}>
                          {grove.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
              )}
            />
            {errors.groveId && (
              <p className="text-xs text-destructive">
                {t(errors.groveId.message as string)}
              </p>
            )}
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium">{t("method")} *</label>
            <Controller
              name="method"
              control={control}
              render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {METHOD_KEYS.map((key) => (
                        <SelectItem key={key} value={key}>
                          {t(METHOD_T_KEY[key])}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
              )}
            />
            {errors.method && (
              <p className="text-xs text-destructive">
                {t(errors.method.message as string)}
              </p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="flex flex-col gap-1">
            <label htmlFor="date" className="text-sm font-medium">
              {t("date")} *
            </label>
            <Input
              id="date"
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
          <div className="flex flex-col gap-1">
            <label htmlFor="quantityKg" className="text-sm font-medium">
              {t("quantityKg")} *
            </label>
            <Input
              id="quantityKg"
              type="number"
              step="0.1"
              placeholder="e.g. 500"
              aria-invalid={!!errors.quantityKg}
              {...register("quantityKg")}
            />
            {errors.quantityKg && (
              <p className="text-xs text-destructive">
                {t(errors.quantityKg.message as string)}
              </p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="flex flex-col gap-1">
            <label htmlFor="oilYieldLt" className="text-sm font-medium">
              {t("oilYieldLt")}
            </label>
            <Input
              id="oilYieldLt"
              type="number"
              step="0.1"
              placeholder="e.g. 75"
              aria-invalid={!!errors.oilYieldLt}
              {...register("oilYieldLt")}
            />
            {errors.oilYieldLt && (
              <p className="text-xs text-destructive">
                {t(errors.oilYieldLt.message as string)}
              </p>
            )}
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="oilYieldPct" className="text-sm font-medium">
              {t("oilYieldPct")}
            </label>
            <Input
              id="oilYieldPct"
              type="number"
              step="0.1"
              placeholder="e.g. 15"
              aria-invalid={!!errors.oilYieldPct}
              {...register("oilYieldPct")}
            />
            {errors.oilYieldPct && (
              <p className="text-xs text-destructive">
                {t(errors.oilYieldPct.message as string)}
              </p>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="notes" className="text-sm font-medium">
            {t("notes")}
          </label>
          <Textarea
            id="notes"
            placeholder={t("notesPlaceholder")}
            {...register("notes")}
          />
        </div>

        <div className="flex flex-col-reverse sm:flex-row gap-3 pt-2">
          <Button
            type="button"
            variant="outline"
            className="w-full sm:w-auto"
            onClick={() => navigate("/dashboard/harvests")}
          >
            {t("cancel")}
          </Button>
          <Button
            type="submit"
            disabled={isSubmitting}
            className="w-full sm:w-auto bg-forest text-cream hover:opacity-80 hover:bg-forest"
          >
            {isSubmitting ? t("saving") : t("saveHarvest")}
          </Button>
        </div>
      </form>
    </div>
  );
}
