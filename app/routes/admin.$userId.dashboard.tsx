import { useMemo } from "react";
import type { ColDef } from "ag-grid-community";
import { AgGrid } from "~/components/AgGrid";

import { db } from "~/db";

/* import PieChart from "~/components/PieChart";
import BarChart from "~/components/BarChart"; */

import { Prisma } from "@prisma/client";
import type { Route } from "../+types/root";
import { Outlet, useLoaderData } from "react-router";
import FarmStatusCard from "~/components/FarmStatus";

// Loader function to fetch required data
export async function loader({ params, request }: Route.LoaderArgs) {
  const { userId } = params;
  const currentYear = new Date().getFullYear();

  // Fetch overall statistics: total area, tree count, and total harvest quantity
  const [overallStats] = await db.$queryRaw<
    { totalArea: number; treeCount: number; totalQuantity: number }[]
  >(
    Prisma.sql`
      SELECT 
        COALESCE((SELECT SUM(o.area) FROM Orchard o WHERE o.userId = ${userId}), 0) AS totalArea,
        COALESCE((SELECT SUM(o.numberOfTrees) FROM Orchard o WHERE o.userId = ${userId}), 0) AS treeCount,

        COALESCE((SELECT SUM(h.quantity) 
          FROM Harvest h
          INNER JOIN Orchard o ON h.orchardId = o.id AND h.orchardUserId = o.userId 
          WHERE o.userId = ${userId}), 0) AS totalQuantity
    `
  );

  // Group harvest data by orchard
  const groupedHarvestData = await db.harvestTable.groupBy({
    by: ["orchardId", "orchardUserId"],
    where: {
      orchardUserId: userId,

      year: currentYear, //fix this to add year vefore if there is no current year harvest
    },
    _sum: { quantity: true },
    orderBy: { _sum: { quantity: "desc" } },
  });

  // Fetch orchard locations for grouped harvest data
  const orchardLocations = await db.orchardTable.findMany({
    where: {
      userId,
      id: {
        in: groupedHarvestData.map((data) => data.orchardId),
      },
    },
    select: { id: true, location: true, name: true },
  });
  console.log("-----------> ", groupedHarvestData);
  const percentages = groupedHarvestData.map((item) => {
    const orchard = orchardLocations.find((o) => o.id === item.orchardId);
    return {
      id: orchard?.id,
      name: orchard?.name || "Unknown",
      percentage: (
        ((item._sum.quantity || 0) / overallStats.totalQuantity) *
        100
      ).toFixed(2),
    };
  });

  // Yearly harvest production data
  const yearlyProduction = await db.harvestTable.groupBy({
    by: ["year"],
    where: { orchard: { userId } },
    _sum: { quantity: true },
    orderBy: { year: "asc" },
  });

  // Orchard data with tree details
  const orchardData = await db.orchardTable.findMany({
    where: { userId },
  });

  return {
    userId,
    ...overallStats,
    percentages,
    yearlyProduction,
    orchardData,
  };
}

export default function Index() {
  const {
    totalArea,
    treeCount,
    totalQuantity,
    percentages,
    yearlyProduction,
    orchardData,
  } = useLoaderData<typeof loader>();

  // Define column definitions for AgGrid
  const columnDefs = useMemo<ColDef<(typeof orchardData)[0]>[]>(
    () => [
      { field: "name", headerName: "Name" },
      { field: "area", headerName: "Area" },
      { field: "location", headerName: "Location" },
      { field: "soilType", headerName: "Soil Type" },
      { field: "irrigation", headerName: "Irrigation" },
    ],
    []
  );

  return (
    <>
      <FarmStatusCard
        area={totalArea ? totalArea : 0}
        trees={treeCount ? Number(treeCount) : 0}
        production={totalQuantity ? Number(totalQuantity.toFixed(2)) : 0}
      />

      {/* <ClientOnly fallback={<div>Loading...</div>}>
        {() => (
          <div className="flex w-full justify-evenly items-center p-3 ">
            <div>
              <PieChart data={percentages} />
            </div>
            <div>
              <BarChart data={yearlyProduction} />{" "}
            </div>
          </div>
        )}
      </ClientOnly> */}

      <div className="flex flex-col p-5 w-full h-full">
        <AgGrid columnDefs={columnDefs} rowData={orchardData} />
        <Outlet />
      </div>
    </>
  );
}
