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
  year: zod.coerce.date(),
  quantity: zod.number().positive().min(1),
  quality: zod.string().min(1),
  orchardId: zod.string(),
});

type FormData = zod.infer<typeof schema>;

export async function loader({ params, request }: Route.LoaderArgs) {
  const { userId } = params;

  const varieties = await db.varietyTable.findMany({
    where: { orchardUserId: userId },
  });
  const orchards = await db.orchardTable.findMany({
    where: { userId },
  });

  return { varieties, orchards };
}
export async function action({ request, params }: Route.ActionArgs) {
  const { userId } = params;
  const resolver = zodResolver(schema);

  const {
    errors,
    data,
    receivedValues: defaultValues,
  } = await getValidatedFormData<FormData>(request, resolver);

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
      orchardId: data.orchardId,
      treeId: "0008f2f4-0bf6-4e98-96e5-d33fa9d6ffa7",
      orchardUserId: userId,
    },
  });

  return redirect(`..`);
}
export default function Index() {
  const { orchards } = useLoaderData<typeof loader>();
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
      year: new Date(),
      quality: undefined,
      quantity: undefined,
    },
  });
  return (
    <Modal title={"Add harvest"}>
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
            {/*  <Controller
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
