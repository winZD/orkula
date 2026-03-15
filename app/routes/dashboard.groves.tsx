import { Link, useFetcher, data } from "react-router";
import { useTranslation } from "react-i18next";
import { Pencil, Trash2 } from "lucide-react";
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
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "~/components/ui/alert-dialog";

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

export async function action({ request }: Route.ActionArgs) {
  const user = await getSessionUser(request);
  if (!user) throw new Response("Unauthorized", { status: 401 });

  const formData = await request.formData();
  const intent = formData.get("intent");

  if (intent === "deleteGrove") {
    const groveId = formData.get("groveId") as string;

    const grove = await db.grove.findFirst({
      where: { id: groveId, tenantId: user.tenantId },
    });

    if (!grove) {
      return data({ error: "groveNotFound" }, { status: 404 });
    }

    await db.grove.delete({ where: { id: groveId } });

    return data({ success: true });
  }

  return data({ error: "invalidIntent" }, { status: 400 });
}

export default function Groves({ loaderData }: Route.ComponentProps) {
  const { groves } = loaderData;
  const { t } = useTranslation();
  const fetcher = useFetcher<typeof action>();

  const totalArea = groves.reduce((sum, g) => sum + (g.area ?? 0), 0);
  const totalTrees = groves.reduce((sum, g) => sum + (g.treeCount ?? 0), 0);
  const totalHarvests = groves.reduce((sum, g) => sum + g._count.harvests, 0);

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

      {groves.length === 0 ? (
        <p className="text-center text-muted-foreground py-8">{t("noGroves")}</p>
      ) : (
        <>
          {/* Mobile cards */}
          <div className="flex flex-col gap-3 md:hidden">
            {groves.map((grove) => (
              <Card key={grove.id} size="sm" className="bg-cream">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle>{grove.name}</CardTitle>
                      <span className="text-xs text-forest/50">
                        {new Date(grove.createdAt).toLocaleDateString("en-GB").replaceAll("/", ".")}
                      </span>
                    </div>
                    <div className="flex gap-1">
                      <Button variant="outline" size="icon" className="h-8 w-8" asChild>
                        <Link to={`/dashboard/groves/${grove.id}/edit`}>
                          <Pencil className="h-4 w-4" />
                        </Link>
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="outline" size="icon" className="h-8 w-8 text-destructive hover:text-destructive">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>{t("deleteGroveConfirmTitle")}</AlertDialogTitle>
                            <AlertDialogDescription>
                              {t("deleteGroveConfirmDescription")}
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>{t("cancel")}</AlertDialogCancel>
                            <AlertDialogAction
                              variant="destructive"
                              onClick={() => {
                                fetcher.submit(
                                  { intent: "deleteGrove", groveId: grove.id },
                                  { method: "post" },
                                );
                              }}
                            >
                              {t("confirm")}
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                    <span className="text-forest/60">{t("location")}</span>
                    <span>{grove.location ?? "—"}</span>
                    <span className="text-forest/60">{t("areaHa")}</span>
                    <span>{grove.area ?? "—"}</span>
                    <span className="text-forest/60">{t("trees")}</span>
                    <span>{grove.treeCount ?? "—"}</span>
                    <span className="text-forest/60">{t("varieties")}</span>
                    <span>
                      {grove.varieties.length > 0
                        ? grove.varieties
                            .map(
                              (v) =>
                                v.variety.charAt(0) +
                                v.variety.slice(1).toLowerCase(),
                            )
                            .join(", ")
                        : "—"}
                    </span>
                    <span className="text-forest/60">{t("harvestCount")}</span>
                    <span>{grove._count.harvests}</span>
                  </div>
                </CardContent>
              </Card>
            ))}
            <Card size="sm" className="bg-forest/5">
              <CardContent>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm font-medium">
                  <span>{t("total")}</span>
                  <span />
                  <span className="text-forest/60">{t("areaHa")}</span>
                  <span>{totalArea.toFixed(2)}</span>
                  <span className="text-forest/60">{t("trees")}</span>
                  <span>{totalTrees}</span>
                  <span className="text-forest/60">{t("harvestCount")}</span>
                  <span>{totalHarvests}</span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Desktop table */}
          <div className="hidden md:block">
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
                  <TableHead className="w-24" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {groves.map((grove) => (
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
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="outline" size="icon" className="h-8 w-8" asChild>
                          <Link to={`/dashboard/groves/${grove.id}/edit`}>
                            <Pencil className="h-4 w-4" />
                          </Link>
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="outline" size="icon" className="h-8 w-8 text-destructive hover:text-destructive">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>{t("deleteGroveConfirmTitle")}</AlertDialogTitle>
                              <AlertDialogDescription>
                                {t("deleteGroveConfirmDescription")}
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>{t("cancel")}</AlertDialogCancel>
                              <AlertDialogAction
                                variant="destructive"
                                onClick={() => {
                                  fetcher.submit(
                                    { intent: "deleteGrove", groveId: grove.id },
                                    { method: "post" },
                                  );
                                }}
                              >
                                {t("confirm")}
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
              <TableFooter>
                <TableRow>
                  <TableCell colSpan={2} className="font-medium">{t("total")}</TableCell>
                  <TableCell>{totalArea.toFixed(2)}</TableCell>
                  <TableCell>{totalTrees}</TableCell>
                  <TableCell />
                  <TableCell>{totalHarvests}</TableCell>
                  <TableCell colSpan={2} />
                </TableRow>
              </TableFooter>
            </Table>
          </div>
        </>
      )}
    </div>
  );
}
