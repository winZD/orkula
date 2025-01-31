import { useNavigate } from "react-router";
import type { Route } from "../+types/root";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "New React Router App" },
    { name: "description", content: "Welcome to React Router!" },
  ];
}

export default function Index() {
  const navigate = useNavigate();
  return (
    <div className="bg-lime-50 min-h-screen">
      <header className="flex items-center justify-between gap-8 border-b p-2 ">
        <h1 className="text-2xl">Orkula</h1>
        <button
          className="rounded-md bg-lime-700 text-white hover:bg-lime-800 p-2"
          onClick={() => navigate("login")}
        >
          Prijavi se
        </button>
      </header>
      <main className="flex flex-col justify-center items-center">
        <div className="text-5xl">Dobrodošli u Orkulu</div>
      </main>
    </div>
  );
}
