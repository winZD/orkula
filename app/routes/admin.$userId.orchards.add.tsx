import { zodResolver } from "@hookform/resolvers/zod";

import { getValidatedFormData, useRemixForm } from "remix-hook-form";
import * as zod from "zod";
import { Modal } from "~/components/Modal";
import { db } from "~/db";
import { v4 as uuidv4 } from "uuid";
import type { Route } from "../+types/root";
import { Form, redirect, useNavigate } from "react-router";

const schema = zod.object({
  name: zod.string().min(1),
  location: zod.string(),
  area: zod.number().positive().min(1),
  soilType: zod.string(),

  irrigation: zod.boolean(),
});

type FormData = zod.infer<typeof schema>;
export async function loader({ params, request }: Route.LoaderArgs) {
  const { userId } = params;

  const varieties = await db.varietyTable.findMany({
    where: { orchardUserId: userId },
  });

  return { varieties };
}
// Action function
export async function action({ request, params }: Route.ActionArgs) {
  /*   const schema = zod.object({
    name: zod.string(),
    location: zod.string(),
    area: zod.number(),
    soilType: zod.string(),

    irrigation: zod.boolean(),
  });
  type FormData = zod.infer<typeof schema>; */
  const { userId } = params;
  const resolver = zodResolver(schema);
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
  if (!userId) {
    return null;
  }

  const id = uuidv4();
  const orchard = await db.orchardTable.create({
    data: {
      /* id, */
      name: data.name,
      location: data.location,
      area: data.area,
      soilType: data.soilType,
      irrigation: data.irrigation,
      userId,
    },
  });

  return redirect(`../${orchard.id}`);
}
export default function Index() {
  /*   const { varieties } = useLoaderData<typeof loader>();
   */ const navigate = useNavigate();

  /* const formMethods = useRemixForm<FormData>({
    mode: "onSubmit",
    // resolver,
    defaultValues: {
      name: "",
      location: "",
      area: "",
      soilType: "",

      irrigation: false,
    },
  }); */
  const {
    handleSubmit,
    formState: { errors },
    register,
  } = useRemixForm<FormData>({
    mode: "onSubmit",
    defaultValues: {
      name: "",
      location: "",
      area: 0,
      soilType: "",
      irrigation: false,
    },
  });
  return (
    <Modal title={"Add orchard"}>
      <Form
        method="POST"
        className="flex flex-col gap-4 p-6 shadow border justify-center items-center bg-slate-100"
        onSubmit={handleSubmit}
      >
        {" "}
        {/*    <span className="font-bold text-4xl">OLIO</span> */}
        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-3 border p-2">
          <div className="flex flex-col gap-2">
            <label htmlFor="location">Name</label>
            <input id="name" className="rounded" {...register("name")} />
          </div>
          <div className="flex flex-col gap-2">
            <label htmlFor="location">Location</label>
            <input
              id="location"
              className="rounded"
              {...register("location")}
            />
          </div>
          <div className="flex flex-col gap-2">
            <label htmlFor="area">Area</label>
            <input
              id="area"
              type="number"
              className="rounded"
              {...register("area", { valueAsNumber: true })}
            />
          </div>
          <div className="flex flex-col gap-2">
            <label htmlFor="soilType">Soil type</label>
            <input
              id="soilType"
              className="rounded"
              {...register("soilType")}
            />
          </div>

          {/*  <div className="flex flex-col gap-2">
            <label htmlFor="tree">Trees</label>
            <input id="tree" className="rounded" {...register("tree")} />
          </div> */}
          {/*  <div className="flex flex-col gap-2">
            <label className="flex-1" htmlFor="variety">
              Variety
            </label>
            <select id={"variety"} className="flex-1 rounded border-slate-200">
              {varieties.map((option) => (
                <option key={option.id} value={option.name}>
                  {option.name}
                </option>
              ))}
            </select>
          </div> */}

          <div className="gap-2">
            <label htmlFor="irrigation">Irrigation</label>
            <input
              id="irrigation"
              type="checkbox"
              className="rounded"
              {...register("irrigation")}
            />
          </div>
        </div>
        <div>
          <button
            type="submit"
            className=" bg-lime-700 text-white hover:bg-lime-800  font-bold py-2 px-4 rounded"
          >
            Add
          </button>{" "}
          <button
            type="button"
            className="bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 rounded"
            onClick={() => navigate("..")}
          >
            Cancel
          </button>
        </div>{" "}
      </Form>
    </Modal>
  );
}
