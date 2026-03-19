import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { data, redirect, useNavigate, useFetcher, Link } from "react-router";
import { useTranslation } from "react-i18next";
import { db } from "~/db/prisma";
import { getSessionUser } from "~/lib/auth.server";
import { hashPassword } from "~/lib/password.server";
import { addUserSchema, type AddUserInput } from "~/lib/validations";
import type { Route } from "./+types/dashboard.users.new";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { ArrowLeft } from "lucide-react";

export function meta() {
  return [{ title: "Add User" }];
}

export async function loader({ request }: Route.LoaderArgs) {
  const user = await getSessionUser(request);
  if (!user) throw redirect("/login");

  if (user.role !== "OWNER" && user.role !== "ADMIN") {
    throw redirect("/dashboard/settings");
  }

  return {};
}

export async function action({ request }: Route.ActionArgs) {
  const user = await getSessionUser(request);
  if (!user) throw redirect("/login");

  if (user.role !== "OWNER" && user.role !== "ADMIN") {
    return data({ error: "unauthorizedAction" }, { status: 403 });
  }

  const formData = await request.formData();
  const raw = Object.fromEntries(formData);
  const parsed = addUserSchema.safeParse(raw);

  if (!parsed.success) {
    return data({ error: parsed.error.issues[0].message }, { status: 400 });
  }

  const existing = await db.user.findUnique({
    where: { email: parsed.data.email },
  });

  if (existing) {
    return data({ error: "userEmailExists" }, { status: 400 });
  }

  const hashedPassword = await hashPassword(parsed.data.password);

  await db.user.create({
    data: {
      email: parsed.data.email,
      password: hashedPassword,
      firstName: parsed.data.firstName,
      lastName: parsed.data.lastName,
      role: parsed.data.role,
      tenantId: user.tenantId,
    },
  });

  return redirect("/dashboard/settings");
}

export default function NewUser() {
  const fetcher = useFetcher<typeof action>();
  const navigate = useNavigate();
  const isSubmitting = fetcher.state === "submitting";
  const { t } = useTranslation();

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<AddUserInput>({
    resolver: zodResolver(addUserSchema),
    mode: "onBlur",
    defaultValues: { role: "MEMBER" },
  });

  const selectedRole = watch("role");

  return (
    <div className="flex flex-1 flex-col gap-6">
      <div>
        <Link
          to="/dashboard/settings"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-forest mb-2"
        >
          <ArrowLeft className="h-4 w-4" />
          {t("back")}
        </Link>
        <h2 className="text-2xl font-bold">{t("addUser")}</h2>
        <p className="text-muted-foreground">{t("addUserDescription")}</p>
      </div>
      <form
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
            <label htmlFor="firstName" className="text-sm font-medium">
              {t("firstName")} *
            </label>
            <Input
              id="firstName"
              aria-invalid={!!errors.firstName}
              className="cursor-text"
              {...register("firstName")}
            />
            {errors.firstName && (
              <p className="text-xs text-destructive">
                {t(errors.firstName.message as string)}
              </p>
            )}
          </div>

          <div className="flex flex-col gap-1">
            <label htmlFor="lastName" className="text-sm font-medium">
              {t("lastName")} *
            </label>
            <Input
              id="lastName"
              className="cursor-text"
              aria-invalid={!!errors.lastName}
              {...register("lastName")}
            />
            {errors.lastName && (
              <p className="text-xs text-destructive">
                {t(errors.lastName.message as string)}
              </p>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="email" className="text-sm font-medium">
            {t("email")} *
          </label>
          <Input
            id="email"
            className="cursor-text"
            type="email"
            aria-invalid={!!errors.email}
            {...register("email")}
          />
          {errors.email && (
            <p className="text-xs text-destructive">
              {t(errors.email.message as string)}
            </p>
          )}
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="password" className="text-sm font-medium">
            {t("password")} *
          </label>
          <Input
            id="password"
            className="cursor-text"
            type="password"
            aria-invalid={!!errors.password}
            {...register("password")}
          />
          {errors.password && (
            <p className="text-xs text-destructive">
              {t(errors.password.message as string)}
            </p>
          )}
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="role" className="text-sm font-medium">
            {t("role")} *
          </label>
          <Select
            value={selectedRole}
            onValueChange={(val) => setValue("role", val as "ADMIN" | "MEMBER")}
          >
            <SelectTrigger id="role" className="w-full bg-white">
              <SelectValue placeholder={t("selectRole")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ADMIN">{t("roleAdmin")}</SelectItem>
              <SelectItem value="MEMBER">{t("roleMember")}</SelectItem>
            </SelectContent>
          </Select>
          {errors.role && (
            <p className="text-xs text-destructive">
              {t(errors.role.message as string)}
            </p>
          )}
        </div>

        <div className="flex flex-col-reverse sm:flex-row gap-3 pt-2">
          <Button
            type="button"
            variant="outline"
            className="w-full sm:w-auto"
            onClick={() => navigate("/dashboard/settings")}
          >
            {t("cancel")}
          </Button>
          <Button
            type="submit"
            disabled={isSubmitting}
            className="w-full sm:w-auto bg-forest text-cream hover:opacity-80 hover:bg-forest"
          >
            {isSubmitting ? t("saving") : t("addUser")}
          </Button>
        </div>
      </form>
    </div>
  );
}
