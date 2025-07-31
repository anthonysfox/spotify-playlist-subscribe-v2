import { PrismaClient } from "@prisma/client";

import { currentUser } from "@clerk/nextjs/server";
import Dashboard from "./components/Dashboard";
import { HomePage } from "./components/HomePage";

export default async function Home() {
  const user = await currentUser();

  return (
    <div className="grow flex flex-col p-4 h-full w-full">
      {user ? (
        <Dashboard userData={JSON.parse(JSON.stringify(user))} />
      ) : (
        <HomePage />
      )}
    </div>
  );
}
