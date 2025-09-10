import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

// Define routes that should be protected
const isProtectedRoute = createRouteMatcher([
  "/api/spotify(.*)",
  "/api/users(.*)",
  "/profile(.*)",
  "/dashboard(.*)"
]);

// Define public API routes that don't need auth
const isPublicApiRoute = createRouteMatcher([
  "/api/webhooks(.*)",
  "/api/cron(.*)"
]);

export default clerkMiddleware(async (auth, req) => {
  // Don't protect public API routes
  if (isPublicApiRoute(req)) {
    return;
  }
  
  // Protect other routes that need authentication
  if (isProtectedRoute(req)) {
    await auth.protect();
  }
});

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for API routes
    "/(api|trpc)(.*)",
  ],
};
