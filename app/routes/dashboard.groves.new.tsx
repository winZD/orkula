import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { data, redirect, useNavigate, useFetcher, Link } from "react-router";
import { useTranslation } from "react-i18next";
import { ArrowLeft, Plus, X } from "lucide-react";
import { db } from "~/db/prisma";
import { getSessionUser } from "~/lib/auth.server";
import { groveSchema } from "~/lib/validations";
import type { Route } from "./+types/dashboard.groves.new";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";

export function meta() {
  return [{ title: "New Grove" }];
}

export async function loader({ request }: Route.LoaderArgs) {
  const user = await getSessionUser(request);
  if (!user) throw redirect("/login");

  const existingVarieties = await db.groveVariety.findMany({
    where: { grove: { tenantId: user.tenantId } },
    select: { variety: true },
    distinct: ["variety"],
    orderBy: { variety: "asc" },
  });

  return { existingVarieties };
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

  const varietyEntries: { variety: string; treeCount?: number }[] = [];
  const varietyNames = formData.getAll("varietyName") as string[];
  const varietyTreeCounts = formData.getAll("varietyTreeCount") as string[];

  for (let i = 0; i < varietyNames.length; i++) {
    const name = varietyNames[i].trim();
    if (!name) continue;
    const tc = varietyTreeCounts[i]
      ? parseInt(varietyTreeCounts[i], 10)
      : undefined;
    varietyEntries.push({
      variety: name,
      treeCount: tc && !isNaN(tc) ? tc : undefined,
    });
  }

  await db.grove.create({
    data: {
      name: parsed.data.name,
      location: parsed.data.location || null,
      area: parsed.data.area ?? null,
      treeCount: parsed.data.treeCount ?? null,
      tenantId: user.tenantId,
      varieties: {
        create: varietyEntries.map((v) => ({
          variety: v.variety,
          treeCount: v.treeCount ?? null,
        })),
      },
    },
  });

  return redirect("/dashboard/groves");
}

type VarietyEntry = { variety: string; treeCount: string };

export default function NewGrove({ loaderData }: Route.ComponentProps) {
  const { existingVarieties } = loaderData;
  const fetcher = useFetcher<typeof action>();
  const navigate = useNavigate();
  const isSubmitting = fetcher.state === "submitting";
  const { t } = useTranslation();

  const [varieties, setVarieties] = useState<VarietyEntry[]>([]);
  const [newVariety, setNewVariety] = useState("");

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(groveSchema),
    mode: "onBlur",
  });

  function addVariety(name: string) {
    const trimmed = name.trim();
    if (!trimmed) return;
    if (
      varieties.some((v) => v.variety.toLowerCase() === trimmed.toLowerCase())
    )
      return;
    setVarieties((prev) => [
      ...prev,
      { variety: trimmed.toUpperCase(), treeCount: "" },
    ]);
    setNewVariety("");
  }

  function removeVariety(index: number) {
    setVarieties((prev) => prev.filter((_, i) => i !== index));
  }

  function updateTreeCount(index: number, value: string) {
    setVarieties((prev) =>
      prev.map((v, i) => (i === index ? { ...v, treeCount: value } : v)),
    );
  }

  const filteredVarieties = existingVarieties.filter(
    (s) =>
      newVariety.length > 0 &&
      s.variety.toLowerCase().includes(newVariety.toLowerCase()) &&
      !varieties.some(
        (v) => v.variety.toLowerCase() === s.variety.toLowerCase(),
      ),
  );

  return (
    <div className="flex flex-1 flex-col gap-6">
      <div>
        <Link
          to="/dashboard/groves"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-forest mb-2"
        >
          <ArrowLeft className="h-4 w-4" />
          {t("back")}
        </Link>
        <h2 className="text-2xl font-bold">{t("newGrove")}</h2>
        <p className="text-muted-foreground">{t("newGroveDescription")}</p>
      </div>

      <form
        method="post"
        className="flex flex-col gap-4 max-w-2xl"
        onSubmit={handleSubmit((formData) => {
          const fd = new FormData();
          Object.entries(formData).forEach(([k, v]) => {
            if (v !== undefined && v !== null) fd.append(k, String(v));
          });
          varieties.forEach((v) => {
            fd.append("varietyName", v.variety);
            fd.append("varietyTreeCount", v.treeCount);
          });
          fetcher.submit(fd, { method: "post" });
        })}
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
              {t("area")}
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

        {/* Varieties section */}
        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium">{t("varieties")}</label>

          {varieties.map((v, i) => (
            <div key={i} className="flex items-center gap-2">
              <span className="text-sm flex-1 truncate">{v.variety}</span>
              <Input
                type="number"
                placeholder={t("trees")}
                className="w-24 cursor-text"
                value={v.treeCount}
                min={1}
                onChange={(e) => updateTreeCount(i, e.target.value)}
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="h-8 w-8 shrink-0"
                onClick={() => removeVariety(i)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ))}

          <div className="relative">
            <div className="flex gap-2">
              <Input
                className="cursor-text"
                placeholder={t("addVarietyPlaceholder")}
                value={newVariety}
                onChange={(e) => setNewVariety(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addVariety(newVariety);
                  }
                }}
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="h-9 w-9 shrink-0"
                onClick={() => addVariety(newVariety)}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            {filteredVarieties.length > 0 && (
              <div className="absolute z-10 mt-1 w-full bg-cream border rounded-md shadow-md max-h-40 overflow-y-auto">
                {filteredVarieties.map((s) => (
                  <button
                    key={s.variety}
                    type="button"
                    className="w-full text-left px-3 py-2 text-sm hover:bg-forest/10"
                    onClick={() => addVariety(s.variety)}
                  >
                    {s.variety}
                  </button>
                ))}
              </div>
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
