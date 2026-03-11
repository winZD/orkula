import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  data,
  Form,
  redirect,
  useActionData,
  useNavigate,
  useNavigation,
} from "react-router";
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
    return data({ error: "Grove not found" }, { status: 400 });
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

const METHODS = [
  { value: "HAND", label: "Hand" },
  { value: "RAKE", label: "Rake" },
  { value: "MECHANICAL_SHAKER", label: "Mechanical Shaker" },
  { value: "VIBRATOR", label: "Vibrator" },
  { value: "NET", label: "Net" },
];

export default function NewHarvest({ loaderData }: Route.ComponentProps) {
  const { groves } = loaderData;
  const actionData = useActionData<typeof action>();
  const navigate = useNavigate();
  const navigation = useNavigation();
  const isSubmitting = navigation.state === "submitting";

  const {
    register,
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
        <h2 className="text-2xl font-bold">New Harvest</h2>
        <p className="text-muted-foreground">Record a new harvest.</p>
      </div>

      <Form
        method="post"
        className="flex flex-col gap-4 max-w-2xl [&_input]:bg-white **:data-[slot=select-trigger]:bg-white"
      >
        {actionData?.error && (
          <p className="text-sm text-destructive">{actionData.error}</p>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium">Grove *</label>
            <Controller
              name="groveId"
              control={control}
              render={({ field }) => (
                <>
                  <input type="hidden" name="groveId" value={field.value} />
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select a grove" />
                    </SelectTrigger>
                    <SelectContent>
                      {groves.map((grove) => (
                        <SelectItem key={grove.id} value={grove.id}>
                          {grove.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </>
              )}
            />
            {errors.groveId && (
              <p className="text-xs text-destructive">
                {errors.groveId.message as string}
              </p>
            )}
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium">Method *</label>
            <Controller
              name="method"
              control={control}
              render={({ field }) => (
                <>
                  <input type="hidden" name="method" value={field.value} />
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {METHODS.map((m) => (
                        <SelectItem key={m.value} value={m.value}>
                          {m.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </>
              )}
            />
            {errors.method && (
              <p className="text-xs text-destructive">
                {errors.method.message as string}
              </p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="flex flex-col gap-1">
            <label htmlFor="date" className="text-sm font-medium">
              Date *
            </label>
            <Input
              id="date"
              type="date"
              aria-invalid={!!errors.date}
              {...register("date")}
            />
            {errors.date && (
              <p className="text-xs text-destructive">
                {errors.date.message as string}
              </p>
            )}
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="quantityKg" className="text-sm font-medium">
              Quantity (kg) *
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
                {errors.quantityKg.message as string}
              </p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="flex flex-col gap-1">
            <label htmlFor="oilYieldLt" className="text-sm font-medium">
              Oil Yield (L)
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
                {errors.oilYieldLt.message as string}
              </p>
            )}
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="oilYieldPct" className="text-sm font-medium">
              Oil Yield (%)
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
                {errors.oilYieldPct.message as string}
              </p>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="notes" className="text-sm font-medium">
            Notes
          </label>
          <Input
            id="notes"
            placeholder="Optional notes about this harvest"
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
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={isSubmitting}
            className="w-full sm:w-auto bg-forest text-cream hover:opacity-80 hover:bg-forest"
          >
            {isSubmitting ? "Creating..." : "Create Harvest"}
          </Button>
        </div>
      </Form>
    </div>
  );
}
