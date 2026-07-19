import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

// Check if Upstash Redis credentials are provided
const hasRedisCredentials = !!process.env.UPSTASH_REDIS_REST_URL && !!process.env.UPSTASH_REDIS_REST_TOKEN;

// Initialize Redis only if credentials exist, allowing the app to run without rate limiting if not configured
const redis = hasRedisCredentials ? new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
}) : null;

// Create a rate limiter: e.g. 30 requests per 1 minute
const ratelimit = redis ? new Ratelimit({
  redis: redis,
  limiter: Ratelimit.slidingWindow(50, "1 m"),
  analytics: true,
}) : null;

// Define which routes to rate-limit
const isApiRoute = createRouteMatcher(["/api(.*)"]);

export default clerkMiddleware(async (auth, req) => {
  // 1. Rate Limiting Logic (Applied to API routes)
  if (isApiRoute(req) && ratelimit) {
    // Get the user ID from Clerk, or fallback to the IP address
    const authObj = await auth();
    const userId = authObj?.userId;
    const ip = req.ip || req.headers.get("x-forwarded-for") || "127.0.0.1";

    // Identifier is either the user ID or the IP address
    const identifier = userId || ip;

    const { success, limit, reset, remaining } = await ratelimit.limit(
      `ratelimit_${identifier}`
    );

    // If rate limit is exceeded, return 429 Too Many Requests
    if (!success) {
      return NextResponse.json(
        { error: "Too many requests. Please try again later." },
        {
          status: 429,
          headers: {
            "X-RateLimit-Limit": limit.toString(),
            "X-RateLimit-Remaining": remaining.toString(),
            "X-RateLimit-Reset": reset.toString(),
          },
        }
      );
    }
  }

  // 2. Further Clerk route protection can go here if needed.
  // Example: if (isProtectedRoute(req)) await auth.protect();

  return NextResponse.next();
});

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
    // Always run for Clerk-specific frontend API routes
    '/__clerk/(.*)',
  ],
};