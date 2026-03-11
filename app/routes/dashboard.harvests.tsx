import { db } from "~/db/prisma";
import { getSessionUser } from "~/lib/auth.server";
import type { Route } from "./+types/dashboard.harvests";
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";

export function meta() {
  return [{ title: "Harvests" }];
}

export async function loader({ request }: Route.LoaderArgs) {
  const user = await getSessionUser(request);
  if (!user) throw new Response("Unauthorized", { status: 401 });

  const harvests = await db.harvest.findMany({
    where: { tenantId: user.tenantId },
    include: {
      grove: { select: { name: true } },
      recordedBy: { select: { firstName: true, lastName: true } },
    },
    orderBy: { date: "desc" },
  });

  return { harvests };
}

function formatMethod(method: string) {
  return method
    .split("_")
    .map((w) => w.charAt(0) + w.slice(1).toLowerCase())
    .join(" ");
}

export default function Harvests({ loaderData }: Route.ComponentProps) {
  const { harvests } = loaderData;

  return (
    <div className="flex flex-1 flex-col gap-4">
      <h2 className="text-2xl font-bold">Harvests</h2>
      <p className="text-muted-foreground">Track your harvest records.</p>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Date</TableHead>
            <TableHead>Grove</TableHead>
            <TableHead>Quantity (kg)</TableHead>
            <TableHead>Oil Yield (L)</TableHead>
            <TableHead>Oil Yield (%)</TableHead>
            <TableHead>Method</TableHead>
            <TableHead>Notes</TableHead>
            <TableHead>Recorded By</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {harvests.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={8}
                className="text-center text-muted-foreground"
              >
                No harvests found.
              </TableCell>
            </TableRow>
          ) : (
            harvests.map((harvest) => (
              <TableRow key={harvest.id}>
                <TableCell className="font-medium">
                  {new Date(harvest.date).toLocaleDateString("en-GB").replaceAll("/", ".")}
                </TableCell>
                <TableCell>{harvest.grove.name}</TableCell>
                <TableCell>{harvest.quantityKg}</TableCell>
                <TableCell>{harvest.oilYieldLt ?? "—"}</TableCell>
                <TableCell>
                  {harvest.oilYieldPct != null
                    ? `${harvest.oilYieldPct}%`
                    : "—"}
                </TableCell>
                <TableCell>{formatMethod(harvest.method)}</TableCell>
                <TableCell className="max-w-48 truncate">
                  {harvest.notes ?? "—"}
                </TableCell>
                <TableCell>
                  {harvest.recordedBy.firstName} {harvest.recordedBy.lastName}
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
        {harvests.length > 0 && (
          <TableFooter>
            <TableRow>
              <TableCell colSpan={2} className="font-medium">Total</TableCell>
              <TableCell>{harvests.reduce((sum, h) => sum + h.quantityKg, 0).toFixed(1)}</TableCell>
              <TableCell>{harvests.reduce((sum, h) => sum + (h.oilYieldLt ?? 0), 0).toFixed(1)}</TableCell>
              <TableCell colSpan={4} />
            </TableRow>
          </TableFooter>
        )}
      </Table>
    </div>
  );
}
