import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

/**
 * API routes self-enforce auth via requireUserId() (lib/apiAuth.ts), which
 * returns a clean 401 JSON body. Running auth.protect() here too would
 * preempt that: Clerk's protect() returns its own generic 404 HTML for
 * unauthenticated "non-document" requests (its bot-obscurity heuristic for
 * fetch-style requests), masking our API's actual error contract before the
 * route handler ever runs. So middleware only gates page routes — API auth
 * is the handlers' job.
 */
const isPublicPageRoute = createRouteMatcher(["/sign-in(.*)", "/sign-up(.*)"]);
const isApiRoute = createRouteMatcher(["/api(.*)"]);

export default clerkMiddleware(async (auth, req) => {
  if (!isApiRoute(req) && !isPublicPageRoute(req)) {
    await auth.protect();
  }
});

export const config = {
  matcher: ["/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)", "/(api|trpc)(.*)"],
};
