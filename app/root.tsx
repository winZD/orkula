import React from "react";
import {
  isRouteErrorResponse,
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
} from "react-router";
import { useTranslation } from "react-i18next";
import type { Route } from "./+types/root";
import {
  getLocale,
  i18nextMiddleware,
} from "./middleware/i18next";
import { startSessionCleanup } from "./lib/cleanup.server";
import "./app.css";

export const middleware = [i18nextMiddleware];

export const links: Route.LinksFunction = () => [];

export async function loader({ context }: Route.LoaderArgs) {
  startSessionCleanup();
  const locale = getLocale(context);
  return { locale };
}

export function Layout({ children }: { children: React.ReactNode }) {
  const { i18n } = useTranslation();

  return (
    <html lang={i18n.language} dir={i18n.dir(i18n.language)}>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="theme-color" content="#2d5a27" />
        <Meta />
        <Links />
      </head>
      <body>
        <div className="app-frame">{children}</div>
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

export default function App({ loaderData }: Route.ComponentProps) {
  const { i18n } = useTranslation();

  React.useEffect(() => {
    if (i18n.language !== loaderData.locale) {
      i18n.changeLanguage(loaderData.locale);
    }
  }, [loaderData.locale, i18n]);

  return <Outlet />;
}

export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
  const { t } = useTranslation();
  let message = t("errorOops");
  let details = t("errorUnexpected");
  let stack: string | undefined;

  if (isRouteErrorResponse(error)) {
    message = error.status === 404 ? t("error404") : t("errorGeneric");
    details =
      error.status === 404
        ? t("errorNotFound")
        : error.statusText || details;
  } else if (import.meta.env.DEV && error && error instanceof Error) {
    details = error.message;
    stack = error.stack;
  }

  return (
    <main className="pt-16 p-4 container mx-auto">
      <h1>{message}</h1>
      <p>{details}</p>
      {stack && (
        <pre className="w-full p-4 overflow-x-auto">
          <code>{stack}</code>
        </pre>
      )}
    </main>
  );
}
