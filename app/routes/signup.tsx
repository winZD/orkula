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
import { signupSchema, type SignupInput } from "~/lib/validations";
import { signup, setSessionCookie } from "~/lib/auth.server";
import type { Route } from "./+types/signup";

export function meta() {
  return [{ title: "Sign Up" }];
}

export async function action({ request }: Route.ActionArgs) {
  const formData = await request.formData();
  const raw = Object.fromEntries(formData);
  const parsed = signupSchema.safeParse(raw);

  if (!parsed.success) {
    return data({ error: parsed.error.issues[0].message }, { status: 400 });
  }

  try {
    const { session } = await signup(parsed.data);
    return redirect("/dashboard", {
      headers: { "Set-Cookie": setSessionCookie(session.token) },
    });
  } catch (e: unknown) {
    const message =
      e instanceof Error && e.message.includes("Unique constraint")
        ? "accountExists"
        : "somethingWentWrong";
    return data({ error: message }, { status: 400 });
  }
}

export default function Signup() {
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const isSubmitting = navigation.state === "submitting";
  const { t } = useTranslation();

  const {
    register,
    formState: { errors },
  } = useForm<SignupInput>({
    resolver: zodResolver(signupSchema),
    mode: "onBlur",
  });

  return (
    <div className="flex min-h-screen items-center justify-center">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>{t("signup")}</CardTitle>
          <CardDescription>{t("signupDescription")}</CardDescription>
        </CardHeader>
        <Form method="post">
          <CardContent className="flex flex-col gap-3">
            {actionData?.error && (
              <p className="text-sm text-destructive">{t(actionData.error)}</p>
            )}
            <div className="flex flex-col gap-1">
              <label htmlFor="farmName" className="text-sm font-medium">
                {t("farmName")}
              </label>
              <Input
                id="farmName"
                type="text"
                placeholder="Horvat Olive Farm"
                aria-invalid={!!errors.farmName}
                {...register("farmName")}
              />
              {errors.farmName && (
                <p className="text-xs text-destructive">
                  {errors.farmName.message}
                </p>
              )}
            </div>
            <div className="flex gap-3">
              <div className="flex flex-1 flex-col gap-1">
                <label htmlFor="firstName" className="text-sm font-medium">
                  {t("firstName")}
                </label>
                <Input
                  id="firstName"
                  type="text"
                  placeholder="Ivan"
                  aria-invalid={!!errors.firstName}
                  {...register("firstName")}
                />
                {errors.firstName && (
                  <p className="text-xs text-destructive">
                    {errors.firstName.message}
                  </p>
                )}
              </div>
              <div className="flex flex-1 flex-col gap-1">
                <label htmlFor="lastName" className="text-sm font-medium">
                  {t("lastName")}
                </label>
                <Input
                  id="lastName"
                  type="text"
                  placeholder="Horvat"
                  aria-invalid={!!errors.lastName}
                  {...register("lastName")}
                />
                {errors.lastName && (
                  <p className="text-xs text-destructive">
                    {errors.lastName.message}
                  </p>
                )}
              </div>
            </div>
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
                  {errors.email.message}
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
                  {errors.password.message}
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
              {isSubmitting ? t("creatingAccount") : t("createAccount")}
            </Button>
            <p className="text-center text-sm text-muted-foreground">
              {t("alreadyHaveAccount")}{" "}
              <Link
                to="/login"
                className="text-primary underline-offset-4 hover:underline"
              >
                {t("signIn")}
              </Link>
            </p>
          </CardFooter>
        </Form>
      </Card>
    </div>
  );
}
