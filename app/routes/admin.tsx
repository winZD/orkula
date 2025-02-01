import { parse } from "cookie";
import { useState } from "react";
import {
  createHeaderCookies,
  createNewTokens,
  getUserFromRequest,
  verifyToken,
} from "~/auth";
import { db } from "~/db";
import type { Route } from "../+types/root";
import { NavLink, Outlet, redirect, useParams } from "react-router";

export async function loader({ params, request }: Route.LoaderArgs) {
  const cookieHeader = request.headers.get("Cookie");
  const cookies = await parse(cookieHeader || "");
  const at = verifyToken(cookies["at"]);
  const rt = verifyToken(cookies["rt"]);

  if (at) {
    const user = await getUserFromRequest(request);
    if (user) {
      const existedUser = await db.userTable.findUniqueOrThrow({
        where: { email: user.email },
      });

      return existedUser ? existedUser : redirect("/login");
    }
  }

  if (rt) {
    const { accessToken, refreshToken } = await createNewTokens(
      rt?.userId as string
    );
    const headers = createHeaderCookies(accessToken, refreshToken);
    return new Response(null, {
      status: 200,
      headers,
    });
  }

  return redirect("/login");
}

export default function Index() {
  const params = useParams();
  const [isOpen, setIsOpen] = useState(false);

  console.log(params);
  return (
    <div className="bg-slate-50 flex flex-col text-black min-h-screen">
      <header className="flex items-center justify-between gap-8 border-b p-2 bg-lime-100">
        <h1 className="text-2xl md:inline hidden">OLIO</h1>
        <button
          className="text-2xl inline md:hidden"
          onClick={() => setIsOpen(!isOpen)}
        >
          Mobile
        </button>
        <NavLink
          className="rounded-md bg-lime-700 text-white hover:bg-lime-800 p-2"
          to={`/logout`}
        >
          Odjavi se
        </NavLink>
      </header>
      {isOpen && (
        <div className="flex flex-col gap-2 md:hidden bg-lime-100">
          <NavLink
            className={({ isActive }) =>
              ` uppercase p-4 ${isActive ? "bg-lime-700" : ""}`
            }
            to={`${params?.userId}/dashboard`}
          >
            dashboard
          </NavLink>
          <NavLink
            className={({ isActive }) =>
              `uppercase p-4 ${isActive ? "bg-lime-700" : ""}`
            }
            to={`${params?.userId}/orchards`}
          >
            orchards
          </NavLink>
          <NavLink
            className={({ isActive }) =>
              `uppercase p-4 ${isActive ? "bg-lime-700" : ""}`
            }
            to={`${params?.userId}/harvests`}
          >
            harvests
          </NavLink>
        </div>
      )}
      <div className="flex flex-grow">
        <aside className="hidden md:flex flex-col gap-2 bg-lime-100">
          <NavLink
            className={({ isActive }) =>
              ` uppercase p-4 ${isActive ? "bg-lime-700" : ""}`
            }
            to={`${params?.userId}/dashboard`}
          >
            dashboard
          </NavLink>
          <NavLink
            className={({ isActive }) =>
              `uppercase p-4 ${isActive ? "bg-lime-700" : ""}`
            }
            to={`${params?.userId}/orchards`}
          >
            orchards
          </NavLink>
          <NavLink
            className={({ isActive }) =>
              `uppercase p-4 ${isActive ? "bg-lime-700" : ""}`
            }
            to={`${params?.userId}/harvests`}
          >
            harvests
          </NavLink>
        </aside>
        <main className="flex flex-col justify-center items-center w-full">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
