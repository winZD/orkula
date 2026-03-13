import { Link } from "react-router";
import { useTranslation } from "react-i18next";
import { db } from "~/db/prisma";
import { getSessionUser } from "~/lib/auth.server";
import type { Route } from "./+types/dashboard.groves";
import { Button } from "~/components/ui/button";
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
  const { t } = useTranslation();

  return (
    <div className="flex flex-1 flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">{t("groves")}</h2>
          <p className="text-muted-foreground">{t("grovesDescription")}</p>
        </div>
        <Button asChild className="bg-forest text-cream hover:opacity-80 hover:bg-forest">
          <Link to="/dashboard/groves/new">{t("newGrove")}</Link>
        </Button>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t("name")}</TableHead>
            <TableHead>{t("location")}</TableHead>
            <TableHead>{t("areaHa")}</TableHead>
            <TableHead>{t("trees")}</TableHead>
            <TableHead>{t("varieties")}</TableHead>
            <TableHead>{t("harvestCount")}</TableHead>
            <TableHead>{t("createdAt")}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {groves.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={7}
                className="text-center text-muted-foreground"
              >
                {t("noGroves")}
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
              <TableCell colSpan={2} className="font-medium">{t("total")}</TableCell>
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
