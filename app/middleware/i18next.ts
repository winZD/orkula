import { createI18nextMiddleware } from "remix-i18next/middleware";
import hr from "~/locales/hr";
import en from "~/locales/en";
import { localeCookie } from "~/cookies";

export const [i18nextMiddleware, getLocale, getInstance] =
  createI18nextMiddleware({
    detection: {
      supportedLanguages: ["hr", "en"],
      fallbackLanguage: "hr",
      cookie: localeCookie,
    },
    i18next: {
      resources: {
        hr: { translation: hr },
        en: { translation: en },
      },
    },
  });
