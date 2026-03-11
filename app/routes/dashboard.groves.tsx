import { db } from "~/db/prisma";
import { getSessionUser } from "~/lib/auth.server";
import type { Route } from "./+types/dashboard.groves";
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
  return [{ title: "Groves" }];
}

export async function loader({ request }: Route.LoaderArgs) {
  const user = await getSessionUser(request);
  if (!user) throw new Response("Unauthorized", { status: 401 });

  const groves = await db.grove.findMany({
    where: { tenantId: user.tenantId },
    include: {
      varieties: true,
      _count: { select: { harvests: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return { groves };
}

export default function Groves({ loaderData }: Route.ComponentProps) {
  const { groves } = loaderData;

  return (
    <div className="flex flex-1 flex-col gap-4">
      <h2 className="text-2xl font-bold">Groves</h2>
      <p className="text-muted-foreground">Manage your olive groves.</p>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Location</TableHead>
            <TableHead>Area (ha)</TableHead>
            <TableHead>Trees</TableHead>
            <TableHead>Varieties</TableHead>
            <TableHead>Harvests</TableHead>
            <TableHead>Created</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {groves.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={7}
                className="text-center text-muted-foreground"
              >
                No groves found.
              </TableCell>
            </TableRow>
          ) : (
            groves.map((grove) => (
              <TableRow key={grove.id}>
                <TableCell className="font-medium">{grove.name}</TableCell>
                <TableCell>{grove.location ?? "—"}</TableCell>
                <TableCell>{grove.area ?? "—"}</TableCell>
                <TableCell>{grove.treeCount ?? "—"}</TableCell>
                <TableCell>
                  {grove.varieties.length > 0
                    ? grove.varieties
                        .map(
                          (v) =>
                            v.variety.charAt(0) +
                            v.variety.slice(1).toLowerCase(),
                        )
                        .join(", ")
                    : "—"}
                </TableCell>
                <TableCell>{grove._count.harvests}</TableCell>
                <TableCell>
                  {new Date(grove.createdAt).toLocaleDateString("en-GB").replaceAll("/", ".")}
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
        {groves.length > 0 && (
          <TableFooter>
            <TableRow>
              <TableCell colSpan={2} className="font-medium">Total</TableCell>
              <TableCell>{groves.reduce((sum, g) => sum + (g.area ?? 0), 0).toFixed(2)}</TableCell>
              <TableCell>{groves.reduce((sum, g) => sum + (g.treeCount ?? 0), 0)}</TableCell>
              <TableCell />
              <TableCell>{groves.reduce((sum, g) => sum + g._count.harvests, 0)}</TableCell>
              <TableCell />
            </TableRow>
          </TableFooter>
        )}
      </Table>
    </div>
  );
}
