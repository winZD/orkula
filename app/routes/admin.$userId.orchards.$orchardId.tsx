import { zodResolver } from "@hookform/resolvers/zod";

import { getValidatedFormData, useRemixForm } from "remix-hook-form";
import { useFieldArray } from "react-hook-form";
import * as zod from "zod";
import { Modal } from "~/components/Modal";
import { db } from "~/db";
import { v4 as uuidv4 } from "uuid";
import type { Route } from "../+types/root";
import {
  Form,
  redirect,
  useLoaderData,
  useNavigate,
  useParams,
} from "react-router";

// Schema definition
const orchardSchema = zod.object({
  name: zod.string().min(1),
  location: zod.string(),
  area: zod.string(),
  soilType: zod.string(),
  varieties: zod.array(
    zod.object({
      id: zod.string(),
      orchardId: zod.string(),
      name: zod.string().min(1),
      treeNumber: zod.string().min(1),
    })
  ),
  irrigation: zod.boolean(),
});

type FormData = zod.infer<typeof orchardSchema>;

// Loader function
export async function loader({ params, request }: Route.LoaderArgs) {
  const { userId, orchardId } = params;
  console.log(params);
  const orchard = await db.orchardTable.findFirst({
    where: { userId, id: orchardId },
    include: { varieties: true },
  });
  console.log("----------------------> ", orchard);
  return { orchard };
}

// Action function
export async function action({ request, params }: Route.ActionArgs) {
  const { userId, orchardId } = params;
  const resolver = zodResolver(orchardSchema);
  const {
    errors,
    data,
    receivedValues: defaultValues,
  } = await getValidatedFormData<FormData>(request, resolver);

  if (errors) {
    console.error(errors);
    return { errors, defaultValues };
  }

  if (!data) return null;

  const treesPerOrchardCount = data?.varieties.reduce(
    (accumulator, currentValue) =>
      accumulator + Number(currentValue.treeNumber),
    0
  );

  await db.$transaction(async (tx) => {
    await tx.orchardTable.update({
      where: {
        id_userId: { id: orchardId as string, userId: params.userId as string },
      },
      data: {
        name: data.name,
        location: data.location,
        area: Number(data.area),
        soilType: data.soilType,
        irrigation: data.irrigation,
        numberOfTrees: treesPerOrchardCount,
      },
    });
    await tx.varietyTable.deleteMany({
      where: {
        orchardId: orchardId as string,
        id: { notIn: data.varieties.map((e) => e.id) },
      },
    });
    await Promise.all(
      data.varieties.map((variety) =>
        tx.varietyTable.upsert({
          where: { id: variety.id },
          update: {
            name: variety.name,
            treeNumber: Number(variety.treeNumber),
          },
          create: {
            ...variety,
            treeNumber: Number(variety.treeNumber),
            orchardId: orchardId as string,
            orchardUserId: userId as string,
          },
        })
      )
    );
  });

  return redirect(`..`);
}

// Component for Orchard Form
export default function OrchardForm() {
  const params = useParams();

  const { orchard } = useLoaderData<typeof loader>();
  const navigate = useNavigate();

  const {
    handleSubmit,
    formState: { errors },
    register,
    control,
  } = useRemixForm<FormData>({
    mode: "onSubmit",
    resolver: zodResolver(orchardSchema),
    defaultValues: {
      name: orchard?.name || "",
      location: orchard?.location || "",
      area: orchard?.area.toString() || "",
      soilType: orchard?.soilType || "",
      irrigation: orchard?.irrigation || false,
      varieties: orchard?.varieties?.map((variety) => ({
        ...variety,
        treeNumber: variety.treeNumber.toString(), // Ensure it's a string
      })),
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "varieties",
  });

  return (
    <Modal title="Add Orchard">
      <Form
        method="PUT"
        className="flex flex-col gap-4 rounded border p-6 shadow justify-center items-center bg-slate-100"
        onSubmit={handleSubmit}
      >
        <button
          type="button"
          className="bg-green-500 text-white px-4 rounded self-end"
          onClick={() =>
            append({
              id: uuidv4(),
              orchardId: params.orchardId as string,
              name: "",
              treeNumber: "",
            })
          }
        >
          Add Variety
        </button>
        <div className="flex gap-4">
          <div className="grid md:grid-cols-1 xl:grid-cols-2 gap-3 border p-2">
            <div className="flex flex-col gap-2">
              <label htmlFor="name">Name</label>
              <input id="name" className="rounded" {...register("name")} />
              {errors.name && (
                <span className="text-red-500">{errors.name.message}</span>
              )}
            </div>

            <div className="flex flex-col gap-2">
              <label htmlFor="location">Location</label>
              <input
                id="location"
                className="rounded"
                {...register("location")}
              />
              {errors.location && (
                <span className="text-red-500">{errors.location.message}</span>
              )}
            </div>

            <div className="flex flex-col gap-2">
              <label htmlFor="area">Area</label>
              <input id="area" className="rounded" {...register("area")} />
              {errors.area && (
                <span className="text-red-500">{errors.area.message}</span>
              )}
            </div>

            <div className="flex flex-col gap-2">
              <label htmlFor="soilType">Soil Type</label>
              <input
                id="soilType"
                className="rounded"
                {...register("soilType")}
              />
              {errors.soilType && (
                <span className="text-red-500">{errors.soilType.message}</span>
              )}
            </div>

            <div className="flex flex-col gap-2">
              <label htmlFor="irrigation">Irrigation</label>
              <input
                id="irrigation"
                type="checkbox"
                className="rounded"
                {...register("irrigation")}
              />
            </div>
          </div>

          <div className="flex flex-col gap-2 border">
            {fields.map((field, index) => (
              <div key={field.id} className="flex gap-2 justify-evenly">
                <span>{`${index + 1 + "."}`}</span>
                <input
                  className="rounded"
                  placeholder="Variety Name"
                  {...register(`varieties.${index}.name`)}
                />
                <input
                  className="rounded"
                  placeholder="Variety number"
                  {...register(`varieties.${index}.treeNumber`)}
                />
                <button
                  type="button"
                  className="bg-red-500 text-white px-2 rounded"
                  onClick={() => remove(index)}
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="flex gap-2">
          <button
            type="submit"
            className="bg-lime-700 text-white hover:bg-lime-800 font-bold py-2 px-4 rounded"
          >
            Add
          </button>
          <button
            type="button"
            className="bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 rounded"
            onClick={() => navigate("..")}
          >
            Cancel
          </button>
        </div>
      </Form>
    </Modal>
  );
}
