import Image from "next/image";
import Link from "next/link";
import { PrismaClient } from "@prisma/client";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { getServerSession } from "next-auth/next";
import { Metadata } from "next";

const prisma = new PrismaClient();

export const metadata: Metadata = {
  title: "Spotify Playlist Subscribe",
};

export default async function Home() {
  const session = await getServerSession(authOptions);

  return (
    <div className="flex h-screen">
      <div className="w-screen h-screen flex flex-col justify-center items-center">
        <h1>Welcome to the Spotify Playlist Subscribe App</h1>
      </div>
    </div>
  );
}
