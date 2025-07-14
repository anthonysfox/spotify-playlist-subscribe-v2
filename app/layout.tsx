// These styles apply to every route in the application
import "@/styles/globals.css";
import { Inter } from "next/font/google";
import { Toaster } from "react-hot-toast";
import NavBar from "@/app/components/NavBar";
import { Suspense } from "react";

import { ClerkProvider } from "@clerk/nextjs";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ClerkProvider>
      <html lang="en">
        <body
          className={`${inter.variable} flex flex-col h-screen bg-gray-100 text-gray-800`}
        >
          <NavBar />
          <main className="grow flex flex-col overflow-hidden p-4">
            <div className="max-w-6xl mx-auto w-full flex flex-col h-full">
              {children}
            </div>
          </main>
        </body>
      </html>
    </ClerkProvider>
  );
}
