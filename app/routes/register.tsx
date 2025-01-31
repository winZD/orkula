import * as zod from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

import { getValidatedFormData, useRemixForm } from "remix-hook-form";
import { hashPassword } from "~/auth";
import { db } from "~/db";
import type { Route } from "../+types/root";
import { Form, redirect } from "react-router";

/* import { parse } from "cookie"; */

const schema = zod.object({
  name: zod.string().min(1),
  email: zod.string().min(1),
  password: zod.string().min(1),
  confirmPassword: zod.string().min(1),
});
type FormData = zod.infer<typeof schema>;

const resolver = zodResolver(schema);
export async function action({ request, params }: Route.ActionArgs) {
  const schema = zod.object({
    name: zod.string().min(1),
    email: zod.string().min(1),
    password: zod.string().min(1),
    confirmPassword: zod.string().min(1),
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
  const password = await hashPassword(data.password);
  await db.userTable.create({
    data: { name: data.name, email: data.email, password },
  });
  return redirect(`/login`);
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
      <Form
        method="POST"
        className="flex flex-col gap-4 rounded border p-6 shadow bg-lime-700 text-white justify-center items-center"
        onSubmit={handleSubmit}
      >
        <span className="font-bold text-4xl">OLIO</span>
        <label htmlFor="email">Ime</label>
        <input
          className="rounded border-slate-200 outline-none text-black"
          type="text"
          {...register("name")}
        />
        <label htmlFor="email">Email</label>
        <input
          className="rounded border-slate-200 outline-none text-black"
          type="text"
          {...register("email")}
        />
        {/* SERVER MSG ERROR VALIDATION  {actionData?.errors.email && (
          <p className="text-red-600">{actionData.email?.message}</p>
        )} */}
        {errors.email && <p className="text-red-600">{errors.email.message}</p>}
        <label htmlFor="password">Lozinka</label>
        <input
          className="rounded border-slate-200 outline-none text-black"
          id="password"
          type="password"
          {...register("password")}
        />
        {errors.password && (
          <p className="text-red-600">{errors.password.message}</p>
        )}
        <label htmlFor="confirmPassword">Potvrdi lozinku</label>
        <input
          className="rounded border-slate-200 outline-none text-black"
          id="confirmPassword"
          type="password"
          {...register("confirmPassword")}
        />
        {errors.confirmPassword && (
          <p className="text-red-600">{errors.confirmPassword.message}</p>
        )}
        <div>
          <button
            type="submit"
            className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
          >
            Registriraj se
          </button>{" "}
        </div>{" "}
      </Form>
    </div>
  );
}
