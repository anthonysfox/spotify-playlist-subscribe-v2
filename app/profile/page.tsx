import { redirect } from "next/navigation";
import { Metadata } from "next";
import { useUser } from "@clerk/clerk-react";

export const metadata: Metadata = {
  title: "Spotify Playlist Subscribe - Profile",
};

export default async function Profile() {
  return (
    <div className="flex h-screen">
      <div className="w-screen h-screen flex flex-col justify-center items-center">
        <h1>Whats up</h1>
      </div>
    </div>
  );
}
