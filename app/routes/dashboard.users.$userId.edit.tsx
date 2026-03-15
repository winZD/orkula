import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { data, redirect, useNavigate, useFetcher } from "react-router";
import { useTranslation } from "react-i18next";
import { db } from "~/db/prisma";
import { getSessionUser } from "~/lib/auth.server";
import { hashPassword } from "~/lib/password.server";
import { editUserSchema, type EditUserInput } from "~/lib/validations";
import type { Route } from "./+types/dashboard.users.$userId.edit";
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
  return [{ title: "Edit User" }];
}

export async function loader({ request, params }: Route.LoaderArgs) {
  const currentUser = await getSessionUser(request);
  if (!currentUser) throw redirect("/login");

  if (currentUser.role !== "OWNER" && currentUser.role !== "ADMIN") {
    throw redirect("/dashboard/settings");
  }

  const targetUser = await db.user.findUnique({
    where: { id: params.userId },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      role: true,
      tenantId: true,
    },
  });

  if (!targetUser || targetUser.tenantId !== currentUser.tenantId) {
    throw redirect("/dashboard/settings");
  }

  const isEditingSelf = currentUser.id === targetUser.id;
  const isEditingOwner = targetUser.role === "OWNER";

  return { targetUser, isEditingSelf, isEditingOwner };
}

export async function action({ request, params }: Route.ActionArgs) {
  const currentUser = await getSessionUser(request);
  if (!currentUser) throw redirect("/login");

  if (currentUser.role !== "OWNER" && currentUser.role !== "ADMIN") {
    return data({ error: "unauthorizedAction" }, { status: 403 });
  }

  const targetUser = await db.user.findUnique({
    where: { id: params.userId },
    select: { id: true, tenantId: true, role: true },
  });

  if (!targetUser || targetUser.tenantId !== currentUser.tenantId) {
    return data({ error: "userNotFound" }, { status: 404 });
  }

  // Cannot edit an OWNER unless you are that OWNER
  if (targetUser.role === "OWNER" && currentUser.id !== targetUser.id) {
    return data({ error: "unauthorizedAction" }, { status: 403 });
  }

  const formData = await request.formData();
  const raw = Object.fromEntries(formData);
  const parsed = editUserSchema.safeParse(raw);

  if (!parsed.success) {
    return data({ error: parsed.error.issues[0].message }, { status: 400 });
  }

  // Check email uniqueness if changed
  const existingWithEmail = await db.user.findUnique({
    where: { email: parsed.data.email },
  });

  if (existingWithEmail && existingWithEmail.id !== targetUser.id) {
    return data({ error: "userEmailExists" }, { status: 400 });
  }

  const updateData: Record<string, string> = {
    firstName: parsed.data.firstName,
    lastName: parsed.data.lastName,
    email: parsed.data.email,
  };

  // Only update role if the target is not an OWNER
  if (targetUser.role !== "OWNER") {
    updateData.role = parsed.data.role;
  }

  // Only update password if provided
  if (parsed.data.password && parsed.data.password.length > 0) {
    updateData.password = await hashPassword(parsed.data.password);
  }

  await db.user.update({
    where: { id: targetUser.id },
    data: updateData,
  });

  return redirect("/dashboard/settings");
}

export default function EditUser({ loaderData }: Route.ComponentProps) {
  const { targetUser, isEditingSelf, isEditingOwner } = loaderData;
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
  } = useForm<EditUserInput>({
    resolver: zodResolver(editUserSchema),
    mode: "onBlur",
    defaultValues: {
      firstName: targetUser.firstName ?? "",
      lastName: targetUser.lastName ?? "",
      email: targetUser.email,
      password: "",
      role:
        targetUser.role === "OWNER"
          ? "ADMIN"
          : (targetUser.role as "ADMIN" | "MEMBER"),
    },
  });

  const selectedRole = watch("role");

  return (
    <div className="flex flex-1 flex-col gap-6">
      <div>
        <h2 className="text-2xl font-bold">{t("editUser")}</h2>
        <p className="text-muted-foreground">{t("editUserDescription")}</p>
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
            {t("password")}
          </label>
          <Input
            id="password"
            type="password"
            placeholder={t("passwordLeavBlank")}
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
            value={isEditingOwner ? "OWNER" : selectedRole}
            onValueChange={(val) => setValue("role", val as "ADMIN" | "MEMBER")}
            disabled={isEditingOwner}
          >
            <SelectTrigger id="role" className="w-full bg-white">
              <SelectValue placeholder={t("selectRole")} />
            </SelectTrigger>
            <SelectContent>
              {isEditingOwner && (
                <SelectItem value="OWNER">{t("roleOwner")}</SelectItem>
              )}
              <SelectItem value="ADMIN">{t("roleAdmin")}</SelectItem>
              <SelectItem value="MEMBER">{t("roleMember")}</SelectItem>
            </SelectContent>
          </Select>
          {isEditingOwner && (
            <p className="text-xs text-muted-foreground">
              {t("ownerRoleLocked")}
            </p>
          )}
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
            {isSubmitting ? t("saving") : t("saveChanges")}
          </Button>
        </div>
      </form>
    </div>
  );
}
