import { useState } from "react";
import { data, redirect, useFetcher, Link } from "react-router";
import { useTranslation } from "react-i18next";
import { Pencil } from "lucide-react";
import { db } from "~/db/prisma";
import { getSessionUser } from "~/lib/auth.server";
import { localeCookie } from "~/cookies";
import type { Route } from "./+types/dashboard.settings";
import { Button } from "~/components/ui/button";
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

  // Language change
  const lng = formData.get("lng");

  if (lng !== "hr" && lng !== "en") {
    return data({ error: "validationInvalidLanguage" }, { status: 400 });
  }

  return data(
    { success: true },
    { headers: { "Set-Cookie": await localeCookie.serialize(lng) } },
  );
}

export default function Settings({ loaderData }: Route.ComponentProps) {
  const { t, i18n } = useTranslation();
  const fetcher = useFetcher<typeof action>();

  const savedLang = loaderData.currentLanguage || i18n.language;
  const [selectedLang, setSelectedLang] = useState(savedLang);
  const hasChanged = selectedLang !== savedLang;

  const roleTranslations: Record<string, string> = {
    OWNER: t("roleOwner"),
    ADMIN: t("roleAdmin"),
    MEMBER: t("roleMember"),
  };

  function handleSave() {
    fetcher.submit({ lng: selectedLang }, { method: "post" });
    i18n.changeLanguage(selectedLang);
  }

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

          <div className="flex items-center justify-between max-w-2xl">
            <div>
              <h3 className="text-xl font-bold">{t("teamMembers")}</h3>
              <p className="text-muted-foreground">{t("teamMembersDescription")}</p>
            </div>
            <Button asChild className="bg-forest text-cream hover:opacity-80 hover:bg-forest">
              <Link to="/dashboard/users/new">{t("addUser")}</Link>
            </Button>
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
                    <TableHead />
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
                      <TableCell>
                        <Button asChild size="icon" className="h-8 w-8 bg-forest text-cream hover:opacity-80 hover:bg-forest">
                          <Link to={`/dashboard/users/${member.id}/edit`}>
                            <Pencil className="h-4 w-4" />
                          </Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <p className="text-sm text-muted-foreground">{t("noTeamMembers")}</p>
            )}
          </div>
        </>
      )}
    </div>
  );
}
