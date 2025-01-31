import { zodResolver } from "@hookform/resolvers/zod";

import { getValidatedFormData, useRemixForm } from "remix-hook-form";
import * as zod from "zod";
import { Modal } from "~/components/Modal";
import { db } from "~/db";
/* import DatePicker from "react-datepicker"; */
import { Controller } from "react-hook-form";
/* import "react-datepicker/dist/react-datepicker.css"; */
import type { Route } from "../+types/root";
import { Form, redirect, useLoaderData, useNavigate } from "react-router";

const schema = zod.object({
  year: zod.date(),
  quantity: zod.number().positive().min(1),
  quality: zod.string().min(1),
  orchardId: zod.string(),
});

type FormData = zod.infer<typeof schema>;

export async function loader({ params }: Route.LoaderArgs) {
  const { userId, harvestId } = params;

  const varieties = await db.varietyTable.findMany({
    where: { orchardUserId: userId },
  });
  const orchards = await db.orchardTable.findMany({
    where: { userId },
  });
  const harvest = await db.harvestTable.findUnique({
    where: { id: harvestId },
  });

  return { varieties, orchards, harvest };
}
export async function action({ request, params }: Route.ActionArgs) {
  const { userId, harvestId } = params;
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

  const harvest = await db.harvestTable.create({
    data: {
      year: data.year.getFullYear(),
      quantity: data.quantity,
      quality: data.quality,
      orchardId: "00b41706-d994-4d7a-aaa7-7b19f18fb8f4",
      treeId: "",
      orchardUserId: userId,
    },
  });

  return redirect(`..`);
}
export default function Index() {
  const { orchards, harvest } = useLoaderData<typeof loader>();
  const navigate = useNavigate();

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
    control,
  } = useRemixForm<FormData>({
    mode: "onSubmit",
    defaultValues: {
      year: harvest
        ? new Date(harvest.year, 0, 1) // Ensure the date is constructed correctly
        : undefined,
      quality: harvest?.quality || undefined,
      quantity: harvest?.quantity || undefined,
    },
  });
  return (
    <Modal title={"Edit harvest"}>
      <Form
        method="POST"
        className="flex flex-col gap-4 p-6 shadow border justify-center items-center bg-slate-100"
        onSubmit={handleSubmit}
      >
        {" "}
        {/*    <span className="font-bold text-4xl">OLIO</span> */}
        <div className="flex flex-col gap-3 border p-2">
          <div className="flex flex-col gap-2">
            <label htmlFor="location">Year</label>
            {/* <Controller
              control={control}
              name="year"
              render={({ field: { onChange, onBlur, value, ref } }) => (
                <DatePicker
                  id="year"
                  ref={ref}
                  onChange={onChange} // send value to hook form
                  onBlur={onBlur} // notify when input is touched/blur
                  selected={value as Date}
                  showYearPicker // Only show years
                  dateFormat="yyyy"
                />
              )}
            /> */}
          </div>
          <div className="flex flex-col gap-2">
            <label htmlFor="orchard">Orchard</label>

            <select className="rounded" {...register("orchardId")}>
              <option value="">Select an orchard...</option>
              {orchards.map((orchard) => (
                <option key={orchard.id} value={orchard.id}>
                  {orchard.name}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-2">
            <label htmlFor="location">Quality</label>
            <input id="location" className="rounded" {...register("quality")} />
          </div>
          <div className="flex flex-col gap-2">
            <label htmlFor="area">Quantity</label>
            <input
              id="area"
              type="number"
              className="rounded"
              {...register("quantity", { valueAsNumber: true })}
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
