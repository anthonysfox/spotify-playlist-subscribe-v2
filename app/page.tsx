"use client";

import { useUser } from "@clerk/nextjs";
import Dashboard from "./components/Dashboard";
import { HomePage } from "./components/HomePage";

export default function Home() {
  const { isLoaded, isSignedIn, user } = useUser();

  // Show loading or nothing while Clerk is loading
  if (!isLoaded) {
    return (
      <div className="grow flex flex-col p-4 h-full w-full">
        <div className="flex items-center justify-center h-full">
          <div className="w-8 h-8 border-2 border-[#CC5500] border-t-transparent rounded-full animate-spin"></div>
        </div>
      </div>
    );
  }

  if (isSignedIn && user) {
    return (
      <div className="grow flex flex-col p-4 h-full w-full">
        <Dashboard userData={user} />
      </div>
    );
  }

  // Signed-out landing flows as a normal, full-bleed page (the layout doesn't
  // wrap it in the fixed app shell).
  return <HomePage />;
}