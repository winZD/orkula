import i18next from "i18next";
import { startTransition, StrictMode } from "react";
import { hydrateRoot } from "react-dom/client";
import { I18nextProvider, initReactI18next } from "react-i18next";
import { HydratedRouter } from "react-router/dom";
import I18nextBrowserLanguageDetector from "i18next-browser-languagedetector";
import hr from "./locales/hr";
import en from "./locales/en";

async function main() {
  await i18next
    .use(initReactI18next)
    .use(I18nextBrowserLanguageDetector)
    .init({
      supportedLngs: ["hr", "en"],
      fallbackLng: "hr",
      detection: { order: ["htmlTag"], caches: [] },
      // backend: { loadPath: "/api/locales/{{lng}}/{{ns}}" },--npm i i18next-fetch-backend--
      resources: {
        hr: { translation: hr },
        en: { translation: en },
      },
    });

  startTransition(() => {
    hydrateRoot(
      document,
      <I18nextProvider i18n={i18next}>
        <StrictMode>
          <HydratedRouter />
        </StrictMode>
      </I18nextProvider>,
    );
  });
}

main().catch((error) => console.error(error));
