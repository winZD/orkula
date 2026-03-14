import { useState } from "react";
import { data, redirect, useFetcher } from "react-router";
import { useTranslation } from "react-i18next";
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

const SUPPORTED_LANGUAGES = [
  { code: "hr", label: "Hrvatski" },
  { code: "en", label: "English" },
] as const;

export async function loader({ request }: Route.LoaderArgs) {
  const user = await getSessionUser(request);
  if (!user) throw redirect("/login");

  const cookieHeader = request.headers.get("Cookie");
  const lng = await localeCookie.parse(cookieHeader);

  return { currentLanguage: lng || null };
}

export async function action({ request }: Route.ActionArgs) {
  const user = await getSessionUser(request);
  if (!user) throw redirect("/login");

  const formData = await request.formData();
  const lng = formData.get("lng");

  if (lng !== "hr" && lng !== "en") {
    return data({ error: "Invalid language" }, { status: 400 });
  }

  return data(
    { success: true },
    { headers: { "Set-Cookie": await localeCookie.serialize(lng) } },
  );
}

export default function Settings({ loaderData }: Route.ComponentProps) {
  const { t, i18n } = useTranslation();
  const fetcher = useFetcher();

  const savedLang = loaderData.currentLanguage || i18n.language;
  const [selectedLang, setSelectedLang] = useState(savedLang);
  const hasChanged = selectedLang !== savedLang;

  function handleSave() {
    fetcher.submit({ lng: selectedLang }, { method: "post" });
    i18n.changeLanguage(selectedLang);
  }

  return (
    <div className="flex flex-1 flex-col gap-6">
      <div>
        <h2 className="text-2xl font-bold">{t("settings")}</h2>
        <p className="text-muted-foreground">{t("settingsDescription")}</p>
      </div>

      <div className="flex flex-col gap-4 max-w-2xl *:data-[slot=select-trigger]:bg-white">
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
    </div>
  );
}
