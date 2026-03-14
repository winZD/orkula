import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  data,
  Form,
  Link,
  redirect,
  useActionData,
  useNavigation,
} from "react-router";
import { useTranslation } from "react-i18next";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { loginSchema, type LoginInput } from "~/lib/validations";
import { login, getSessionUser, setSessionCookie } from "~/lib/auth.server";
import type { Route } from "./+types/login";

export function meta() {
  return [{ title: "Login" }];
}

export async function loader({ request }: Route.LoaderArgs) {
  const user = await getSessionUser(request);
  if (user) throw redirect("/dashboard");
  return null;
}

export async function action({ request }: Route.ActionArgs) {
  const formData = await request.formData();
  const raw = Object.fromEntries(formData);
  const parsed = loginSchema.safeParse(raw);

  if (!parsed.success) {
    return data({ error: parsed.error.issues[0].message }, { status: 400 });
  }

  const result = await login(parsed.data.email, parsed.data.password);
  if (!result) {
    return data({ error: "invalidCredentials" }, { status: 401 });
  }

  return redirect("/dashboard", {
    headers: { "Set-Cookie": setSessionCookie(result.session.token) },
  });
}

export default function Login() {
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const isSubmitting = navigation.state === "submitting";
  const { t } = useTranslation();

  const {
    register,
    formState: { errors },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    mode: "onBlur",
    defaultValues: {
      email: "owner@orkula.dev",
      password: "password123",
    },
  });

  return (
    <div className="flex min-h-screen items-center justify-center">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>{t("login")}</CardTitle>
          <CardDescription>{t("loginDescription")}</CardDescription>
        </CardHeader>
        <Form method="post">
          <CardContent className="flex flex-col gap-3">
            {actionData?.error && (
              <p className="text-sm text-destructive">{t(actionData.error)}</p>
            )}
            <div className="flex flex-col gap-1">
              <label htmlFor="email" className="text-sm font-medium">
                {t("email")}
              </label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                aria-invalid={!!errors.email}
                {...register("email")}
              />
              {errors.email && (
                <p className="text-xs text-destructive">
                  {t(errors.email.message!)}
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
                placeholder="••••••••"
                aria-invalid={!!errors.password}
                {...register("password")}
              />
              {errors.password && (
                <p className="text-xs text-destructive">
                  {t(errors.password.message!)}
                </p>
              )}
            </div>
          </CardContent>
          <CardFooter className="flex flex-col gap-3 mt-5">
            <Button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-forest text-cream hover:opacity-80 hover:bg-forest"
              size="lg"
            >
              {isSubmitting ? t("signingIn") : t("signIn")}
            </Button>
            <p className="text-center text-sm text-muted-foreground">
              {t("noAccount")}{" "}
              <Link
                to="/signup"
                className="text-primary underline-offset-4 hover:underline"
              >
                {t("signUp")}
              </Link>
            </p>
          </CardFooter>
        </Form>
      </Card>
    </div>
  );
}
