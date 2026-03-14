import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { data, redirect, useFetcher } from "react-router";
import { useTranslation } from "react-i18next";
import { db } from "~/db/prisma";
import { getSessionUser } from "~/lib/auth.server";
import { hashPassword } from "~/lib/password.server";
import { localeCookie } from "~/cookies";
import { addUserSchema, type AddUserInput } from "~/lib/validations";
import type { Route } from "./+types/dashboard.settings";
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

const SUPPORTED_LANGUAGES = [
  { code: "hr", label: "Hrvatski" },
  { code: "en", label: "English" },
] as const;

export async function loader({ request }: Route.LoaderArgs) {
  const user = await getSessionUser(request);
  if (!user) throw redirect("/login");

  const cookieHeader = request.headers.get("Cookie");
  const lng = await localeCookie.parse(cookieHeader);

  const canManageUsers = user.role === "OWNER" || user.role === "ADMIN";

  let teamMembers: {
    id: string;
    firstName: string | null;
    lastName: string | null;
    email: string;
    role: string;
  }[] = [];

  if (canManageUsers) {
    teamMembers = await db.user.findMany({
      where: { tenantId: user.tenantId },
      select: { id: true, firstName: true, lastName: true, email: true, role: true },
      orderBy: { createdAt: "asc" },
    });
  }

  return {
    currentLanguage: lng || null,
    canManageUsers,
    teamMembers,
    currentUserId: user.id,
  };
}

