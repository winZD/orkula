import { Link, useFetcher, data } from "react-router";
import { useTranslation } from "react-i18next";
import { Pencil, Trash2 } from "lucide-react";

const METHOD_T_KEY: Record<string, string> = {
  HAND: "methodHand",
  RAKE: "methodRake",
  MECHANICAL_SHAKER: "methodMechanicalShaker",
  VIBRATOR: "methodVibrator",
  NET: "methodNet",
};
import { db } from "~/db/prisma";
import { getSessionUser } from "~/lib/auth.server";
import type { Route } from "./+types/dashboard.harvests";
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

export async function action({ request }: Route.ActionArgs) {
  const user = await getSessionUser(request);
  if (!user) throw new Response("Unauthorized", { status: 401 });

  const formData = await request.formData();
  const intent = formData.get("intent");

  if (intent === "deleteHarvest") {
    const harvestId = formData.get("harvestId") as string;

    const harvest = await db.harvest.findFirst({
      where: { id: harvestId, tenantId: user.tenantId },
    });

    if (!harvest) {
      return data({ error: "harvestNotFound" }, { status: 404 });
    }

    await db.harvest.delete({ where: { id: harvestId } });

    return data({ success: true });
  }

  return data({ error: "invalidIntent" }, { status: 400 });
}

export default function Harvests({ loaderData }: Route.ComponentProps) {
  const { harvests } = loaderData;
  const { t } = useTranslation();
  const fetcher = useFetcher<typeof action>();

  const totalQuantity = harvests.reduce((sum, h) => sum + h.quantityKg, 0);
  const totalOil = harvests.reduce((sum, h) => sum + (h.oilYieldLt ?? 0), 0);

  return (
    <div className="flex flex-1 flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">{t("harvests")}</h2>
          <p className="text-muted-foreground">{t("harvestsDescription")}</p>
        </div>
        <Button asChild className="bg-forest text-cream hover:opacity-80 hover:bg-forest">
          <Link to="/dashboard/harvests/new">{t("newHarvest")}</Link>
        </Button>
      </div>

      {harvests.length === 0 ? (
        <p className="text-center text-muted-foreground py-8">{t("noHarvests")}</p>
      ) : (
        <>
          {/* Mobile cards */}
          <div className="flex flex-col gap-3 md:hidden">
            {harvests.map((harvest) => (
              <Card key={harvest.id} size="sm" className="bg-cream">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle>{harvest.grove.name}</CardTitle>
                      <span className="text-xs text-forest/50">
                        {new Date(harvest.date).toLocaleDateString("en-GB").replaceAll("/", ".")}
                      </span>
                    </div>
                    <div className="flex gap-1">
                      <Button variant="outline" size="icon" className="h-8 w-8" asChild>
                        <Link to={`/dashboard/harvests/${harvest.id}/edit`}>
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
                            <AlertDialogTitle>{t("deleteHarvestConfirmTitle")}</AlertDialogTitle>
                            <AlertDialogDescription>
                              {t("deleteHarvestConfirmDescription")}
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>{t("cancel")}</AlertDialogCancel>
                            <AlertDialogAction
                              variant="destructive"
                              onClick={() => {
                                fetcher.submit(
                                  { intent: "deleteHarvest", harvestId: harvest.id },
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
                    <span className="text-forest/60">{t("quantityKg")}</span>
                    <span>{harvest.quantityKg}</span>
                    <span className="text-forest/60">{t("oilYieldLt")}</span>
                    <span>{harvest.oilYieldLt ?? "—"}</span>
                    <span className="text-forest/60">{t("oilYieldPct")}</span>
                    <span>
                      {harvest.oilYieldPct != null ? `${harvest.oilYieldPct}%` : "—"}
                    </span>
                    <span className="text-forest/60">{t("method")}</span>
                    <span>{t(METHOD_T_KEY[harvest.method])}</span>
                    {harvest.notes && (
                      <>
                        <span className="text-forest/60">{t("notes")}</span>
                        <span className="truncate">{harvest.notes}</span>
                      </>
                    )}
                    <span className="text-forest/60">{t("recordedBy")}</span>
                    <span>
                      {harvest.recordedBy.firstName} {harvest.recordedBy.lastName}
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))}
            <Card size="sm" className="bg-forest/5">
              <CardContent>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm font-medium">
                  <span>{t("total")}</span>
                  <span />
                  <span className="text-forest/60">{t("quantityKg")}</span>
                  <span>{totalQuantity.toFixed(1)}</span>
                  <span className="text-forest/60">{t("oilYieldLt")}</span>
                  <span>{totalOil.toFixed(1)}</span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Desktop table */}
          <div className="hidden md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("date")}</TableHead>
                  <TableHead>{t("grove")}</TableHead>
                  <TableHead>{t("quantityKg")}</TableHead>
                  <TableHead>{t("oilYieldLt")}</TableHead>
                  <TableHead>{t("oilYieldPct")}</TableHead>
                  <TableHead>{t("method")}</TableHead>
                  <TableHead>{t("notes")}</TableHead>
                  <TableHead>{t("recordedBy")}</TableHead>
                  <TableHead className="w-24" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {harvests.map((harvest) => (
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
                    <TableCell>{t(METHOD_T_KEY[harvest.method])}</TableCell>
                    <TableCell className="max-w-48 truncate">
                      {harvest.notes ?? "—"}
                    </TableCell>
                    <TableCell>
                      {harvest.recordedBy.firstName} {harvest.recordedBy.lastName}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="outline" size="icon" className="h-8 w-8" asChild>
                          <Link to={`/dashboard/harvests/${harvest.id}/edit`}>
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
                              <AlertDialogTitle>{t("deleteHarvestConfirmTitle")}</AlertDialogTitle>
                              <AlertDialogDescription>
                                {t("deleteHarvestConfirmDescription")}
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>{t("cancel")}</AlertDialogCancel>
                              <AlertDialogAction
                                variant="destructive"
                                onClick={() => {
                                  fetcher.submit(
                                    { intent: "deleteHarvest", harvestId: harvest.id },
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
                  <TableCell>{totalQuantity.toFixed(1)}</TableCell>
                  <TableCell>{totalOil.toFixed(1)}</TableCell>
                  <TableCell colSpan={5} />
                </TableRow>
              </TableFooter>
            </Table>
          </div>
        </>
      )}
    </div>
  );
}
