import * as zod from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { getValidatedFormData, useRemixForm } from "remix-hook-form";
import { createHeaderCookies, createNewTokens } from "~/auth";
import bcrypt from "bcryptjs";
import type { Route } from "../+types/root";
import { db } from "~/db";
import { Form, redirect } from "react-router";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Button } from "~/components/ui/button";

const schema = zod.object({
  email: zod.string().min(1),
  password: zod.string().min(1),
});
type FormData = zod.infer<typeof schema>;

const resolver = zodResolver(schema);
export async function action({ request }: Route.ActionArgs) {
  const schema = zod.object({
    email: zod.string().min(1),
    password: zod.string().min(1),
  });
  type FormData = zod.infer<typeof schema>;

  const {
    errors,
    data,
    receivedValues: defaultValues,
  } = await getValidatedFormData<FormData>(request, resolver);
  console.log(data);
  if (errors) {
    // The keys "errors" and "defaultValues" are picked up automatically by useRemixForm
    console.log(errors);
    return { errors, defaultValues };
  }

  if (!data) {
    return null;
  }

  const user = await db.userTable.findUnique({
    where: {
      email: data.email,
    },
  });

  /*   console.log(user); */
  if (!user) {
    return null;
  }
  const { accessToken, refreshToken } = await createNewTokens(
    user?.id as string
  );

  const isValid = await bcrypt.compare(data.password, user.password);
  if (!isValid) {
    console.log("Invalid credentials");
    return { status: 401, message: "Invalid credentials" };
  }

  const headers = createHeaderCookies(accessToken, refreshToken);
  return redirect(`/admin/${user?.id}/dashboard`, { headers });
}
export default function Index() {
  /* const actionData = useActionData<typeof action>();  */
  const resolver = zodResolver(schema);
  const {
    handleSubmit,
    formState: { errors },
    register,
  } = useRemixForm<FormData>({
    mode: "onSubmit",
    resolver,
  });

  return (
    <div className="flex h-screen w-full items-center justify-center">
      <Card className="bg-lime-700 ">
        <Form method="POST" onSubmit={handleSubmit}>
          <CardHeader>
            <CardTitle>Orkula</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4 ">
            <div className="grid w-full max-w-sm items-center gap-1.5">
              <Label htmlFor="email">E-mail</Label>
              <Input id="email" type="email" {...register("email")} />
              {errors.email && (
                <p className="text-red-600">{errors.email.message}</p>
              )}
            </div>
            <div className="grid w-full max-w-sm items-center gap-1.5">
              <Label htmlFor="email">Password</Label>
              <Input id="password" type="password" {...register("password")} />
              {errors.password && (
                <p className="text-red-600">{errors.password.message}</p>
              )}
            </div>
          </CardContent>

          <CardFooter className="flex flex-col gap-4 justify-center">
            <div className="flex gap-4">
              <Button type="submit" variant={"secondary"}>
                Log In
              </Button>
              <Button type="button" variant={"default"}>
                Register
              </Button>
            </div>

            <span> Change password</span>
          </CardFooter>
        </Form>
      </Card>
    </div>
  );
}
