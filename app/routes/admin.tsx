import { parse } from "cookie";
import { useState } from "react";
import { getUserFromRequest } from "~/auth";
import { db } from "~/db";
import type { Route } from "../+types/root";
import { NavLink, Outlet, redirect, useParams } from "react-router";

export async function loader({ params, request }: Route.LoaderArgs) {
  const cookieHeader = request.headers.get("Cookie");
  const cookies = await parse(cookieHeader || "");
  /*   console.log(cookies); */

  // Fetch the user from the request
  const user = await getUserFromRequest(request);

  // Check if the user exists in the database
  if (user) {
    const existedUser = await db.userTable.findUniqueOrThrow({
      where: { email: user.email },
    });
    /*   if (existedUser) {
      return data({
        headers: {
          "Set-Cookie": `at=${cookies["at"]}; rt=${cookies["rt"]}`,
        },
      });
    }
  }*/
    if (existedUser) {
      return { existedUser };
    }
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
