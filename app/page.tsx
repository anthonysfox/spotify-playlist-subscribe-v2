import { currentUser } from "@clerk/nextjs/server";
import Dashboard from "./components/Dashboard";
import { HomePage } from "./components/HomePage";
import { AppFrame } from "./components/Navigation/AppFrame";

/**
 * Server Component: auth branch point.
 *
 * Signed-out visitors get the marketing landing, which flows like a normal
 * website. Signed-in users get the Discover screen inside the app shell
 * (AppFrame resolves auth again — cheap, Clerk memoizes it per request — and
 * pre-fetches the rail's data).
 */
export default async function Home() {
  const user = await currentUser();

  if (!user) {
    return <HomePage />;
  }

  return (
    <AppFrame>
      <Dashboard />
    </AppFrame>
  );
}
