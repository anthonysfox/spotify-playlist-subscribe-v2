import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { getServerSession } from "next-auth/next";
import { redirect } from "next/navigation";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Spotify Playlist Subscribe - Profile",
};

export default async function Profile() {
  const session = await getServerSession(authOptions);

  if (!session || !session.user) {
    redirect("/");
  }
  return (
    <div className="flex h-screen">
      <div className="w-screen h-screen flex flex-col justify-center items-center">
        <h1>Whats up {session.user.name}</h1>
      </div>
    </div>
  );
}
