import { auth } from "@clerk/nextjs/server";
import Dashboard from "./components/Dashboard";
import { HomePage } from "./components/HomePage";
import { AppFrame } from "./components/Navigation/AppFrame";

/**
 * Server Component: auth branch point.
 *
 * Only needs "is anyone signed in" here — `auth()` is a session-cookie check,
 * no Clerk Backend API call. `AppFrame` does the one `currentUser()` fetch when
 * it needs the full user object.
 */
export default async function Home() {
  const { userId } = await auth();

  if (!userId) {
    return <HomePage />;
  }

  return (
    <AppFrame>
      <Dashboard />
    </AppFrame>
  );
}
