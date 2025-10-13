import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

// Define public routes (accessible without auth)
const isPublicRoute = createRouteMatcher([
  "/", // Timer page is public
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/download", // Download page is public
  "/changelog", // Changelog is public
  "/profile/(.*)", // Public profiles are accessible without auth
]);

export default clerkMiddleware(async (auth, req) => {
  // Protect only non-public routes
  if (!isPublicRoute(req)) {
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
