import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { data, redirect, useNavigate, useFetcher, Link } from "react-router";
import { useTranslation } from "react-i18next";
import { ArrowLeft } from "lucide-react";
import { db } from "~/db/prisma";
import { getSessionUser } from "~/lib/auth.server";
import { groveSchema } from "~/lib/validations";
import type { Route } from "./+types/dashboard.groves.new";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";

export function meta() {
  return [{ title: "New Grove" }];
}

export async function action({ request }: Route.ActionArgs) {
  const user = await getSessionUser(request);
  if (!user) throw new Response("Unauthorized", { status: 401 });

  const formData = await request.formData();
  const raw = Object.fromEntries(formData);
  const parsed = groveSchema.safeParse(raw);

  if (!parsed.success) {
    return data({ error: parsed.error.issues[0].message }, { status: 400 });
  }

  await db.grove.create({
    data: {
      name: parsed.data.name,
      location: parsed.data.location || null,
      area: parsed.data.area ?? null,
      treeCount: parsed.data.treeCount ?? null,
      tenantId: user.tenantId,
    },
  });

  return redirect("/dashboard/groves");
}

export default function NewGrove() {
  const fetcher = useFetcher<typeof action>();
  const navigate = useNavigate();
  const isSubmitting = fetcher.state === "submitting";
  const { t } = useTranslation();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(groveSchema),
    mode: "onBlur",
  });

  return (
    <div className="flex flex-1 flex-col gap-6">
      <div>
        <Link to="/dashboard" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-forest mb-2">
          <ArrowLeft className="h-4 w-4" />
          {t("back")}
        </Link>
        <h2 className="text-2xl font-bold">{t("newGrove")}</h2>
        <p className="text-muted-foreground">{t("newGroveDescription")}</p>
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
        <div className="flex flex-col gap-1">
          <label htmlFor="name" className="text-sm font-medium">
            {t("name")} *
          </label>
          <Input
            id="name"
            className="cursor-text"
            placeholder={t("namePlaceholder")}
            aria-invalid={!!errors.name}
            {...register("name")}
          />
          {errors.name && (
            <p className="text-xs text-destructive">
              {t(errors.name.message as string)}
            </p>
          )}
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="location" className="text-sm font-medium">
            {t("location")}
          </label>
          <Input
            id="location"
            className="cursor-text"
            placeholder={t("locationPlaceholder")}
            {...register("location")}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="flex flex-col gap-1">
            <label htmlFor="area" className="text-sm font-medium">
              {t("areaHa")}
            </label>
            <Input
              id="area"
              className="cursor-text"
              type="number"
              step="0.01"
              placeholder="e.g. 2.5"
              aria-invalid={!!errors.area}
              {...register("area")}
            />
            {errors.area && (
              <p className="text-xs text-destructive">
                {t(errors.area.message as string)}
              </p>
            )}
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="treeCount" className="text-sm font-medium">
              {t("trees")}
            </label>
            <Input
              id="treeCount"
              className="cursor-text"
              type="number"
              placeholder="e.g. 150"
              aria-invalid={!!errors.treeCount}
              {...register("treeCount")}
            />
            {errors.treeCount && (
              <p className="text-xs text-destructive">
                {t(errors.treeCount.message as string)}
              </p>
            )}
          </div>
        </div>

        <div className="flex flex-col-reverse sm:flex-row gap-3 pt-2">
          <Button
            type="button"
            variant="outline"
            className="w-full sm:w-auto"
            onClick={() => navigate("/dashboard/groves")}
          >
            {t("cancel")}
          </Button>
          <Button
            type="submit"
            disabled={isSubmitting}
            className="w-full sm:w-auto bg-forest text-cream hover:opacity-80 hover:bg-forest"
          >
            {isSubmitting ? t("saving") : t("saveGrove")}
          </Button>
        </div>
      </form>
    </div>
  );
}