export async function action({ request }: Route.ActionArgs) {
  const user = await getSessionUser(request);
  if (!user) throw redirect("/login");

  const formData = await request.formData();
  const intent = formData.get("intent");

  if (intent === "addUser") {
    if (user.role !== "OWNER" && user.role !== "ADMIN") {
      return data({ intent: "addUser", error: "unauthorizedAction" }, { status: 403 });
    }

    const raw = Object.fromEntries(formData);
    const parsed = addUserSchema.safeParse(raw);

    if (!parsed.success) {
      return data(
        { intent: "addUser", error: parsed.error.issues[0].message },
        { status: 400 },
      );
    }

    const existing = await db.user.findUnique({
      where: { email: parsed.data.email },
    });

    if (existing) {
      return data({ intent: "addUser", error: "userEmailExists" }, { status: 400 });
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

    return data({ intent: "addUser", success: true });
  }

  // Default: language change
  const lng = formData.get("lng");

  if (lng !== "hr" && lng !== "en") {
    return data({ intent: "language", error: "validationInvalidLanguage" }, { status: 400 });
  }

  return data(
    { intent: "language", success: true },
    { headers: { "Set-Cookie": await localeCookie.serialize(lng) } },
  );
}

export default function Settings({ loaderData }: Route.ComponentProps) {
  const { t, i18n } = useTranslation();
  const fetcher = useFetcher<typeof action>();
  const addUserFetcher = useFetcher<typeof action>();

  const savedLang = loaderData.currentLanguage || i18n.language;
  const [selectedLang, setSelectedLang] = useState(savedLang);
  const hasChanged = selectedLang !== savedLang;

  const roleTranslations: Record<string, string> = {
    OWNER: t("roleOwner"),
    ADMIN: t("roleAdmin"),
    MEMBER: t("roleMember"),
  };

  function handleSave() {
    fetcher.submit({ lng: selectedLang, intent: "language" }, { method: "post" });
    i18n.changeLanguage(selectedLang);
  }

  const addUserSuccess =
    addUserFetcher.data &&
    "intent" in addUserFetcher.data &&
    addUserFetcher.data.intent === "addUser" &&
    "success" in addUserFetcher.data;

  const addUserError =
    addUserFetcher.data &&
    "intent" in addUserFetcher.data &&
    addUserFetcher.data.intent === "addUser" &&
    "error" in addUserFetcher.data
      ? addUserFetcher.data.error
      : null;

  return (
    <div className="flex flex-1 flex-col gap-8">
      <div>
        <h2 className="text-2xl font-bold">{t("settings")}</h2>
        <p className="text-muted-foreground">{t("settingsDescription")}</p>
      </div>

      {/* Language section */}
      <div className="flex flex-col gap-4 max-w-2xl">
        <div className="flex flex-col gap-1">
          <label htmlFor="language-select" className="text-sm font-medium">
            {t("language")}
          </label>
          <Select value={selectedLang} onValueChange={setSelectedLang}>
            <SelectTrigger id="language-select" className="w-full bg-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SUPPORTED_LANGUAGES.map((lang) => (
                <SelectItem key={lang.code} value={lang.code}>
                  {lang.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Button
            onClick={handleSave}
            disabled={!hasChanged}
            className="bg-forest text-cream hover:opacity-80 hover:bg-forest"
          >
            {t("save")}
          </Button>
        </div>
      </div>

      {/* User management section - only for OWNER/ADMIN */}
      {loaderData.canManageUsers && (
        <>
          <hr className="border-forest/10" />

          <div>
            <h3 className="text-xl font-bold">{t("teamMembers")}</h3>
            <p className="text-muted-foreground">{t("teamMembersDescription")}</p>
          </div>

          {/* Current team members table */}
          <div className="max-w-2xl">
            {loaderData.teamMembers.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("name")}</TableHead>
                    <TableHead>{t("email")}</TableHead>
                    <TableHead>{t("role")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loaderData.teamMembers.map((member) => (
                    <TableRow key={member.id}>
                      <TableCell>
                        {member.firstName} {member.lastName}
                        {member.id === loaderData.currentUserId && (
                          <span className="ml-1 text-xs text-muted-foreground">(you)</span>
                        )}
                      </TableCell>
                      <TableCell>{member.email}</TableCell>
                      <TableCell>{roleTranslations[member.role] ?? member.role}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <p className="text-sm text-muted-foreground">{t("noTeamMembers")}</p>
            )}
          </div>

          {/* Add user form */}
          <div>
            <h4 className="text-lg font-semibold">{t("addUser")}</h4>
            <p className="text-sm text-muted-foreground">{t("addUserDescription")}</p>
          </div>

          <AddUserForm
            fetcher={addUserFetcher}
            error={addUserError}
            success={!!addUserSuccess}
          />
        </>
      )}
    </div>
  );
}

function AddUserForm({
  fetcher,
  error,
  success,
}: {
  fetcher: ReturnType<typeof useFetcher<typeof action>>;
  error: string | null;
  success: boolean;
}) {
  const { t } = useTranslation();
  const isSubmitting = fetcher.state === "submitting";

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<AddUserInput>({
    resolver: zodResolver(addUserSchema),
    mode: "onBlur",
    defaultValues: { role: "MEMBER" },
  });

  const selectedRole = watch("role");

  function onSubmit(formData: AddUserInput) {
    fetcher.submit({ ...formData, intent: "addUser" }, { method: "post" });
    reset();
  }

  return (
    <form
      className="flex flex-col gap-4 max-w-2xl"
      onSubmit={handleSubmit(onSubmit)}
    >
      {error && <p className="text-sm text-destructive">{t(error)}</p>}
      {success && <p className="text-sm text-green-600">{t("userAdded")}</p>}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="flex flex-col gap-1">
          <label htmlFor="add-firstName" className="text-sm font-medium">
            {t("firstName")} *
          </label>
          <Input
            id="add-firstName"
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
          <label htmlFor="add-lastName" className="text-sm font-medium">
            {t("lastName")} *
          </label>
          <Input
            id="add-lastName"
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
        <label htmlFor="add-email" className="text-sm font-medium">
          {t("email")} *
        </label>
        <Input
          id="add-email"
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
        <label htmlFor="add-password" className="text-sm font-medium">
          {t("password")} *
        </label>
        <Input
          id="add-password"
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
        <label htmlFor="add-role" className="text-sm font-medium">
          {t("role")} *
        </label>
        <Select
          value={selectedRole}
          onValueChange={(val) => setValue("role", val as "ADMIN" | "MEMBER")}
        >
          <SelectTrigger id="add-role" className="w-full bg-white">
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

      <div>
        <Button
          type="submit"
          disabled={isSubmitting}
          className="bg-forest text-cream hover:opacity-80 hover:bg-forest"
        >
          {isSubmitting ? t("saving") : t("addUser")}
        </Button>
      </div>
    </form>
  );
}
