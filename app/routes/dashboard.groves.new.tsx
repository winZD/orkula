import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  data,
  Form,
  redirect,
  useActionData,
  useNavigate,
  useNavigation,
} from "react-router";
import { useTranslation } from "react-i18next";
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
  const actionData = useActionData<typeof action>();
  const navigate = useNavigate();
  const navigation = useNavigation();
  const isSubmitting = navigation.state === "submitting";
  const { t } = useTranslation();

  const {
    register,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(groveSchema),
    mode: "onBlur",
  });

  return (
    <div className="flex flex-1 flex-col gap-6">
      <div>
        <h2 className="text-2xl font-bold">{t("newGrove")}</h2>
        <p className="text-muted-foreground">{t("newGroveDescription")}</p>
      </div>

      <Form
        method="post"
        className="flex flex-col gap-4 max-w-2xl [&_input]:bg-white **:data-[slot=select-trigger]:bg-white"
      >
        {actionData?.error && (
          <p className="text-sm text-destructive">{actionData.error}</p>
        )}

        <div className="flex flex-col gap-1">
          <label htmlFor="name" className="text-sm font-medium">
            {t("name")} *
          </label>
          <Input
            id="name"
            placeholder={t("namePlaceholder")}
            aria-invalid={!!errors.name}
            {...register("name")}
          />
          {errors.name && (
            <p className="text-xs text-destructive">
              {errors.name.message as string}
            </p>
          )}
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="location" className="text-sm font-medium">
            {t("location")}
          </label>
          <Input
            id="location"
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
              type="number"
              step="0.01"
              placeholder="e.g. 2.5"
              aria-invalid={!!errors.area}
              {...register("area")}
            />
            {errors.area && (
              <p className="text-xs text-destructive">
                {errors.area.message as string}
              </p>
            )}
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="treeCount" className="text-sm font-medium">
              {t("trees")}
            </label>
            <Input
              id="treeCount"
              type="number"
              placeholder="e.g. 150"
              aria-invalid={!!errors.treeCount}
              {...register("treeCount")}
            />
            {errors.treeCount && (
              <p className="text-xs text-destructive">
                {errors.treeCount.message as string}
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
      </Form>
    </div>
  );
}
