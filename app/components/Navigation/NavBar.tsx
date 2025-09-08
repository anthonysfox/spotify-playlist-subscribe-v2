"use client";
import { Fragment, useState } from "react";
import { useUser } from "@clerk/nextjs";
import { SignInButton, SignedIn, SignedOut, UserButton } from "@clerk/nextjs";
import Link from "next/link";
import { Disc } from "lucide-react";
import Image from "next/image";

function classNames(...classes: String[]) {
  return classes.filter(Boolean).join(" ");
}

export default function Navbar() {
  const { isLoaded, isSignedIn, user } = useUser();

  return (
    <>
      <header className="p-4 bg-white shadow-xs">
        <div className="flex w-full h-16 items-center justify-between">
          <div className="flex flex-1 items-center justify-center sm:items-stretch sm:justify-start">
            <Link href={"/"} className="flex items-center">
              <Image
                src="/logo.png"
                alt="PlaylistFox"
                width={40}
                height={40}
                className="rounded-lg shadow-sm"
              />
              <h1 className="text-2xl font-bold text-gray-800 ml-3">
                PlaylistFox
              </h1>
            </Link>
          </div>
          <div className="flex items-center pr-2 sm:static sm:inset-auto sm:ml-6 sm:pr-0">
            <SignedOut>
              <SignInButton />
            </SignedOut>
            <SignedIn>
              <UserButton />
            </SignedIn>
          </div>
        </div>
      </header>
    </>
  );
}
