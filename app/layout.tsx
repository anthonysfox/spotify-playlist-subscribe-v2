// These styles apply to every route in the application
import "@/styles/globals.css";
import { Inter } from "next/font/google";
import { Toaster } from "react-hot-toast";
import NavBar from "@/components/NavBar";
import { Suspense } from "react";

import SessionProvider from "../components/SessionProvider";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);

  return (
    <html lang="en">
      <body className={inter.variable}>
        <Toaster />
        <Suspense fallback="Loading..."></Suspense>
        <SessionProvider>
          <NavBar />
          {children}
        </SessionProvider>
      </body>
    </html>
  );
}
