"use client";
import { signIn } from "next-auth/react";

export default async function SignIn() {
  return (
    <>
      <div className="flex flex-col items-center justify-center w-screen h-screen gap-20">
        <button onClick={() => signIn("spotify")}>Sign in with Google</button>
        <h1>hi</h1>
      </div>
    </>
  );
}
