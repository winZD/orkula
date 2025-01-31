import type { ColDef } from "ag-grid-community";
import { useMemo } from "react";
import { db } from "~/db";

import { AgGrid } from "~/components/AgGrid";
import type { Route } from "../+types/root";
import { Outlet, useLoaderData, useNavigate, useSubmit } from "react-router";

export async function loader({ params, request }: Route.LoaderArgs) {
  const { userId } = params;

  // Orchard data with tree details
  /*   const orchardData = await db.orchardTable.findMany({
    where: { userId },
    include: { trees: true },
  }); */
  const orchards = await db.orchardTable.findMany({
    where: { userId },
    include: {
      varieties: {
        select: {
          name: true,
        },
      },
    },
  });

  const orchardData = orchards.map((orchard) => ({
    id: orchard.id,
    name: orchard.name,
    area: orchard.area,
    location: orchard.location,
    soilType: orchard.soilType,
    irrigation: orchard.irrigation,
    numberOfTrees: orchard.numberOfTrees,

    varieties: orchard.varieties.length,
    varietyNames: orchard.varieties.map((v) => v.name).join(", "),
  }));
  return { orchardData };
}

export async function action({ request, params }: Route.ActionArgs) {
  const formData = await request.formData();

  const userId = params.userId as string;

  const id = formData.get("id") as string;
  await db.$transaction(async (tx) => {
    await tx.varietyTable.deleteMany({
      where: { orchardId: id, orchardUserId: userId },
    });

    await tx.orchardTable.delete({
      where: { id_userId: { id: id, userId } },
    });
  });

  return {};
}

export default function Index() {
  const navigate = useNavigate();
  const submit = useSubmit();
  // Define column definitions for AgGrid
  const { orchardData } = useLoaderData<typeof loader>();
  const colDefs = useMemo<ColDef<(typeof orchardData)[0]>[]>(
    () => [
      { field: "name", headerName: "Name" },
      { field: "area", headerName: "Area" },
      { field: "location", headerName: "Location" },
      { field: "soilType", headerName: "Soil Type" },
      { field: "numberOfTrees", headerName: "Trees" },
      { field: "varieties", headerName: "Varieties" },
      {
        field: "varietyNames",
        headerName: "Variety names",
        tooltipField: "varietyNames",
      },
      { field: "irrigation", headerName: "Irrigation" },
      {
        headerName: "Actions",
        cellRenderer: (params: { data: (typeof orchardData)[0] }) => (
          <div className="flex h-full flex-row items-center gap-1">
            {" "}
            <button
              className="bg-lime-700 text-white rounded hover:bg-lime-800 py-1 px-2 text-sm"
              onClick={() => navigate(params.data.id)}
            >
              EDIT
            </button>
            <button
              className="bg-red-700 text-white rounded hover:bg-red-800s py-1 px-2 text-sm"
              onClick={() =>
                submit(
                  {
                    id: params.data.id,
                  },
                  { method: "DELETE" }
                )
              }
            >
              Delete
            </button>
          </div>
        ),
      },
    ],
    []
  );
  return (
    <div className="flex flex-col p-5 w-full h-full">
      <div className="flex w-full justify-end my-3">
        <button
          className="rounded-md bg-lime-700 text-white hover:bg-lime-800 py-2 px-4"
          onClick={() => navigate("add")}
        >
          Add
        </button>
      </div>{" "}
      <AgGrid columnDefs={colDefs} rowData={orchardData} />
      <Outlet />
    </div>
  );
}
