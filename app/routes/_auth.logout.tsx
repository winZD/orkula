import { parse } from "cookie";
import { createHeaderCookies, verifyToken } from "~/auth";
import { db } from "~/db";
import type { Route } from "../+types/root";
import { redirect } from "react-router";

export async function loader({ params, request }: Route.LoaderArgs) {
  const cookies = parse(request.headers.get("Cookie") ?? "");

  const at = verifyToken(cookies["at"]);
  if (at?.tokenId) {
    const refreshToken = await db.refreshTokenTable.findUnique({
      where: { id: at.tokenId },
    });
    if (refreshToken) {
      await db.refreshTokenTable.updateMany({
        where: { familyId: refreshToken?.familyId },
        data: { status: "REVOKED" },
      });
    }
  }
  const headers = createHeaderCookies("", "");

  return redirect("/login", { headers });
}
